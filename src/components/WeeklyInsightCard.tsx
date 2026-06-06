import React, { useState, useEffect } from 'react';
import { Sparkles, Activity } from 'lucide-react';
import type { Expense, HabitLog } from '../types';

interface WeeklyInsightCardProps {
  expenses: Expense[];
  habitLogs: HabitLog[];
}

export function WeeklyInsightCard({ expenses, habitLogs }: WeeklyInsightCardProps) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchInsight() {
      try {
        setLoading(true);

        const cacheKey = 'weekly_insight_cache';
        const cacheTimeKey = 'weekly_insight_cache_time';
        const cachedText = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);

        // Serve cached version if it's less than 5 minutes old to prevent rapid quota usage
        if (cachedText && cachedTime && (Date.now() - Number(cachedTime) < 5 * 60 * 1000)) {
          if (isMounted) {
            setInsight(cachedText);
            setLoading(false);
          }
          return;
        }

        // We only want recent data, so slice or send something to not blow up context
        const recentExpenses = expenses.slice(0, 10);
        const recentHabitLogs = habitLogs.slice(0, 30);
        
        const response = await fetch('/api/gemini/weekly-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expenses: recentExpenses, habits: recentHabitLogs })
        });
        
        const data = await response.json();
        
        if (isMounted) {
          if (response.ok && data.text) {
            setInsight(data.text);
            localStorage.setItem(cacheKey, data.text);
            localStorage.setItem(cacheTimeKey, String(Date.now()));
          } else {
            setInsight('No sufficient data to generate an insight yet.');
          }
        }
      } catch (error) {
        if (isMounted) {
          setInsight('Could not load weekly insight. Try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    // Only run when we have some data
    if (expenses.length > 0 || habitLogs.length > 0) {
      // Small delay to allow initial auth and data loading to settle
      const timeout = setTimeout(() => {
        fetchInsight();
      }, 1000);
      return () => clearTimeout(timeout);
    } else {
      setInsight('Add some habits and expenses to get personalized insights here.');
      setLoading(false);
    }

    return () => { isMounted = false; };
  }, [expenses.length, habitLogs.length]);

  return (
    <div className="glass-card p-6 flex flex-col h-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 group hover:border-indigo-500/40 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-500/20 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-white/90">AI Insight</h3>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
         {loading ? (
           <div className="flex flex-col items-center justify-center space-y-3 py-6 h-full text-indigo-400/60">
              <Activity className="w-6 h-6 animate-pulse" />
              <div className="text-xs font-bold uppercase tracking-widest animate-pulse">Analyzing...</div>
           </div>
         ) : (
           <p className="text-indigo-100/80 leading-relaxed font-medium text-sm md:text-base italic pl-4 border-l-2 border-indigo-400/50 my-auto">
             "{insight}"
           </p>
         )}
      </div>
    </div>
  );
}
