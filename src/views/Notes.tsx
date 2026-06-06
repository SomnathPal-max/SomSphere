import { useState, useEffect, useRef } from "react";
import { Sparkles, Plus, Loader2, Save, Trash2, Calendar, FileText, CheckCircle2, Tag as TagIcon, X, Mic, MicOff, NotebookPen } from "lucide-react";
import { fetchCollection, createItem, updateItem, deleteItem, apiFetch } from "../api";
import type { Note } from "../types";
import { format } from "date-fns";
import clsx from "clsx";
import { getAccessToken } from "../googleApi";
import { useToast } from "../ToastContext";
import { AutoSaveToast } from "../components/AutoSaveToast";

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  const triggerDraftSaved = () => {
    setShowDraftSaved(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      setShowDraftSaved(false);
    }, 2000);
  };

  const loadNotes = async () => {
    const data = await fetchCollection('notes');
    setNotes(data);
    if (!activeNote && data.length > 0) setActiveNote(data[0]);
  };
  useEffect(() => { loadNotes(); }, []);

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).sort();
  const filteredNotes = selectedTagFilter ? notes.filter(n => n.tags?.includes(selectedTagFilter)) : notes;

  const handleAdd = async () => {
    const newNote = await createItem('notes', { title: 'Untitled Note', content: '', createdAt: new Date().toISOString() });
    setNotes([newNote, ...notes]);
    setActiveNote(newNote);
    setAiSummary(null);
  };

  const handleSave = async () => {
    if (!activeNote) return;
    setSaving(true);
    await updateItem('notes', activeNote.id, activeNote);
    loadNotes();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!activeNote) return;
    await deleteItem('notes', activeNote.id);
    const updated = notes.filter(n => n.id !== activeNote.id);
    setNotes(updated);
    setActiveNote(updated[0] || null);
    setAiSummary(null);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim() && activeNote) {
      e.preventDefault();
      const tag = newTagInput.trim();
      if (!activeNote.tags?.includes(tag)) {
        setActiveNote({ ...activeNote, tags: [...(activeNote.tags || []), tag] });
        triggerDraftSaved();
      }
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (activeNote) {
      setActiveNote({ ...activeNote, tags: (activeNote.tags || []).filter(t => t !== tagToRemove) });
      triggerDraftSaved();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition is not supported in this browser.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
      // Browsers often stop recognition automatically after a while of silence
      setIsListening(false);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        const textToAdd = finalTranscript.trim() + " ";
        setActiveNote(prev => {
          if (!prev) return prev;
          const currentContent = prev.content || "";
          const newContent = currentContent + (currentContent && !currentContent.endsWith(' ') && !currentContent.endsWith('\n') ? ' ' : '') + textToAdd;
          return { ...prev, content: newContent };
        });
        triggerDraftSaved();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e: any) {
      showToast("Could not start microphone.", "error");
    }
  };

  const handleSummarize = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setSummarizing(true);
    try {
       const { text } = await apiFetch('/api/gemini/summarize', { method: 'POST', body: JSON.stringify({ content: activeNote.content }) });
       setAiSummary(text);
    } catch (e) {
      showToast("Error summarizing", "error");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      {/* List Panel */}
      <div className="w-80 glass-card flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">My Notes</h2>
            <button onClick={handleAdd} className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
               <button 
                  onClick={() => setSelectedTagFilter(null)}
                  className={clsx("px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors", selectedTagFilter === null ? "bg-white text-black" : "bg-white/5 text-white/50 hover:bg-white/10")}
               >
                 All
               </button>
               {allTags.map(t => (
                 <button 
                    key={t}
                    onClick={() => setSelectedTagFilter(t)}
                    className={clsx("px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors", selectedTagFilter === t ? "bg-white text-black" : "bg-white/5 text-white/50 hover:bg-white/10")}
                 >
                   {t}
                 </button>
               ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredNotes.map(note => (
            <button 
              key={note.id} 
              onClick={() => { setActiveNote(note); setAiSummary(null); setShowDraftSaved(false); }}
              className={clsx("w-full text-left p-4 rounded-xl transition-all border", 
                activeNote?.id === note.id ? "bg-white/10 border-white/20 shadow-md" : "bg-transparent border-transparent hover:bg-white/5"
              )}
            >
              <h4 className="font-medium truncate">{note.title || 'Untitled'}</h4>
              <p className="text-sm text-white/50 truncate mt-1">{note.content || 'No content'}</p>
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {note.tags.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-white/10 text-white/70">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-white/30 mt-3 flex items-center gap-1"><Calendar className="w-3 h-3"/> {note.createdAt ? format(new Date(note.createdAt), "MMM d, yyyy") : ''}</p>
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <div className="text-center py-12 px-4 flex flex-col items-center">
              <NotebookPen className="w-12 h-12 text-blue-400/40 mb-4" />
              <p className="text-white/80 font-bold mb-1">No notes found.</p>
              <p className="text-xs text-white/40 max-w-[200px]">Create a new note to start capturing your thoughts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {activeNote ? (
        <div className="flex-1 glass-card flex flex-col overflow-hidden relative">
          <div className="p-6 border-b border-white/5 flex flex-col gap-4 sm:flex-row sm:items-center justify-between bg-white/[0.02]">
            <input 
              value={activeNote.title} 
              onChange={e => {
                setActiveNote({...activeNote, title: e.target.value});
                triggerDraftSaved();
              }}
              className="bg-transparent text-2xl font-bold border-none outline-none focus:ring-0 placeholder-white/30 w-full"
              placeholder="Note Title"
            />
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button 
                onClick={toggleListening} 
                className={clsx(
                  "p-2 rounded-lg transition-colors flex items-center justify-center relative",
                  isListening ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-white/5 hover:bg-white/10 text-white/70"
                )}
                title="Transcribe Lecture via Microphone"
              >
                {isListening ? (
                  <>
                    <Mic className="w-5 h-5 animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                  </>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
              <button 
                onClick={handleSummarize} 
                disabled={summarizing || !activeNote.content.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {summarizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                Summarize
              </button>
              <button onClick={handleSave} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 transition-colors">
                <Save className="w-5 h-5"/>
              </button>
              <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 text-white/70 hover:text-red-400 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5"/>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col relative">
            <textarea
              value={activeNote.content}
              onChange={e => {
                setActiveNote({...activeNote, content: e.target.value});
                triggerDraftSaved();
              }}
              placeholder="Start writing your thoughts here..."
              className="w-full flex-1 bg-transparent border-none outline-none focus:ring-0 resize-none text-white/80 leading-relaxed custom-scrollbar placeholder-white/20 pb-6"
            />
            
            <div className="mt-4 pt-4 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <TagIcon className="w-4 h-4 text-white/40" />
                {activeNote.tags?.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-xs text-white/80">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add a tag..."
                  className="bg-transparent text-sm text-white/80 placeholder-white/40 outline-none w-32 border-none focus:ring-0 ml-1"
                />
              </div>
            </div>

            {aiSummary && (
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-[#4F378B]/40 to-pink-500/10 border border-purple-500/30 shrink-0 relative">
                <button onClick={() => setAiSummary(null)} className="absolute top-4 right-4 text-white/40 hover:text-white"><Trash2 className="w-4 h-4"/></button>
                <h4 className="flex items-center gap-2 font-semibold text-pink-300 mb-4"><Sparkles className="w-4 h-4"/> AI Summary</h4>
                <div className="prose prose-invert max-w-none text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {aiSummary}
                </div>
              </div>
            )}

            {/* Draft Saved Indicator */}
            <AutoSaveToast show={showDraftSaved} onHide={() => setShowDraftSaved(false)} />
          </div>
        </div>
      ) : (
        <div className="flex-1 glass-card flex items-center justify-center text-white/40">
          Select or create a note to begin.
        </div>
      )}
    </div>
  );
}
