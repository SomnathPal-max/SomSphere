import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCw, Plus, ArrowRight, ArrowLeft, Brain, Sparkles, Loader2, Volume2, CloudRain, Wind, Coffee, Waves } from "lucide-react";
import clsx from "clsx";
import Markdown from "react-markdown";
import { fetchCollection, createItem } from "../api";
import type { FlashcardDeck, Assignment, TimetableSlot as Exam } from "../types"; // Reusing TimetableSlot type for exams if needed
import { useTimer } from "../TimerContext";

function AmbientNoisePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSound, setActiveSound] = useState<string>('rain');
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement>(null);

  const sounds = [
    { id: 'rain', label: 'Rain', icon: <CloudRain className="w-4 h-4" />, url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_821a71efdd.mp3?filename=rain-104523.mp3' },
    { id: 'waves', label: 'Waves', icon: <Waves className="w-4 h-4" />, url: 'https://cdn.pixabay.com/download/audio/2022/11/04/audio_349942d992.mp3?filename=ocean-waves-112906.mp3' },
    { id: 'cafe', label: 'Cafe', icon: <Coffee className="w-4 h-4" />, url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=coffee-shop-ambience-96251.mp3' },
    { id: 'wind', label: 'Wind', icon: <Wind className="w-4 h-4" />, url: 'https://cdn.pixabay.com/download/audio/2022/12/30/audio_f558dc93d6.mp3?filename=windy-forest-129990.mp3' },
  ];

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeSound]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const sound = sounds.find(s => s.id === activeSound);

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 px-4 shrink-0 shadow-lg">
      <audio ref={audioRef} src={sound?.url} loop />
      <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
        {sounds.map(s => (
          <button
            key={s.id}
            onClick={() => {
              setActiveSound(s.id);
              if (!isPlaying) setIsPlaying(true);
            }}
            className={clsx("p-1.5 rounded-lg transition-colors", activeSound === s.id ? "bg-pink-500/20 text-pink-300" : "text-white/40 hover:text-white/80")}
            title={s.label}
          >
            {s.icon}
          </button>
        ))}
      </div>
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="p-1.5 text-white/80 hover:text-white transition-colors"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
      </button>
      <div className="flex items-center gap-2 pl-1">
        <Volume2 className="w-4 h-4 text-white/50" />
        <input 
          type="range" 
          min="0" max="1" step="0.05" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 accent-pink-500"
        />
      </div>
    </div>
  );
}

export function StudyTools() {
  const [activeTab, setActiveTab] = useState<'POMODORO' | 'FLASHCARDS' | 'DEEP_FOCUS'>('POMODORO');

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Study Tools</h2>
          <AmbientNoisePlayer />
        </div>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button onClick={() => setActiveTab('POMODORO')} className={clsx("px-4 py-2 rounded-md transition-colors text-sm font-medium", activeTab === 'POMODORO' ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white")}>Pomodoro</button>
          <button onClick={() => setActiveTab('FLASHCARDS')} className={clsx("px-4 py-2 rounded-md transition-colors text-sm font-medium", activeTab === 'FLASHCARDS' ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white")}>Flashcards</button>
          <button onClick={() => setActiveTab('DEEP_FOCUS')} className={clsx("px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2", activeTab === 'DEEP_FOCUS' ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white")}>
            <Brain className="w-4 h-4" /> Deep Focus
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'POMODORO' && <PomodoroTimer />}
        {activeTab === 'FLASHCARDS' && <FlashcardsManager />}
        {activeTab === 'DEEP_FOCUS' && <DeepFocusMode />}
      </div>
    </div>
  );
}

function DeepFocusMode() {
  const [loading, setLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const [exams, assignments] = await Promise.all([
        fetchCollection('exams').catch(() => []),
        fetchCollection('assignments').catch(() => [])
      ]);
      
      const res = await fetch('/api/gemini/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams, assignments })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate study plan');
      setStudyPlan(data.text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Make sure your Gemini API key is configured.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={clsx("glass-card h-full flex flex-col p-8 relative overflow-hidden transition-all duration-500", loading ? "animate-focus-pulse" : "animate-focus-pulse")}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5 pointer-events-none"/>
      
      <div className="flex items-center justify-between mb-8 z-10 shrink-0">
        <div>
          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">Deep Focus Hub</h3>
          <p className="text-gray-400 mt-1">Let AI craft your perfect 60-minute session based on your deadlines.</p>
        </div>
        <button 
          onClick={generatePlan}
          disabled={loading}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all shadow-lg flex items-center gap-2 font-medium disabled:opacity-50 text-white"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
          Generate 60-Min Plan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar z-10 pr-2">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}
        
        {!studyPlan && !error && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <Brain className="w-16 h-16 mb-4 text-indigo-400" />
            <h4 className="text-lg font-medium text-white mb-2">Ready for a Deep Work Session?</h4>
            <p className="max-w-md text-sm">Click the generate button above to create a highly optimized, personalized study plan tailored to your upcoming exams and assignments.</p>
          </div>
        )}

        {studyPlan && (
          <div className="markdown-body p-6 bg-black/20 rounded-2xl border border-white/5 text-gray-200">
            <Markdown>{studyPlan}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

function PomodoroTimer() {
  const { timeLeft, isActive, mode, sessionCount, toggleTimer, resetTimer } = useTimer();
  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  
  const total = mode === 'WORK' ? WORK_TIME : BREAK_TIME;
  const percentage = ((total - timeLeft) / total) * 100;
  
  // Circle rendering
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="glass-card h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none"/>
      <div className="text-center z-10 relative">
        <h3 className="text-xl font-medium text-white/50 mb-8 uppercase tracking-widest">{mode === 'WORK' ? 'Focus Session' : 'Take a Break'}</h3>
        
        <div className="relative w-80 h-80 mx-auto flex items-center justify-center">
          <svg className="absolute inset-0 w-80 h-80 -rotate-90 transform">
            <circle cx="160" cy="160" r={radius} className="stroke-white/10 fill-none" strokeWidth="8" />
            <circle 
              cx="160" cy="160" r={radius} 
              className={clsx("fill-none transition-all duration-1000 ease-linear", mode === 'WORK' ? "stroke-pink-500" : "stroke-emerald-500")} 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="text-7xl font-bold font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {minutes}:{seconds}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-12">
          {/* <button onClick={resetTimer} className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors"><RotateCw className="w-6 h-6"/></button> */}
          <button onClick={toggleTimer} className="p-6 rounded-full bg-white text-[#0D0D14] hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <button onClick={resetTimer} className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors"><RotateCw className="w-6 h-6"/></button>
        </div>
        
        <p className="mt-8 text-white/40 font-medium">Session {sessionCount}</p>
      </div>
    </div>
  );
}

function FlashcardsManager() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetchCollection('flashcardDecks').then(data => {
      setDecks(data);
      if (data.length > 0) setActiveDeck(data[0]);
    });
  }, []);

  const handleCreateDeck = () => {
    const title = prompt("Deck name:");
    if (!title) return;
    createItem('flashcardDecks', { title, cards: [{term: "New Term", definition: "New Definition"}] }).then(d => {
      setDecks([d, ...decks]);
      setActiveDeck(d);
    });
  };

  const nextCard = () => {
    setIsFlipped(false);
    if (activeDeck && currentIdx < activeDeck.cards.length - 1) setCurrentIdx(c => c + 1);
  };
  const prevCard = () => {
    setIsFlipped(false);
    if (currentIdx > 0) setCurrentIdx(c => c - 1);
  };

  return (
    <div className="h-full flex gap-6">
      <div className="w-64 glass-card p-4 shrink-0 flex flex-col">
        <button onClick={handleCreateDeck} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl flex items-center justify-center gap-2 mb-4 text-white/70 transition-colors">
          <Plus className="w-4 h-4"/> New Deck
        </button>
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {decks.map(deck => (
            <button 
              key={deck.id} 
              onClick={() => { setActiveDeck(deck); setCurrentIdx(0); setIsFlipped(false); }}
              className={clsx("w-full text-left p-3 rounded-lg transition-all", activeDeck?.id === deck.id ? "bg-white/10 border border-white/20" : "hover:bg-white/5")}
            >
              <h4 className="font-medium truncate">{deck.title}</h4>
              <p className="text-xs text-white/40 mt-1">{deck.cards.length} cards</p>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 glass-card p-8 flex flex-col items-center justify-center relative perspective-1000">
        {activeDeck ? (
          <div className="w-full max-w-2xl text-center">
            <h3 className="absolute top-8 left-8 font-semibold text-white/50">{activeDeck.title}</h3>
            <div className="absolute top-8 right-8 font-mono text-white/40">{currentIdx + 1} / {activeDeck.cards.length}</div>
            
            <div 
              className={clsx("w-full h-80 relative transition-transform duration-700 transform-style-3d cursor-pointer")}
              // For glass UI we use simple toggle rather than actual 3D to keep it clean, but let's emulate
              onClick={() => setIsFlipped(!isFlipped)}
            >
                <div className={clsx("absolute inset-0 glass-card bg-white/5 flex items-center justify-center p-12 text-3xl font-medium transition-all duration-500", isFlipped ? "opacity-0 rotate-y-180 pointer-events-none" : "opacity-100 rotate-y-0")}>
                  {activeDeck.cards[currentIdx]?.term}
                </div>
                <div className={clsx("absolute inset-0 glass-card border-pink-500/30 bg-purple-900/20 flex items-center justify-center p-12 text-xl leading-relaxed transition-all duration-500", !isFlipped ? "opacity-0 -rotate-y-180 pointer-events-none" : "opacity-100 rotate-y-0")}>
                  {activeDeck.cards[currentIdx]?.definition}
                </div>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-white/50">
              <button onClick={prevCard} disabled={currentIdx === 0} className="p-3 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"><ArrowLeft className="w-6 h-6"/></button>
              <span className="text-sm tracking-wider uppercase font-semibold">Click card to flip</span>
              <button onClick={nextCard} disabled={currentIdx === activeDeck.cards.length - 1} className="p-3 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"><ArrowRight className="w-6 h-6"/></button>
            </div>
          </div>
        ) : (
          <div className="text-white/40">Select a deck to start studying.</div>
        )}
      </div>
    </div>
  );
}
