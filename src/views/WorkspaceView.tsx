import React, { useState, useEffect } from "react";
import { Users, Activity, Trophy, Flame, CheckCircle2, BookOpen, Clock, Coffee, Bell, Palette, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { useToast } from "../ToastContext";
import { CollaborativeCanvas } from "../components/CollaborativeCanvas";
import { StudentCommunity } from "../components/StudentCommunity";

const INITIAL_ACTIVITIES = [
  { id: 1, user: "Alex Chen", action: "finished a Pomodoro session", time: "10m ago", xp: 50, icon: Activity },
  { id: 2, user: "Sarah Jenkins", action: "aced the Calculus midterm", time: "1h ago", xp: 200, icon: Trophy },
  { id: 3, user: "Michael Wong", action: "completed 'Physics Lab Report'", time: "2h ago", xp: 120, icon: CheckCircle2 },
  { id: 4, user: "Emma Davis", action: "started a group study block", time: "4h ago", xp: 0, icon: Users },
  { id: 5, user: "Somnath", action: "added 3 new habits", time: "5h ago", xp: 30, icon: BookOpen },
];

const LEADERBOARD = [
  { rank: 1, name: "Sarah Jenkins", xp: 4500, streak: 12 },
  { rank: 2, name: "Somnath", xp: 4250, streak: 8 },
  { rank: 3, name: "Michael Wong", xp: 3800, streak: 5 },
  { rank: 4, name: "Alex Chen", xp: 3200, streak: 2 },
  { rank: 5, name: "Emma Davis", xp: 2900, streak: 0 },
];

const NEW_ACTIONS = [
  { action: "completed a reading assignment", xp: 25, icon: BookOpen },
  { action: "aced a practice quiz", xp: 100, icon: Trophy },
  { action: "started a deep focus session", xp: 0, icon: Activity },
  { action: "joined the study room", xp: 5, icon: Users },
  { action: "checked off 'Read Chapter 4'", xp: 10, icon: CheckCircle2 },
];
const PEERS = ["Alex Chen", "Sarah Jenkins", "Michael Wong", "Emma Davis", "David Kim", "Chloe Smith"];

type Status = 'ONLINE' | 'FOCUSING' | 'AWAY';

export function WorkspaceView() {
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [status, setStatus] = useState<Status>('ONLINE');
  const { showToast } = useToast();

  useEffect(() => {
    // Simulate real-time peer activity
    const interval = setInterval(() => {
      const randAction = NEW_ACTIONS[Math.floor(Math.random() * NEW_ACTIONS.length)];
      const randPeer = PEERS[Math.floor(Math.random() * PEERS.length)];
      
      const newActivity = {
        id: Date.now(),
        user: randPeer,
        action: randAction.action,
        time: "Just now",
        xp: randAction.xp,
        icon: randAction.icon
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 15));
      
      if (Math.random() > 0.7) {
        showToast(`${randPeer} ${randAction.action}!`, "info");
      }
    }, 15000); // New activity every 15 seconds

    return () => clearInterval(interval);
  }, [showToast]);

  const handleStatusChange = (newStatus: Status) => {
    setStatus(newStatus);
    showToast(`Status updated tracking to: ${newStatus}`, "success");
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Shared Workspace</h2>
           <p className="text-gray-400 mt-1">See what your peers are accomplishing</p>
        </div>
        <div className="flex items-center gap-4">
          
          <div className="bg-[#0D0D14]/80 border border-white/10 rounded-xl p-1 flex items-center backdrop-blur-md">
            <button 
              onClick={() => handleStatusChange('ONLINE')}
              className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", status === 'ONLINE' ? "bg-emerald-500/20 text-emerald-400" : "text-gray-400 hover:text-white")}
            >
              <div className={clsx("w-2 h-2 rounded-full", status === 'ONLINE' ? "bg-emerald-400" : "bg-gray-500")} /> Online
            </button>
            <button 
              onClick={() => handleStatusChange('FOCUSING')}
              className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", status === 'FOCUSING' ? "bg-pink-500/20 text-pink-400" : "text-gray-400 hover:text-white")}
            >
              <Clock className="w-3 h-3" /> Focusing
            </button>
            <button 
               onClick={() => handleStatusChange('AWAY')}
               className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", status === 'AWAY' ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:text-white")}
            >
               <Coffee className="w-3 h-3" /> Away
            </button>
          </div>

          <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 backdrop-blur-md">
            <Users className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-bold text-white">24 Online</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 pr-2 pb-8">
        
        <div className="flex flex-col md:flex-row gap-8 shrink-0">
          {/* Activity Feed */}
          <div className="flex-1 glass-card bg-white/[0.02] border border-white/5 rounded-[32px] p-6 flex flex-col h-80">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 pl-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Live Activity Feed</span>
              <span className="text-emerald-400/80 bg-emerald-400/10 px-2 py-1 rounded-md text-[9px] flex items-center gap-1 animate-pulse">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE
              </span>
            </h3>
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-2 bottom-2 w-px bg-white/5" />
            
            {activities.map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="relative pl-16 pr-4 py-3 group animate-in slide-in-from-top-2 fade-in duration-300">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0D0D14] border border-white/20 flex items-center justify-center group-hover:border-pink-500 group-hover:shadow-[0_0_10px_rgba(236,72,153,0.3)] transition-all z-10">
                      <Icon className="w-3 h-3 text-gray-400 group-hover:text-pink-400 transition-colors" />
                   </div>
                   
                   <div className="bg-[#0D0D14]/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/5 hover:border-white/10">
                     <div className="flex items-start justify-between gap-4">
                       <div>
                         <div className="text-sm text-gray-300">
                           <span className="font-bold text-white">{activity.user}</span> {activity.action}
                         </div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-2">
                           {activity.time}
                         </div>
                       </div>
                       {activity.xp > 0 && (
                         <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 shrink-0">
                           +{activity.xp} XP
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard & Stats */}
        <div className="w-full md:w-1/3 shrink-0 flex flex-col gap-6">
          <div className="glass-card bg-gradient-to-br from-[#0D0D14] to-violet-950/30 border border-white/10 rounded-[32px] p-6 relative overflow-hidden flex flex-col">
             <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-[40px] rounded-full pointer-events-none" />
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Weekly Leaderboard
             </h3>
             
             <div className="space-y-2">
               {LEADERBOARD.map((user) => {
                 const isTop3 = user.rank <= 3;
                 return (
                   <div key={user.rank} className={clsx("flex items-center gap-4 p-3 rounded-2xl border transition-all", isTop3 ? "bg-white/5 border-white/10" : "bg-transparent border-transparent hover:bg-white/5")}>
                     <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0", 
                        user.rank === 1 ? "bg-yellow-500 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : 
                        user.rank === 2 ? "bg-gray-300 text-gray-800" :
                        user.rank === 3 ? "bg-amber-700 text-amber-100" :
                        "bg-[#0D0D14] text-gray-500 border border-white/10"
                     )}>
                       {user.rank}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-sm text-white truncate">{user.name}</h4>
                       <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold flex items-center gap-2 mt-0.5">
                         <span>{user.xp} XP</span>
                       </div>
                     </div>
                     {user.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full border border-orange-400/20 text-xs font-bold shrink-0">
                          <Flame className="w-3 h-3 fill-orange-400" /> {user.streak}
                        </div>
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
          
          <div className="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mb-3">
               <Bell className="w-5 h-5 text-pink-400" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Stay Focused</h4>
            <p className="text-xs text-gray-400">Set your status to focusing to turn off peer notifications.</p>
          </div>
        </div>
        </div>

         {/* Student Community Hub */}
        <div className="flex-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-pink-500" /> Student Community Hub
          </h3>
          <StudentCommunity />
        </div>

        {/* Collaborative Canvas Section */}
        <div className="flex-1 min-h-[500px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-pink-500" /> Collaborative Canvas
          </h3>
          <div className="h-[400px]">
            <CollaborativeCanvas />
          </div>
        </div>

      </div>
    </div>
  );
}
