import React, { useMemo } from 'react';
import { Award, Zap, CheckCircle2, Clock } from 'lucide-react';
import { Assignment, HabitLog } from '../types';
import clsx from 'clsx';
import { startOfDay, format, subDays } from 'date-fns';

interface StudentAchievementsWidgetProps {
  assignments: Assignment[];
  habitLogs: HabitLog[];
  focusSessionCount: number;
}

export function StudentAchievementsWidget({ assignments, habitLogs, focusSessionCount }: StudentAchievementsWidgetProps) {
  const achievements = useMemo(() => {
    // 1. Task Master: Completing 10 tasks
    const completedTasks = assignments.filter(a => a.status === 'DONE').length;
    const taskMasterProgress = Math.min(completedTasks / 10, 1) * 100;
    const isTaskMaster = completedTasks >= 10;

    // 2. Focus Monk: Spending 5 hours in deep focus mode (12 sessions of 25m)
    // Assuming each session is 25 minutes
    const targetSessions = 12; // 5 hours = 300 minutes = 12 * 25
    const focusProgress = Math.min(focusSessionCount / targetSessions, 1) * 100;
    const isFocusMonk = focusSessionCount >= targetSessions;

    // 3. Consistency King: 7-day streak
    // Simplified streak check: look at the last 7 days and see if there's any completed habit log for each day
    // For simplicity, we just count unique days with at least one completed habit log in the past 7 days.
    let streakDays = 0;
    const today = startOfDay(new Date());
    for (let i = 0; i < 7; i++) {
        const d = subDays(today, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        if (habitLogs.some(l => l.date.startsWith(dateStr) && l.completed)) {
            streakDays++;
        } else {
            // Un-comment to require consecutive days:
            // break;
            // Actually, streak implies consecutive. Let's make it consecutive looking backwards from today.
        }
    }
    // Alternatively, just a simpler streak if the above is too strict if they missed today
    let currentStreak = 0;
    for (let i = 0; i < 7; i++) {
        const d = subDays(today, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        if (habitLogs.some(l => l.date.startsWith(dateStr) && l.completed)) {
            currentStreak++;
        } else if (i !== 0) { // allow missing today
            break;
        }
    }

    const streakProgress = Math.min(currentStreak / 7, 1) * 100;
    const isConsistencyKing = currentStreak >= 7;

    return [
      {
        id: 'task-master',
        title: 'Task Master',
        description: 'Complete 10 tasks',
        icon: <CheckCircle2 className={clsx("w-6 h-6", isTaskMaster ? "text-emerald-400" : "text-gray-500")} />,
        progress: taskMasterProgress,
        achieved: isTaskMaster,
        color: 'bg-emerald-500',
        current: completedTasks,
        target: 10
      },
      {
        id: 'focus-monk',
        title: 'Deep Focus',
        description: '5 hours of focus time',
        icon: <Clock className={clsx("w-6 h-6", isFocusMonk ? "text-purple-400" : "text-gray-500")} />,
        progress: focusProgress,
        achieved: isFocusMonk,
        color: 'bg-purple-500',
        current: focusSessionCount,
        target: targetSessions
      },
      {
        id: 'consistency',
        title: '7-Day Streak',
        description: 'Complete habits for 7 days',
        icon: <Zap className={clsx("w-6 h-6", isConsistencyKing ? "text-amber-400" : "text-gray-500")} />,
        progress: streakProgress,
        achieved: isConsistencyKing,
        color: 'bg-amber-500',
        current: currentStreak,
        target: 7
      }
    ];
  }, [assignments, habitLogs, focusSessionCount]);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-yellow-400" />
        <h3 className="text-xl font-semibold">Achievements</h3>
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
        {achievements.map((ach) => (
          <div key={ach.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 relative overflow-hidden group hover:bg-white/10 transition-colors">
            {ach.achieved && (
               <div className="absolute top-0 right-0 p-2 opacity-10">
                 <Award className="w-16 h-16" />
               </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                {ach.icon}
              </div>
              <div className="flex-1">
                <h4 className={clsx("font-semibold text-sm", ach.achieved ? "text-white" : "text-gray-400")}>
                  {ach.title}
                </h4>
                <p className="text-xs text-gray-500">{ach.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-white/80">{ach.current} / {ach.target}</span>
              </div>
            </div>
            
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div 
                className={clsx("h-full transition-all duration-1000", ach.color)} 
                style={{ width: `${ach.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
