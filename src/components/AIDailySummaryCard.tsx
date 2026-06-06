import React, { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { apiFetch } from "../api";
import type { Assignment } from "../types";

interface AIDailySummaryCardProps {
  assignments: Assignment[];
}

export function AIDailySummaryCard({ assignments }: AIDailySummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // We only want to generate the summary once a day, or when assignments change significantly.
    // For simplicity, we'll just generate it on mount if there's no saved summary for today,
    // or if we force a refresh. Let's just fetch it on initial load.
    
    const fetchSummary = async () => {
      try {
        setLoading(true);

        const cacheKey = 'daily_summary_cache';
        const cacheTimeKey = 'daily_summary_cache_time';
        const cachedText = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);

        // Serve cached version if it's less than 5 minutes old to prevent rapid quota usage
        if (cachedText && cachedTime && (Date.now() - Number(cachedTime) < 5 * 60 * 1000)) {
          setSummary(cachedText);
          return;
        }

        // Filter tasks due today or overdue
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysTasks = assignments.filter(a => a.status !== 'DONE' && a.dueDate <= todayStr);
        
        const response = await apiFetch('/api/gemini/daily-summary', {
          method: 'POST',
          body: JSON.stringify({ tasks: todaysTasks.slice(0, 10) }) // send up to 10 tasks to avoid huge prompts
        });
        
        if (response.text) {
          setSummary(response.text);
          localStorage.setItem(cacheKey, response.text);
          localStorage.setItem(cacheTimeKey, String(Date.now()));
        }
      } catch (err) {
        console.warn("Failed to fetch daily summary gracefully:", err);
        setSummary("Focus on your most important tasks today. You've got this!");
      } finally {
        setLoading(false);
      }
    };

    if (assignments.length > 0 && summary === null && !loading) {
        fetchSummary();
    }
  }, [assignments.length, summary, loading]);

  if (!summary && !loading) return null;

  return (
    <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 p-5 rounded-3xl backdrop-blur-md relative overflow-hidden group min-h-[160px] h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Sparkles className="w-16 h-16 text-pink-400" />
      </div>
      <div className="flex flex-col h-full relative z-10">
        <h3 className="text-sm font-bold text-pink-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> AI Daily Summary
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
            Analyzing your day...
          </div>
        ) : (
          <p className="text-sm text-white/90 leading-relaxed">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
