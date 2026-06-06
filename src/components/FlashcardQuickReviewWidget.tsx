import React, { useState, useEffect } from "react";
import { BrainCircuit, Eye, RefreshCw } from "lucide-react";
import { fetchCollection } from "../api";
import type { FlashcardDeck } from "../types";

export function FlashcardQuickReviewWidget() {
  const [card, setCard] = useState<{term: string, definition: string, deckTitle: string} | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setLoading(true);
      const data = await fetchCollection('flashcardDecks') as FlashcardDeck[];
      setDecks(data);
      pickRandomCard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickRandomCard = (availableDecks: FlashcardDeck[] = decks) => {
    const validDecks = availableDecks.filter(d => d.cards && d.cards.length > 0);
    if (validDecks.length === 0) {
      setCard(null);
      return;
    }
    
    const randomDeck = validDecks[Math.floor(Math.random() * validDecks.length)];
    const randomCard = randomDeck.cards[Math.floor(Math.random() * randomDeck.cards.length)];
    
    setCard({
      term: randomCard.term,
      definition: randomCard.definition,
      deckTitle: randomDeck.title
    });
    setIsRevealed(false);
  };

  if (loading) {
    return (
      <div className="glass-card bg-white/[0.02] border border-white/5 rounded-[32px] p-6 animate-pulse">
        <div className="h-6 w-1/3 bg-white/10 rounded mb-4"></div>
        <div className="h-32 w-full bg-white/5 rounded-2xl"></div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <div className="glass-card bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-[32px] p-6 relative overflow-hidden group h-full flex flex-col justify-between min-h-[160px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" /> Quick Review
        </h3>
        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md font-medium max-w-[150px] truncate" title={card.deckTitle}>
          {card.deckTitle}
        </span>
      </div>

      <div 
        className="flex flex-col items-center justify-center min-h-[140px] bg-white/5 hover:bg-white/10 transition-colors cursor-pointer rounded-2xl p-6 text-center select-none"
        onClick={() => setIsRevealed(!isRevealed)}
      >
        {isRevealed ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="text-[10px] text-indigo-400/60 mb-2 uppercase tracking-widest font-bold">Definition</div>
            <p className="text-white text-lg font-medium">{card.definition}</p>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="text-[10px] text-indigo-400/60 mb-2 uppercase tracking-widest font-bold">Term</div>
            <p className="text-white text-xl font-bold">{card.term}</p>
            <div className="mt-4 flex items-center gap-1.5 text-indigo-400/70 text-xs font-medium justify-center">
              <Eye className="w-3.5 h-3.5" /> Tap to reveal
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button 
          onClick={(e) => { e.stopPropagation(); pickRandomCard(); }}
          className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Next Card
        </button>
      </div>
    </div>
  );
}
