import React, { useState, useEffect } from "react";
import { Plus, X, Flame, Activity } from "lucide-react";
import { fetchCollection, createItem, updateItem, deleteItem } from "../api";
import type { Habit, HabitLog } from "../types";
import { format, subDays } from "date-fns";
import clsx from "clsx";

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newTargetGoal, setNewTargetGoal] = useState("30");

  const loadData = async () => {
    const [h, l] = await Promise.all([
      fetchCollection('habits'),
      fetchCollection('habitLogs')
    ]);
    setHabits(h);
    setLogs(l);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    const goal = parseInt(newTargetGoal, 10);
    await createItem('habits', { 
      name: newHabitName.trim(), 
      targetGoal: isNaN(goal) || goal <= 0 ? 30 : goal 
    });
    setNewHabitName("");
    setNewTargetGoal("30");
    setIsAdding(false);
    loadData();
  };

  const handleDelete = async (id: string | number) => {
    await deleteItem('habits', id);
    loadData();
  };

  const toggleLog = async (habitId: string | number, dateStr: string) => {
    const existing = logs.find(l => l.habitId === habitId && l.date === dateStr);
    if (existing) {
      await updateItem('habitLogs', existing.id, { ...existing, completed: !existing.completed });
    } else {
      await createItem('habitLogs', { habitId, date: dateStr, completed: true });
    }
    loadData();
  };

  const today = new Date();
  const dayOfWeek = today.getDay(); 
  const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(new Date().setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const getStreak = (habitId: string | number) => {
    // Basic streak calculation going backwards from today
    let streak = 0;
    let currDate = new Date();
    currDate.setHours(0, 0, 0, 0);
    
    // Check if today is completed
    const todayLog = logs.find(l => l.habitId === habitId && l.date === format(currDate, "yyyy-MM-dd"));
    
    // If today is not completed, we should check yesterday. If yesterday is also not completed, streak is 0.
    // To make it simple, we just count consecutive days backwards.
    if (!todayLog?.completed) {
       currDate = subDays(currDate, 1);
       const yestLog = logs.find(l => l.habitId === habitId && l.date === format(currDate, "yyyy-MM-dd"));
       if (!yestLog?.completed) return 0;
    }

    while (true) {
      const dStr = format(currDate, "yyyy-MM-dd");
      const log = logs.find(l => l.habitId === habitId && l.date === dStr);
      if (log?.completed) {
        streak++;
        currDate = subDays(currDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex items-center justify-between shrink-0">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Habit Tracker</h2>
           <p className="text-gray-400 mt-1">Build better routines, one day at a time</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-violet-700 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(212,0,255,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-white">
          <Plus className="w-4 h-4"/> Add Habit
        </button>
      </header>

      {isAdding && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md shrink-0 relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6"><Activity className="w-4 h-4 inline mr-2"/>New Habit</h3>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 flex-1 w-full">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Habit Name</label>
              <input required type="text" placeholder="e.g. Read 20 pages" value={newHabitName} onChange={e => setNewHabitName(e.target.value)} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600 w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-32">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Target Goal (Days)</label>
              <input required type="number" min="1" placeholder="30" value={newTargetGoal} onChange={e => setNewTargetGoal(e.target.value)} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600 w-full" />
            </div>
            <button type="submit" className="py-3 px-8 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors border border-white/10 tracking-wide sm:w-auto w-full shrink-0">Save Habit</button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar pb-8">
        <div className="min-w-[800px] glass-card bg-white/[0.02] border border-white/5 rounded-[32px] p-6 backdrop-blur-sm">
          
          <div className="grid border-b border-white/10 pb-4 mb-4" style={{gridTemplateColumns: 'minmax(200px, 1.5fr) repeat(7, 1fr) 120px'}}>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] flex items-end">Habit</div>
            {weekDays.map(d => (
              <div key={d.toISOString()} className="flex flex-col items-center justify-end">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{format(d, 'EEE')}</div>
                <div className={clsx("text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center", format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "text-gray-400")}>
                  {format(d, 'd')}
                </div>
              </div>
            ))}
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] flex items-end justify-center">Streak</div>
          </div>

          <div className="space-y-3">
            {habits.map(habit => {
              const streak = getStreak(habit.id);
              return (
                <div key={habit.id} className="grid items-center p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors group" style={{gridTemplateColumns: 'minmax(200px, 1.5fr) repeat(7, 1fr) 120px'}}>
                  <div className="flex grid items-center justify-between pr-4">
                     <span className="font-bold text-white text-sm truncate">{habit.name}</span>
                     <button onClick={() => handleDelete(habit.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-colors bg-[#0D0D14] rounded-lg border border-white/10">
                       <X className="w-3 h-3"/>
                     </button>
                  </div>
                  
                  {weekDays.map(d => {
                    const dStr = format(d, "yyyy-MM-dd");
                    const log = logs.find(l => l.habitId === habit.id && l.date === dStr);
                    const isCompleted = log?.completed;
                    const isFuture = d > new Date() && dStr !== format(new Date(), "yyyy-MM-dd");

                    return (
                      <div key={dStr} className="flex justify-center">
                        <button 
                          disabled={isFuture}
                          onClick={() => toggleLog(habit.id, dStr)}
                          className={clsx(
                            "w-10 h-10 rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer",
                            isFuture ? "opacity-20 cursor-not-allowed" : "hover:scale-110",
                            isCompleted 
                              ? "bg-gradient-to-br from-pink-500 to-violet-600 shadow-[0_0_15px_rgba(236,72,153,0.4)] border-none" 
                              : "bg-[#0D0D14]/50 border border-white/10 hover:border-white/30"
                          )}
                        >
                          {isCompleted && <div className="w-2 h-2 rounded-full bg-white"/>}
                        </button>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-center">
                    <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border", streak > 0 ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-white/5 border-white/10 text-gray-500")}>
                      <Flame className={clsx("w-3.5 h-3.5", streak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-500")}/>
                      {streak}
                    </div>
                  </div>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
                <Activity className="w-8 h-8 mb-3 opacity-50" />
                <div className="text-xs uppercase font-bold tracking-[0.2em]">No Habits Tracked</div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
