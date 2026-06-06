import { getAccessToken } from '../googleApi';
import { createItem, fetchCollection } from '../api';

export async function runGmailSync(silent = false): Promise<number> {
  const token = await getAccessToken();
  if (!token) {
    if (!silent) throw new Error("Not authenticated for Gmail");
    return 0; // Fail silently in background if no token
  }
  
  const query = `from:googlepay-noreply@google.com OR subject:"paid" OR subject:"payment to"`;
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error("Failed to fetch from Gmail");
  const data = await res.json();
  if (!data.messages || data.messages.length === 0) return 0;

  const expenses = await fetchCollection('expenses').catch(() => []);
  let newCount = 0;

  for (const msg of data.messages) {
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const msgData = await msgRes.json();
    
    const snippet = msgData.snippet || ""; 
    const subjectHeader = msgData.payload?.headers?.find((h: any) => h.name === 'Subject');
    const subject = subjectHeader ? subjectHeader.value : '';
    const dateHeader = msgData.payload?.headers?.find((h: any) => h.name === 'Date');
    const dateStr = dateHeader ? dateHeader.value : new Date().toISOString();

    const amountMatch = snippet.match(/(?:(?:RS|Rs|INR|₹|\$|£|€)\.?\s?)(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g,'')) : null;

    let description = subject.replace(/You paid |Payment to |Receipt for order from |Transaction with /, '').trim();
    if (!description) description = "Google Pay Transaction";

    if (amount) {
       const dStr = new Date(dateStr).toISOString().split('T')[0];
       const exists = expenses.find((e: any) => e.date === dStr && Math.abs(Number(e.amount) - amount) < 0.1 && e.description.includes(description));
       
       if (!exists) {
          const fullDescription = "[GPay] " + description;
          let bestCategory = "OTHER";
          try {
            const catRes = await fetch('/api/gemini/categorize-expense', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description: fullDescription, amount })
            });
            if (catRes.ok) {
              const catData = await catRes.json();
              if (catData.category) bestCategory = catData.category;
            }
          } catch (e) {}

          await createItem('expenses', {
              amount: amount,
              category: bestCategory,
              date: dStr,
              description: fullDescription
          });
          newCount++;
       }
    }
  }
  return newCount;
}
