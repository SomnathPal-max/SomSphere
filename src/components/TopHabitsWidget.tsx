import React, { useMemo } from 'react';
import type { Habit, HabitLog } from '../types';
import { Trophy } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

export function TopHabitsWidget({ habits, habitLogs }: { habits: Habit[], habitLogs: HabitLog[] }) {
  const chartData = useMemo(() => {
    if (!habits.length) return [];

    const calculateStreak = (habitId: string | number) => {
      // Get all completed logs for this habit
      const logs = habitLogs
        .filter(l => l.habitId === habitId && l.completed)
        .map(l => startOfDay(new Date(l.date)).getTime())
        .sort((a, b) => b - a);

      if (logs.length === 0) return 0;

      let streak = 0;
      let checkDate = startOfDay(new Date()).getTime();
      
      // If today is not logged, check yesterday. If neither, streak is 0.
      if (!logs.includes(checkDate)) {
        checkDate = subDays(checkDate, 1).getTime();
        if (!logs.includes(checkDate)) {
          return 0;
        }
      }

      // Count backwards
      for (let i = 0; i < 365; i++) {
        if (logs.includes(checkDate)) {
          streak++;
          checkDate = subDays(checkDate, 1).getTime();
        } else {
          break;
        }
      }

      return streak;
    };

    const habitsWithStreaks = habits.map(h => ({
      name: h.name,
      streak: calculateStreak(h.id),
      targetGoal: h.targetGoal || 30, // default target goal 30 days
      isTop: false
    }));

    const sortedStreaks = habitsWithStreaks
      .sort((a, b) => b.streak - a.streak);

    const top3 = sortedStreaks.slice(0, 3);
    return top3;
  }, [habits, habitLogs]);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative group overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h3 className="text-xl font-semibold">Top Streaks</h3>
      </div>
      
      {chartData.length > 0 && chartData.some(d => d.streak > 0) ? (
        <div className="flex-1 w-full grid grid-cols-3 gap-4">
          {chartData.map((data, idx) => {
             const percentage = Math.min((data.streak / data.targetGoal) * 100, 100);
             const radius = 30;
             const circumference = 2 * Math.PI * radius;
             const strokeDashoffset = circumference - (percentage / 100) * circumference;
             const color = idx === 0 ? "text-yellow-400" : idx === 1 ? "text-purple-400" : "text-pink-400";
             const strokeColor = idx === 0 ? "#fbbf24" : idx === 1 ? "#a78bfa" : "#f472b6";

             return (
               <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative hover:bg-white/10 transition-colors">
                  <div className="relative flex items-center justify-center mb-3">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        className="text-white/10"
                        strokeWidth="5"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="40"
                        cy="40"
                      />
                      <circle
                        stroke={strokeColor}
                        strokeWidth="5"
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx="40"
                        cy="40"
                        style={{
                          strokeDasharray: circumference,
                          strokeDashoffset: strokeDashoffset,
                          transition: "stroke-dashoffset 1s ease-out"
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xl font-bold ${color}`}>{data.streak}</span>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest -mt-1">/ {data.targetGoal}</span>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-center text-white/90 line-clamp-2">{data.name}</h4>
               </div>
             )
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Trophy className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-medium">No active streaks</p>
            <p className="text-white/30 text-xs mt-1">Complete a habit today!</p>
        </div>
      )}
    </div>
  );
}
