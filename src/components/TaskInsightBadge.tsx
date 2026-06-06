import React, { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { apiFetch } from "../api";
import type { Assignment } from "../types";

interface TaskInsightBadgeProps {
  tasks: Assignment[];
}

export function TaskInsightBadge({ tasks }: TaskInsightBadgeProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        setLoading(true);

        const cacheKey = 'task_insight_cache';
        const cacheTimeKey = 'task_insight_cache_time';
        const cachedText = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);

        // Serve cached version if it's less than 5 minutes old to prevent rapid quota usage
        if (cachedText && cachedTime && (Date.now() - Number(cachedTime) < 5 * 60 * 1000)) {
          setInsight(cachedText);
          return;
        }

        // Only send pending tasks
        const pendingTasks = tasks.filter(t => t.status !== 'DONE');
        const response = await apiFetch('/api/gemini/task-insight', {
          method: 'POST',
          body: JSON.stringify({ tasks: pendingTasks.slice(0, 15) }) // Limit size
        });
        if (response.text) {
          setInsight(response.text);
          localStorage.setItem(cacheKey, response.text);
          localStorage.setItem(cacheTimeKey, String(Date.now()));
        }
      } catch (e) {
        console.warn("Failed to fetch task insight gracefully:", e);
      } finally {
        setLoading(false);
      }
    };

    if (tasks.length > 0 && !insight && !loading) {
      fetchInsight();
    }
  }, [tasks.length, insight, loading]);

  if (!insight && !loading) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-4">
      <div className="p-2 bg-indigo-500/20 rounded-xl shrink-0">
        {loading ? (
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5 text-indigo-400" />
        )}
      </div>
      <div>
        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
          AI Insight
        </h4>
        <p className="text-sm text-white/80 leading-relaxed">
          {loading ? "Analyzing your tasks and history..." : insight}
        </p>
      </div>
    </div>
  );
}
