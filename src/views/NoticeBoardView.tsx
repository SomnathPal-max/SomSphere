import React, { useState } from "react";
import { Pin, Megaphone, Calendar, Bookmark, Info, Star, Search, Sparkles, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useToast } from "../ToastContext";
import { apiFetch } from "../api";
import Markdown from "react-markdown";

const CATEGORIES = [
  { id: "all", label: "All Notices", icon: Megaphone },
  { id: "urgent", label: "Urgent", icon: Info },
  { id: "events", label: "Events", icon: Calendar },
  { id: "academic", label: "Academic", icon: Bookmark },
];

const INITIAL_NOTICES = [
  { 
    id: 1, 
    category: "urgent", 
    title: "Library Closure this Weekend", 
    content: "The main university library will be closed from Saturday 8 AM to Sunday 6 PM for emergency electrical maintenance. Please plan alternative study spaces.",
    author: "Facility Management",
    date: "2 hours ago",
    isPinned: true
  },
  { 
    id: 2, 
    category: "events", 
    title: "AI & Future of Tech Symposium", 
    content: "Join us for an evening of talks and networking with industry leaders from top tech companies. Food and drinks will be provided.",
    author: "Student Council",
    date: "4 hours ago",
    isPinned: false
  },
  { 
    id: 3, 
    category: "academic", 
    title: "Exam Registration Deadline Extension", 
    content: "Good news! The deadline for the Spring semester exam registration has been extended by one week. The new deadline is next Friday.",
    author: "Registrar's Office",
    date: "1 day ago",
    isPinned: true
  },
  { 
    id: 4, 
    category: "events", 
    title: "Hackathon Registration Open", 
    content: "Form your teams and register for the annual CodeFest 2026! Prizes up to $5,000.",
    author: "CS Department",
    date: "2 days ago",
    isPinned: false
  },
];

export function NoticeBoardView() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notices, setNotices] = useState(INITIAL_NOTICES);
  const [summaries, setSummaries] = useState<Record<string | number, { text?: string, loading: boolean }>>({});
  const { showToast } = useToast();

  React.useEffect(() => {
    const fetchCollegeNotices = async (force = false) => {
      if (!force && localStorage.getItem('isNoticeSyncEnabled') === 'false') return;
      try {
        const data = await apiFetch('/api/college-notices');
        const formattedNotices = data.map((n: any) => ({
          id: n.id,
          category: 'academic',
          title: n.title,
          content: n.body,
          author: 'JIS College',
          date: n.postedAt,
          isPinned: n.pinned
        }));
        setNotices(prev => {
          const newNotices = formattedNotices.filter((n: any) => !prev.some(p => p.id === n.id));
          if (newNotices.length === 0) return prev;
          const combined = [...prev, ...newNotices];
          return combined.sort((a, b) => {
             if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
             return 0; // maintain relative order
          });
        });
      } catch (err) {
        console.warn("Failed to fetch college notices (using default notice listings)", err);
      }
    };
    
    const handleManualSync = () => fetchCollegeNotices(true);
    window.addEventListener('manual-sync-notices', handleManualSync);

    // Initial fetch
    fetchCollegeNotices(true);
    
    // Periodically fetch every 5 minutes
    const interval = setInterval(() => fetchCollegeNotices(false), 5 * 60 * 1000);
    return () => {
       clearInterval(interval);
       window.removeEventListener('manual-sync-notices', handleManualSync);
    };
  }, []);

  const handleSummarize = async (id: string | number, content: string) => {
    setSummaries(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      const response = await apiFetch('/api/gemini/summarize', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      setSummaries(prev => ({ ...prev, [id]: { text: response.text, loading: false } }));
    } catch (e: any) {
      setSummaries(prev => ({ ...prev, [id]: { loading: false } }));
      showToast("Failed to summarize notice.", "error");
    }
  };

  const togglePin = (id: string | number) => {
    setNotices(notices.map(notice => {
      if (notice.id === id) {
        const newPinnedStatus = !notice.isPinned;
        showToast(newPinnedStatus ? "Notice pinned to top" : "Notice unpinned", newPinnedStatus ? "success" : "info");
        return { ...notice, isPinned: newPinnedStatus };
      }
      return notice;
    }));
  };

  const filteredNotices = notices.filter(n => {
    const matchesTab = activeTab === "all" || n.category === activeTab;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });
  
  // Sort pinned first
  const sortedNotices = [...filteredNotices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Notice Board</h2>
           <p className="text-gray-400 mt-1">Campus announcements and important updates</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 pr-2 pb-8">
        
        {/* Categories / Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
           <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-pink-400 transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search campus notices..." 
                className="w-full bg-[#0D0D14]/50 border border-white/10 focus:border-pink-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 transition-colors outline-none"
              />
           </div>
           <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
              {CATEGORIES.map(category => {
                const Icon = category.icon;
                const isActive = activeTab === category.id;
                return (
                  <button 
                    key={category.id}
                    onClick={() => setActiveTab(category.id)}
                    className={clsx("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border flex items-center gap-2", 
                      isActive ? "bg-white/10 border-white/20 text-white shadow-inner" : "bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5")}
                  >
                    <Icon className={clsx("w-4 h-4", isActive ? "text-pink-400" : "text-gray-500")} /> 
                    {category.label}
                  </button>
                );
              })}
           </div>
        </div>

        {/* Notices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {sortedNotices.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                 <Megaphone className="w-8 h-8 mb-4 opacity-50" />
                 <p className="text-sm font-bold uppercase tracking-widest text-center">No notices found in this category.</p>
              </div>
           ) : (
              sortedNotices.map(notice => (
                 <div key={notice.id} className={clsx("group relative border rounded-[24px] p-6 flex flex-col transition-all duration-300", 
                    notice.isPinned 
                       ? "bg-gradient-to-br from-pink-500/10 to-violet-500/5 border-pink-500/30 shadow-[0_4px_30px_rgba(236,72,153,0.05)]" 
                       : "bg-[#0D0D14]/40 border-white/5 hover:bg-white/5 hover:border-white/10"
                 )}>
                    {notice.isPinned && (
                       <div className="absolute top-0 right-6 -translate-y-1/2 bg-pink-500 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                          <Star className="w-3 h-3 fill-white" /> Pinned
                       </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                       <span className={clsx("text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md border",
                          notice.category === 'urgent' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          notice.category === 'events' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                       )}>
                          {CATEGORIES.find(c => c.id === notice.category)?.label}
                       </span>
                       
                       <button onClick={() => togglePin(notice.id)} className={clsx("p-2 rounded-lg transition-colors", 
                           notice.isPinned ? "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30" : "text-gray-500 hover:text-white hover:bg-white/10"
                       )}>
                          <Pin className={clsx("w-4 h-4", notice.isPinned && "fill-pink-400")} />
                       </button>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight">{notice.title}</h3>
                    <div className="text-sm text-gray-400 mb-4 flex-1 line-clamp-4 leading-relaxed">
                       {notice.content && notice.content.startsWith('Click here to view: ') && notice.content.split('Click here to view: ')[1] ? (
                          <div className="flex flex-col gap-3 mt-2">
                            <a href={notice.content.split('Click here to view: ')[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 w-fit px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 rounded-lg transition-colors text-xs font-bold uppercase tracking-widest">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              View Original
                            </a>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 font-medium">
                               <Sparkles className="w-3 h-3" /> Detected formatting updates
                            </div>
                          </div>
                       ) : (
                          <p>{notice.content}</p>
                       )}
                    </div>
                    
                    {summaries[notice.id]?.text && (
                       <div className="mb-4 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-sm text-purple-200 markdown-body">
                          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> API Summary</h4>
                          <Markdown>{summaries[notice.id].text}</Markdown>
                       </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                       <div className="flex items-center justify-between w-full">
                           <span>By <span className="text-gray-300">{notice.author}</span></span>
                           <div className="flex items-center gap-4">
                              <button 
                                 onClick={() => handleSummarize(notice.id, notice.content)} 
                                 className="text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                 disabled={summaries[notice.id]?.loading}
                              >
                                 {summaries[notice.id]?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                 {summaries[notice.id]?.loading ? "Summarizing..." : "Summarize"}
                              </button>
                           </div>
                       </div>
                       <div className="flex items-center justify-between opacity-80 pt-1">
                           <span className="flex gap-1.5"><Calendar className="w-3 h-3" /> {notice.date}</span>
                           {notice.author === 'JIS College' && (
                               <span className="flex gap-1 text-emerald-400 items-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> First Detected: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </span>
                           )}
                       </div>
                    </div>
                 </div>
              ))
           )}
        </div>

      </div>
    </div>
  );
}
