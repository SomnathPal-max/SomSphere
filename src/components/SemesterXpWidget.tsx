import React, { useMemo } from "react";
import { Award, Star } from "lucide-react";
import type { Assignment, HabitLog } from "../types";
import { useTimer } from "../TimerContext";

interface SemesterXpWidgetProps {
  assignments: Assignment[];
  habitLogs: HabitLog[];
}

export function SemesterXpWidget({ assignments, habitLogs }: SemesterXpWidgetProps) {
  const { sessionCount } = useTimer();

  const { totalXp, level, currentLevelXp, nextLevelXp, progress } = useMemo(() => {
    const completedTasks = assignments.filter(a => a.status === 'DONE').length;
    const taskXp = completedTasks * 20;
    const sessionXp = sessionCount * 50;
    const habitXp = habitLogs.length * 10;
    
    const xp = taskXp + sessionXp + habitXp;
    const currentLevel = Math.floor(xp / 500) + 1;
    const xpInCurrentLevel = xp % 500;
    const requiredForNext = 500; // Constant 500 per level for simplicity
    
    return {
      totalXp: xp,
      level: currentLevel,
      currentLevelXp: xpInCurrentLevel,
      nextLevelXp: requiredForNext,
      progress: (xpInCurrentLevel / requiredForNext) * 100
    };
  }, [assignments, sessionCount, habitLogs]);

  return (
    <div className="glass-card bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-[32px] p-6 relative overflow-hidden group h-full flex flex-col justify-center min-h-[160px]">
      <div className="absolute top-0 right-0 p-4 opacity-20 transition-transform group-hover:scale-110 duration-500">
        <Award className="w-20 h-20 text-yellow-500" />
      </div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <Star className="w-4 h-4" /> Semester XP
        </h3>
        <div className="bg-yellow-500/20 text-yellow-300 font-black px-3 py-1 rounded-full text-sm">
          Level {level}
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-end mb-2">
          <div className="text-3xl font-black text-white">{totalXp} <span className="text-sm font-medium text-white/50">XP</span></div>
          <div className="text-xs font-bold text-yellow-500/80 mb-1">{currentLevelXp} / {nextLevelXp} to next</div>
        </div>
        
        <div className="w-full bg-black/40 rounded-full h-3 mb-3 border border-white/5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-amber-500 h-full rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${Math.max(3, progress)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-white/40">
          <span>+20 XP / Task</span>
          <span>+50 XP / Focus</span>
          <span>+10 XP / Habit</span>
        </div>
      </div>
    </div>
  );
}
