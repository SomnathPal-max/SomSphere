import React from "react";
import { Bell, X, Info, Calendar, Sparkles, FileText, Mail, Trash2 } from "lucide-react";
import { useNotifications } from "../NotificationsContext";
import clsx from "clsx";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { notifications, markAsRead, markAllAsRead, clearAll, unreadCount } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-16 bottom-0 w-80 bg-[#1A1A24]/95 backdrop-blur-xl border-l border-white/10 z-[200] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
         <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-pink-500 animate-bounce" />
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Workspace Alert Hub</h2>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-pink-500 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
         </div>
         <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
           <X className="w-4 h-4" />
         </button>
      </div>

      <div className="px-4 py-2 border-b border-white/5 bg-black/30 flex items-center justify-between gap-2">
        <button 
          onClick={markAllAsRead} 
          disabled={unreadCount === 0}
          className="text-[10px] text-pink-400 hover:text-pink-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors uppercase tracking-wider font-bold hover:underline"
        >
          Mark all read
        </button>
        <button 
          onClick={clearAll} 
          disabled={notifications.length === 0}
          className="text-[10px] text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors uppercase tracking-wider font-bold flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
         {notifications.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-2">
             <Bell className="w-8 h-8 text-white/10" />
             <p className="text-xs font-semibold tracking-wide uppercase">All Caught Up!</p>
             <p className="text-[10px] text-gray-600 max-w-[180px]">No new alerts. Complete actions to trigger notifications.</p>
           </div>
         ) : (
           notifications.map(notif => (
              <div 
                key={notif.id} 
                onClick={() => markAsRead(notif.id)}
                className={clsx("p-3.5 rounded-xl border relative overflow-hidden transition-all duration-200 cursor-pointer", 
                  notif.read 
                    ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]" 
                    : "border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/[0.08]"
                )}
              >
                 {!notif.read && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-pink-500 m-3.5 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                 )}
                 <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-[#0D0D14]/80 shrink-0 border border-white/5">
                       {notif.type === "system" && <Info className="w-3.5 h-3.5 text-blue-400" />}
                       {notif.type === "deadline" && <Calendar className="w-3.5 h-3.5 text-orange-400" />}
                       {notif.type === "ai" && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                       {notif.type === "pdf" && <FileText className="w-3.5 h-3.5 text-pink-400" />}
                       {notif.type === "gmail" && <Mail className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className={clsx("text-xs font-bold mb-0.5 truncate", notif.read ? "text-gray-400" : "text-white")}>
                         {notif.title}
                       </h4>
                       <p className="text-[11px] text-gray-400 leading-normal mb-1">{notif.message}</p>
                       <span className="text-[9px] text-gray-500 font-mono tracking-wider">{notif.time}</span>
                    </div>
                 </div>
              </div>
           ))
         )}
      </div>
    </div>
  );
}
