import React, { useState, useEffect, useRef } from "react";
import { PenLine, Save, Loader2, Mic, MicOff, Sparkles, Tag } from "lucide-react";
import { createItem, fetchCollection, apiFetch } from "../api";
import { useToast } from "../ToastContext";
import type { Note } from "../types";

export function QuickNotes() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [category, setCategory] = useState<'Work' | 'Study' | 'Personal'>('Personal');
  const recognitionRef = useRef<any>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const { showToast } = useToast();

  const CATEGORY_COLORS = {
    Work: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Study: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    Personal: "bg-amber-500/20 text-amber-300 border-amber-500/30"
  };

  const loadRecentNotes = async () => {
    try {
      const notes = await fetchCollection('notes');
      setRecentNotes(notes.slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRecentNotes();
  }, []);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setContent((prev) => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          showToast("Microphone access denied", "error");
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSpeechSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        showToast("Started listening...", "success");
      } catch (e) {
        console.error(e);
        showToast("Could not start microphone", "error");
      }
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
      
      let generatedTitle = "Quick Note";
      try {
        const { text } = await apiFetch('/api/gemini/auto-summary', {
           method: 'POST',
           body: JSON.stringify({ content: content.trim() })
        });
        if (text) generatedTitle = text;
      } catch (e) {
        console.error("Failed to generate summary", e);
      }

      await createItem("notes", {
        title: generatedTitle,
        content: content.trim(),
        category,
        createdAt: new Date().toISOString()
      });
      setContent("");
      showToast("Quick note saved!", "success");
      loadRecentNotes();
    } catch (e) {
      console.error(e);
      showToast("Failed to save note", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col h-full relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenLine className="w-5 h-5 text-purple-400" />
          <h3 className="text-xl font-semibold">Quick Notes</h3>
        </div>
        {isListening && (
           <span className="flex items-center gap-2 text-xs font-medium text-pink-400 bg-pink-500/10 px-2 py-1 rounded-full animate-pulse border border-pink-500/20">
             <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0"></span>
             Recording
           </span>
        )}
      </div>

      {recentNotes.length > 0 && (
        <div className="mb-4 space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
          {recentNotes.map((note) => (
              <div key={note.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
                      <Sparkles className="w-3 h-3" />
                      <span className="truncate">{note.title}</span>
                  </div>
                  {note.category && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md border whitespace-nowrap uppercase tracking-widest font-bold ${CATEGORY_COLORS[note.category]}`}>
                      {note.category}
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50 truncate">{note.content}</div>
             </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-4">
        {(['Personal', 'Work', 'Study'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              category === cat 
                ? CATEGORY_COLORS[cat] 
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Jot down a quick thought or use your voice..."
        className="w-full flex-1 bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-purple-400/50 resize-none text-sm text-white/90 placeholder-white/30 custom-scrollbar transition-colors mb-4"
      />
      
      <div className="flex justify-between items-center mt-auto">
        {isSpeechSupported ? (
          <button
            onClick={toggleListening}
            className={`p-2.5 rounded-lg transition-all border ${
              isListening 
                ? "bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30" 
                : "bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white"
            }`}
            title={isListening ? "Stop listening" : "Start speaking"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        ) : <div />}
        <button
          onClick={handleSave}
          disabled={!content.trim() || isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Note
        </button>
      </div>
    </div>
  );
}
