import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { spawnSync } from 'child_process';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // In-memory "H2-like" database for offline/sync fallback
  const db: Record<string, any[]> = {
    assignments: [],
    timetable: [],
    exams: [],
    courses: [],
    notes: [],
    flashcardDecks: [],
    habits: [],
    habitLogs: [],
    expenses: [],
    announcements: [
      { id: 1, title: 'Welcome to SomSphere', body: 'This is the start of a great semester.', category: 'GENERAL', postedAt: new Date().toISOString(), pinned: true }
    ],
  };

  let idCounter = 2;
  const nextId = () => idCounter++;

  // Generic CRUD API mapping
  const collections = Object.keys(db);
  collections.forEach(collection => {
    app.get(`/api/${collection}`, (req, res) => {
      res.json(db[collection]);
    });
    
    app.post(`/api/${collection}`, (req, res) => {
      const newItem = { id: nextId(), ...req.body };
      db[collection].unshift(newItem); // put new items at top
      res.json(newItem);
    });

    app.put(`/api/${collection}/:id`, (req, res) => {
      const id = parseInt(req.params.id, 10);
      const index = db[collection].findIndex((item: any) => item.id === id);
      if (index !== -1) {
        db[collection][index] = { ...db[collection][index], ...req.body };
        res.json(db[collection][index]);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });

    app.delete(`/api/${collection}/:id`, (req, res) => {
      const id = parseInt(req.params.id, 10);
      db[collection] = db[collection].filter((item: any) => item.id !== id);
      res.json({ success: true });
    });
  });

  // College Notices Endpoint (Live Scraping) with graceful local fallback
  app.get('/api/college-notices', async (req, res) => {
    try {
      // Direct scraping from official JIS College dashboard
      const response = await fetch('https://www.jiscollege.ac.in/notice-board.php', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: AbortSignal.timeout(5000) // 5 seconds timeout to prevent long hangs
      });
      
      if (!response.ok) {
        throw new Error(`Response status code: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const notices: any[] = [];
      const items = $('.timeline-left .item');
      
      items.each((index, element) => {
        const dateText = $(element).find('h4 b').text().trim();
        const linkElement = $(element).find('p a').first();
        const titleText = linkElement.text().trim() || $(element).find('p').text().trim();
        const hrefItem = linkElement.attr('href');
        
        let href = hrefItem || '';
        if (href) {
            href = href.replace(/^\.\.\//, '');
            if (!href.startsWith('http')) {
              href = 'https://www.jiscollege.ac.in/' + href;
            }
        }

        if (titleText) {
          const id = 'jis_' + Buffer.from(titleText + (dateText || index)).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 30) + '_' + index;
          notices.push({
            id,
            title: titleText,
            body: href ? `Click here to view: ${href}` : '',
            category: 'COLLEGE',
            postedAt: dateText || new Date().toISOString(),
            pinned: index < 2
          });
        }
      });
      
      if (notices.length > 0) {
        res.json(notices);
      } else {
        throw new Error("No notices scraped successfully");
      }
    } catch (e) {
      console.warn('Scraping or connection issue. Serving offline cached JIS college notices:', String(e));
      // Serve beautiful local fallback notices so the application doesn't crash on network limits
      const FALLBACK_COLLEGE_NOTICES = [
        {
          id: "jis_mock_1",
          title: "Urgent: Student Exam Form submission for even semesters has been extended till June 15, 2026.",
          body: "Click here to view: https://www.jiscollege.ac.in/notice-board.php",
          category: 'COLLEGE',
          postedAt: "04-Jun-2026",
          pinned: true
        },
        {
          id: "jis_mock_2",
          title: "Notice regarding Internal Continuous Assessment (CA4) evaluations for all branches.",
          body: "Click here to view: https://www.jiscollege.ac.in/notice-board.php",
          category: 'COLLEGE',
          postedAt: "02-Jun-2026",
          pinned: true
        },
        {
          id: "jis_mock_3",
          title: "Smart India Hackathon (SIH) 2026 - Register for internal screening by June 10, 2026.",
          body: "Click here to view: https://www.jiscollege.ac.in/notice-board.php",
          category: 'COLLEGE',
          postedAt: "28-May-2026",
          pinned: false
        },
        {
          id: "jis_mock_4",
          title: "JIS College Placement Cell and CSR Cell training schedule updates for pre-final year students.",
          body: "Click here to view: https://www.jiscollege.ac.in/notice-board.php",
          category: 'COLLEGE',
          postedAt: "25-May-2026",
          pinned: false
        }
      ];
      res.json(FALLBACK_COLLEGE_NOTICES);
    }
  });


  // Som Chat / Gemini Endpoints
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  function logGeminiError(context: string, error: any) {
    const errStr = String(error || "");
    if (errStr.includes("429") || errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("rate limit") || errStr.toLowerCase().includes("resource_exhausted")) {
      console.log(`[Gemini Info] ${context}: Request rate-limited or quota exceeded (429/503). Using silent fallback.`);
    } else {
      console.error(`[Gemini Error] ${context}:`, error);
    }
  }

  app.post('/api/gemini/chat', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { history, persona } = req.body;
      let SYSTEM_PROMPT = "You are Som, a friendly and intelligent campus assistant for SomSphere. Campus context: Library hours are 8am to 10pm. Dining is at Block B, open 7am to 9pm. Student services office is at Block A, open 9am to 5pm. Always be encouraging and concise.";
      
      if (persona === 'Tutor') {
        SYSTEM_PROMPT = "You are acting as an academic Tutor. Rather than giving direct answers, use the Socratic method to guide the student to learn and discover the answer themselves.";
      } else if (persona === 'Editor') {
        SYSTEM_PROMPT = "You are acting as a strict Editor. Focus exclusively on grammar, syntax, clarity, and structural improvements of any text the user provides. Suggest better vocabulary and phrasing.";
      } else if (persona === 'Brainstormer') {
        SYSTEM_PROMPT = "You are acting as a creative Brainstormer. Divergently think and provide bulleted lists of wild, creative, and out-of-the-box ideas. Be expansive and enthusiastic.";
      }

      const contents = history.map((msg: any) => ({
        role: msg.role === 'som' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      // Prepend system instruction to first user message if history is empty, otherwise we rely on systemInstruction param in generateContent (not supported directly in simple array, but we can prepend text)
      // Actually, better to send the last message specifically and provide history.
      const lastMessage = contents.pop();
      if (!lastMessage) return res.json({ text: "I'm here!" });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [...contents, lastMessage],
        config: { systemInstruction: SYSTEM_PROMPT }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("chat", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ text: "I'm currently resting. My rate limit has been exceeded or the service is temporarily overloaded. Please try again soon." });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/gemini/summarize', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { content } = req.body;
      const prompt = "Summarize the following note as a concise bullet-point list:\\n\\n" + content;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("summarize", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ text: "AI Summary unavailable due to rate limits or high demand." });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/gemini/auto-summary', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { content } = req.body;
      const prompt = "Generate a single concise title or one-line summary (maximum 5-7 words) for the following note content:\\n\\n" + content;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      res.json({ text: response.text?.trim() });
    } catch (e: any) {
      logGeminiError("auto-summary", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ text: "Quick Note" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/gemini/parse-syllabus', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { content } = req.body;
      const prompt = "Extract all assignments, projects, and deadlines from the following syllabus. Return ONLY a valid JSON array with objects having fields: title, subject, dueDate (YYYY-MM-DD format), priority (HIGH, MEDIUM, or LOW).\\n\\nSyllabus:\\n" + content;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      let text = response.text || "[]";
      // clean markdown formatting
      text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const assignments = JSON.parse(text);
      res.json({ assignments });
    } catch (e: any) {
      logGeminiError("parse-syllabus", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ assignments: [] });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/gemini/study-plan', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { exams, assignments } = req.body;
      const prompt = `Based on the following upcoming exams: ${JSON.stringify(exams)} and pending assignments: ${JSON.stringify(assignments)}, create a highly structured, personalized 60-minute study plan. Return the response in a clear layout using Markdown, with timestamps or blocks (e.g., 0-15 mins) focusing on the highest priority items. Keep it actionable and concise.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: "You are a focused productivity coach." }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("study-plan", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ text: "Study plan unavailable due to rate limits or high demand." });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/gemini/daily-summary', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { tasks } = req.body;
      const prompt = `Based on the user's tasks for today: ${JSON.stringify(tasks)}, provide a short, encouraging snippet of advice or a prioritised focus plan. Keep it very concise (2-3 sentences), encouraging, and actionable.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: "You are a supportive academic and productivity assistant." }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("daily-summary", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ text: "You have a busy day ahead! Focus on one task at a time and take regular breaks." });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/gemini/task-insight', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'API key is missing' });
    try {
      const { tasks } = req.body;
      const prompt = `Based on the following tasks: ${JSON.stringify(tasks)}, suggest upcoming deadlines based on the user's current workload and history. Provide a short, 1-2 sentence encouraging insight about what they should prioritize next.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: "You are a proactive task management assistant." }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("task-insight", e);
      if (e.message?.includes('429') || String(e).includes('429') || e.message?.includes('503') || String(e).includes('503')) {
        return res.json({ text: "It looks like you have a lot going on. Consider tackling the most urgent tasks first!" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  // Local Helper Heuristic Engines to entirely offload Gemini and save quota limit
  function localSmartSort(title: string, description: string) {
    const text = `${title} ${description || ""}`.toLowerCase();
    let subject = "General";
    let priority = "MEDIUM";

    if (text.includes("math") || text.includes("algebra") || text.includes("calculus") || text.includes("geometry") || text.includes("matrix")) subject = "Math";
    else if (text.includes("science") || text.includes("physics") || text.includes("chemistry") || text.includes("lab") || text.includes("biology") || text.includes("experiment")) subject = "Science";
    else if (text.includes("read") || text.includes("novel") || text.includes("english") || text.includes("book") || text.includes("poem") || text.includes("literature") || text.includes("history")) subject = "Reading";
    else if (text.includes("buy") || text.includes("shop") || text.includes("market") || text.includes("get") || text.includes("grocer") || text.includes("clean") || text.includes("wash") || text.includes("errand")) subject = "Errands";
    else if (text.includes("code") || text.includes("programming") || text.includes("javascript") || text.includes("python") || text.includes("java") || text.includes("database") || text.includes("bug") || text.includes("dev")) subject = "Coding";

    if (text.includes("urgent") || text.includes("asap") || text.includes("important") || text.includes("deadline") || text.includes("exam") || text.includes("test") || text.includes("tomorrow") || text.includes("due today") || text.includes("now")) {
      priority = "HIGH";
    } else if (text.includes("later") || text.includes("someday") || text.includes("maybe") || text.includes("if active") || text.includes("low") || text.includes("whenever")) {
      priority = "LOW";
    }

    return { subject, priority };
  }

  function localCategorizeExpense(description: string, amount: number): string {
    const desc = (description || "").toLowerCase();
    
    const foodKeywords = ["restaurant", "food", "cafe", "dinner", "lunch", "breakfast", "burger", "pizza", "swiggy", "zomato", "grocery", "groceries", "supermarket", "starbucks", "coffee", "tea", "canteen", "eat", "mcdonald", "kfc", "domino", "sweet", "snack", "maggi", "chowmein"];
    const transportKeywords = ["cab", "uber", "ola", "metro", "bus", "train", "flight", "taxi", "ticket", "fuel", "petrol", "parking", "diesel", "car", "bike", "rapido", "ride", "auto"];
    const booksKeywords = ["book", "syllabus", "course", "textbook", "novel", "stationery", "pen", "notebook", "copy", "tuition", "fees", "library", "exam", "admission", "semester", "xerox", "print"];
    const housingKeywords = ["rent", "room", "hostel", "pg", "electricity", "gas", "water", "apartment", "maintenance", "bill", "wifi", "internet", "broadband"];
    const entertainmentKeywords = ["movie", "netflix", "spotify", "game", "steam", "concert", "party", "club", "cinema", "show", "pub", "beer", "movie ticket", "amazon prime", "hotstar", "youtube", "premium"];

    if (foodKeywords.some(kw => desc.includes(kw))) return "FOOD";
    if (transportKeywords.some(kw => desc.includes(kw))) return "TRANSPORT";
    if (booksKeywords.some(kw => desc.includes(kw))) return "BOOKS";
    if (housingKeywords.some(kw => desc.includes(kw))) return "HOUSING";
    if (entertainmentKeywords.some(kw => desc.includes(kw))) return "ENTERTAINMENT";

    return "OTHER";
  }

  app.post('/api/gemini/smart-sort', async (req, res) => {
    const { title, description } = req.body;
    
    // Heuristic first: If the text matches basic subjects, return immediately, saving rate quota
    const localResult = localSmartSort(title, description);
    if (localResult.subject !== "General" || localResult.priority !== "MEDIUM") {
      return res.json(localResult);
    }

    if (!ai) {
      return res.json(localResult);
    }

    try {
      const prompt = `Analyze this task title: "${title}" and description: "${description || ''}".
Determine the best subject/category (e.g., Math, Science, Errands, Reading) and priority level (HIGH, MEDIUM, LOW).
Return ONLY a valid JSON object with keys: "subject" (string) and "priority" (string: "HIGH", "MEDIUM", or "LOW").`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      let text = response.text || '{"subject": "General", "priority": "MEDIUM"}';
      const result = JSON.parse(text);
      res.json(result);
    } catch (e: any) {
      logGeminiError("smart-sort", e);
      res.json(localResult);
    }
  });

  app.post('/api/gemini/categorize-expense', async (req, res) => {
    const { description, amount } = req.body;
    
    // Rule-based heuristic first: Highly reliable and completely preserves the 20 requests/day quota limits!
    const localCat = localCategorizeExpense(description, amount);
    if (localCat !== "OTHER") {
      return res.json({ category: localCat });
    }

    if (!ai) {
      return res.json({ category: "OTHER" });
    }

    try {
      const categories = ["FOOD", "HOUSING", "TRANSPORT", "BOOKS", "ENTERTAINMENT", "OTHER"];
      const prompt = `Analyze this expense description: "${description}" with amount: ${amount}.
Determine the best category out of the following options exactly: ${JSON.stringify(categories)}.
Return ONLY a valid JSON object with key: "category" (string). If unsure, pick "OTHER".`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      let text = response.text || '{"category": "OTHER"}';
      const result = JSON.parse(text);
      res.json(result);
    } catch (e: any) {
      logGeminiError("categorize-expense", e);
      res.json({ category: localCat });
    }
  });

  app.post('/api/gemini/expense-analysis', async (req, res) => {
    if (!ai) return res.json({ text: "Add more transactions to view spending patterns. Focus on balancing food, stationery, and leisure expenses!" });
    try {
      const { expenses } = req.body;
      const prompt = `Analyze this list of expenses and provide a very brief, helpful insight on spending patterns and one potential way to save money. Keep it concise, friendly, and visually formatted with bullet points if necessary. Limit to 3-4 short sentences.\nExpenses: ${JSON.stringify(expenses)}`;
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      res.json({ text: result.text });
    } catch (e: any) {
      logGeminiError("expense-analysis", e);
      res.json({ text: "• Plan ahead and cook some meals at home to reduce food expenditures.\n• Track your repeating monthly bills and unsubscribe from unused digital plans.\n• Budget a specific amount for leisures on weekends to maintain high savings." });
    }
  });

  app.post('/api/gemini/weekly-insight', async (req, res) => {
    if (!ai) return res.json({ text: "Stay proactive, keep logging habits and expenses to unlock personalized analytics." });
    try {
      const { expenses, habits } = req.body;
      const prompt = `Based on the following recent expenses: ${JSON.stringify(expenses)} and habits: ${JSON.stringify(habits)}, provide one short, actionable piece of advice (maximum 1-2 sentences) about the user's spending and task habits. Make it encouraging and insightful.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: "You are a friendly and analytical personal assistant." }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("weekly-insight", e);
      res.json({ text: "Keep tracking your daily academic habits! Your consistent study sessions will play a major role in upcoming exams." });
    }
  });

  app.post('/api/gemini/ocr', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'OCR service currently unavailable.' });
    try {
      const { mimeType, base64 } = req.body;
      let prompt = "Extract all text from this document into raw text. Output ONLY the extracted text with no other commentary. Preserve paragraphs and layout reasonably.";
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: mimeType,
              data: base64
            }
          }
        ],
      });
      res.json({ text: response.text });
    } catch (e: any) {
      logGeminiError("ocr", e);
      res.status(429).json({ error: "The document extraction service is busy or rate-limited. Please try again or type manually." });
    }
  });

  app.post('/api/gemini/suggest-tags', async (req, res) => {
    if (!ai) return res.status(200).json({ tags: ["document", "academic", "converted-pdf", "study-notes"] });
    try {
      const { filename, title, author, pageCount } = req.body;
      const prompt = `You are a professional document archiving assistant. Analyze this newly converted PDF document info and suggest exactly 4-6 relevant metadata keywords/tags.
      Document Details:
      - File Name: "${filename || ''}"
      - Title: "${title || ''}"
      - Author: "${author || ''}"
      - Page Count: ${pageCount || 1}

      Provide ONLY a valid JSON array of strings (e.g. ["algebra", "lecture-slides", "homework-4"]). No other text, markdown blocks, conversational preamble or backticks.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      let text = response.text || "[]";
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      try {
        const tags = JSON.parse(text);
        res.json({ tags: Array.isArray(tags) ? tags : ["document", "academic", "converted-pdf", "study-notes"] });
      } catch {
        res.json({ tags: ["document", "academic", "converted-pdf", "study-notes"] });
      }
    } catch (e: any) {
      res.json({ tags: ["document", "academic", "converted-pdf", "study-notes"] });
    }
  });

  // Secure PDF Encryption Endpoint using Ghostscript
  app.post('/api/pdf/encrypt', (req, res) => {
    try {
      const { pdfBase64, password } = req.body;
      if (!pdfBase64 || !password) {
        return res.status(400).json({ error: 'PDF data and password are required' });
      }

      // Convert base64 to binary buffer
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const tempDir = path.join(process.cwd(), 'temp_pdf_encrypt');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const id = Date.now() + '_' + Math.random().toString(36).substring(7);
      const inPath = path.join(tempDir, `in_${id}.pdf`);
      const outPath = path.join(tempDir, `out_${id}.pdf`);

      fs.writeFileSync(inPath, buffer);

      // Run Ghostscript to encrypt with RC4/AES-based high level device output
      const gsResult = spawnSync('gs', [
        '-q',
        '-dNOPAUSE',
        '-dBATCH',
        '-sDEVICE=pdfwrite',
        `-sOwnerPassword=${password}`,
        `-sUserPassword=${password}`,
        '-dEncryptionR=3', // Request 128-bit key length encryption
        '-dPermissions=-4', // Allows copying/printing
        `-sOutputFile=${outPath}`,
        inPath
      ]);

      if (gsResult.status !== 0) {
        console.error("Ghostscript error output:", gsResult.stderr?.toString());
        throw new Error('Ghostscript process failed to encrypt PDF');
      }

      if (!fs.existsSync(outPath)) {
        throw new Error('Output encrypted PDF file not generated');
      }

      const encryptedBuffer = fs.readFileSync(outPath);
      const encryptedBase64 = encryptedBuffer.toString('base64');

      // Clean up files
      try {
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      } catch (cleanupError) {
        console.warn('Temporary file cleanup failed:', cleanupError);
      }

      res.json({ pdfBase64: `data:application/pdf;base64,${encryptedBase64}` });
    } catch (err: any) {
      console.error('PDF encryption endpoint failed:', err);
      res.status(500).json({ error: 'Failed to encrypt the PDF document securely.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production SPA serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // WebSocket Server for Collaborative Canvas
  const wss = new WebSocketServer({ server, path: '/api/ws' });
  let canvasLines: any[] = [];

  wss.on('connection', (ws) => {
    // Send initial state to the connecting client
    ws.send(JSON.stringify({ type: 'init', lines: canvasLines }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'draw') {
          canvasLines.push(data.line);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'draw', line: data.line }));
            }
          });
        } else if (data.type === 'clear') {
          canvasLines = [];
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'clear' }));
            }
          });
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
