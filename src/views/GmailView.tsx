import React, { useState, useEffect } from "react";
import { 
  Mail, Search, RefreshCw, ExternalLink, Calendar, User, Loader2, Sparkles, Layers, SlidersHorizontal, 
  Inbox, Ban, FileText, Send, Trash2, ArrowRight
} from "lucide-react";
import { getAccessToken, googleSignIn } from "../googleApi";
import { format } from "date-fns";
import { useNotifications } from "../NotificationsContext";
import { useToast } from "../ToastContext";
import clsx from "clsx";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
}

type CategoryId = 'inbox' | 'junk' | 'drafts' | 'sent' | 'trash';

interface CategoryConfig {
  id: CategoryId;
  label: string;
  gmailLabelId: string;
  icon: React.ComponentType<any>;
  badgeType: 'unread' | 'total' | 'square';
  colorClass: string;
  bgClass: string;
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase().trim() : from.toLowerCase().trim();
}

const categories: CategoryConfig[] = [
  { id: 'inbox', label: 'Inbox', gmailLabelId: 'INBOX', icon: Inbox, badgeType: 'unread', colorClass: 'text-pink-400', bgClass: 'bg-pink-500/10 border-pink-500/20' },
  { id: 'junk', label: 'Junk Email', gmailLabelId: 'SPAM', icon: Ban, badgeType: 'square', colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10 border-rose-500/20' },
  { id: 'drafts', label: 'Drafts', gmailLabelId: 'DRAFT', icon: FileText, badgeType: 'total', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'sent', label: 'Sent Items', gmailLabelId: 'SENT', icon: Send, badgeType: 'total', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'trash', label: 'Deleted Items', gmailLabelId: 'TRASH', icon: Trash2, badgeType: 'total', colorClass: 'text-slate-300', bgClass: 'bg-slate-500/10 border-slate-500/20' },
];

export function GmailView() {
  const { addNotification } = useNotifications();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<CategoryId>('inbox');
  const [activeTab, setActiveTab] = useState<'focused' | 'other'>('focused');
  const [labelStats, setLabelStats] = useState<Record<string, { unread: number; total: number }>>({});

  const [overrides, setOverrides] = useState<Record<string, 'focused' | 'other'>>(() => {
    try {
      const saved = localStorage.getItem('gmail_tab_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0];

  const toggleOverride = (sender: string, targetTab: 'focused' | 'other') => {
    const senderEmail = extractEmail(sender);
    const next = { ...overrides, [senderEmail]: targetTab };
    setOverrides(next);
    localStorage.setItem('gmail_tab_overrides', JSON.stringify(next));
  };

  const checkIsFocused = (email: GmailMessage): boolean => {
    const senderEmail = extractEmail(email.from);
    if (overrides[senderEmail]) {
      return overrides[senderEmail] === 'focused';
    }

    const fromLower = email.from.toLowerCase();
    const subjectLower = email.subject.toLowerCase();

    const otherKeywords = [
      'noreply', 'no-reply', 'notification', 'support@', 'info@', 'newsletter', 'marketing', 
      'alert', 'update', 'digest', 'promo', 'news@', 'system@', 'bounce', 'billing@',
      'receipt', 'invoice', 'order@', 'welcome', 'activate', 'verify', 'confirm', 'security',
      'social', 'facebook', 'linkedin', 'twitter', 'github', 'discord', 'slack'
    ];

    const hasOtherKeyword = otherKeywords.some(keyword => 
      fromLower.includes(keyword) || 
      subjectLower.includes(keyword)
    );

    return !hasOtherKeyword;
  };

  const fetchAllLabelStats = async (token: string) => {
    const labelsToFetch = ['INBOX', 'SPAM', 'DRAFT', 'SENT', 'TRASH'];
    try {
      const statsArray = await Promise.all(
        labelsToFetch.map(async (labelId) => {
          try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              return {
                labelId,
                unread: data.messagesUnread || 0,
                total: data.messagesTotal || 0,
              };
            }
          } catch (e) {
            console.error(`Error fetching label stats for ${labelId}:`, e);
          }
          return { labelId, unread: 0, total: 0 };
        })
      );

      const statsMap: Record<string, { unread: number; total: number }> = {};
      statsArray.forEach(item => {
        statsMap[item.labelId] = { unread: item.unread, total: item.total };
      });
      setLabelStats(statsMap);
    } catch (err) {
      console.error("Error fetching all label metadata:", err);
    }
  };

  const fetchEmails = async (catId: CategoryId = activeCategoryId, forceAuth = false) => {
    setLoading(true);
    setError(null);
    const targetCategory = categories.find(c => c.id === catId) || categories[0];
    try {
      let token = await getAccessToken();
      
      // Only request sign in if explicitly triggered by a user click/gesture
      if (!token && forceAuth) {
        setIsLoggingIn(true);
        try {
          const result = await googleSignIn();
          if (result) {
            token = result.accessToken;
            setNeedsAuth(false);
          }
        } catch (authErr: any) {
          console.error("Gmail Sign-in error:", authErr);
          if (authErr.code === 'auth/popup-closed-by-user' || authErr.message?.includes('popup-closed-by-user')) {
            throw new Error("Google Sign-in window was closed. Please try again and complete the authorization flow.");
          } else if (authErr.code === 'auth/popup-blocked' || authErr.message?.includes('popup-blocked')) {
            throw new Error("Sign-in popup was blocked by your browser. Please allow popups or open this app in a new tab.");
          }
          throw authErr;
        } finally {
          setIsLoggingIn(false);
        }
      }

      if (!token) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      // Load counts in background
      fetchAllLabelStats(token);

      const query = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&labelIds=${targetCategory.gmailLabelId}${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!listRes.ok) {
        if (listRes.status === 403 || listRes.status === 401) {
            setNeedsAuth(true);
            throw new Error("Missing Gmail permissions. Please sign in again and make sure Gmail access is enabled.");
        }
        throw new Error(`Failed to fetch ${targetCategory.label} list.`);
      }
      
      const listData = await listRes.json();

      if (!listData.messages) {
        setMessages([]);
        return;
      }

      const fullMessages = await Promise.all(
        listData.messages.map(async (msg: { id: string }) => {
          try {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!detailRes.ok) return null;
            const detail = await detailRes.json();
            
            const headers = detail.payload?.headers || [];
            return {
              id: detail.id,
              threadId: detail.threadId,
              snippet: detail.snippet || '',
              subject: headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)',
              from: headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown',
              to: headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '',
              date: headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString(),
            };
          } catch (detailErr) {
            console.error("Error fetching detail for message id:", msg.id, detailErr);
            return null;
          }
        })
      );

      const validMessages = fullMessages.filter((msg): msg is GmailMessage => msg !== null);
      setMessages(validMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      // Detect new arrivals by comparing against local storage cache of known email IDs
      try {
        const knownEmailsStr = localStorage.getItem("somsphere_known_emails");
        const knownEmailIds = knownEmailsStr ? JSON.parse(knownEmailsStr) : null;
        if (knownEmailIds === null) {
          // First time loading: initial seed of existing emails
          const initialIds = validMessages.map(m => m.id);
          localStorage.setItem("somsphere_known_emails", JSON.stringify(initialIds));
        } else {
          // Compare and locate novel message IDs
          const currentIds = validMessages.map(m => m.id);
          const newEmails = validMessages.filter(m => !knownEmailIds.includes(m.id));
          
          if (newEmails.length > 0) {
            newEmails.forEach(email => {
              const senderClean = email.from.split("<")[0].replace(/"/g, '').trim();
              addNotification(
                "gmail", 
                "New Email Received", 
                `From: ${senderClean} • Subject: ${email.subject}`
              );
            });
            // Update known keys
            const updatedIds = Array.from(new Set([...knownEmailIds, ...currentIds]));
            localStorage.setItem("somsphere_known_emails", JSON.stringify(updatedIds));
          }
        }
      } catch (e) {
        console.error("Error evaluating new email alerts:", e);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      const token = await getAccessToken();
      if (token) {
        fetchEmails(activeCategoryId);
      } else {
        setNeedsAuth(true);
      }
    };
    initFetch();
  }, [activeCategoryId]);

  const focusedMessages = messages.filter(msg => checkIsFocused(msg));
  const otherMessages = messages.filter(msg => !checkIsFocused(msg));
  
  // Only show Focused/Other filter on Inbox
  const isInbox = activeCategory.id === 'inbox';
  const displayedMessages = isInbox 
    ? (activeTab === 'focused' ? focusedMessages : otherMessages) 
    : messages;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "MMM d, yyyy • HH:mm");
    } catch (e) {
      return dateStr;
    }
  };

  const handleSimulateEmail = () => {
    const subjects = [
      "Assignment Submission Approved for Advanced Database Architectures",
      "Notice: Invitation to SomSphere Private Developer Forum",
      "Incoming Payment Confirmed: Semester Workspace Access Refreshed",
      "Calculus II Midterm practice modules are now active",
      "Secured PDF processing certificate issued by author"
    ];
    const senders = [
      "Academic Advisory Board <advisors@university.edu>",
      "SomSphere System <no-reply@somsphere.org>",
      "GitHub Security Advisories <support@github.com>",
      "Stripe Billing Receipts <billing@stripe.com>"
    ];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const randomSender = senders[Math.floor(Math.random() * senders.length)];
    
    addNotification(
      "gmail",
      "New Email Arrived",
      `From: ${randomSender.split("<")[0].trim()} • Subject: ${randomSubject}`
    );
    showToast("Demo New Email alert dispatched to your Notification Hub!", "success");
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
             <Mail className="w-8 h-8 text-pink-500" />
             Gmail Workspace
           </h2>
           <p className="text-gray-400 mt-1">Smart organized view of your business & updates</p>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button 
            onClick={handleSimulateEmail}
            className="px-3.5 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 hover:border-pink-500/45 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg active:scale-95 text-pink-400 cursor-pointer"
            title="Simulate background test email arrivals for review"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Simulate New Email
          </button>

          {!needsAuth && (
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-pink-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder={`Search in ${activeCategory.label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchEmails(activeCategoryId)}
                  className="pl-10 pr-4 py-2 bg-[#0D0D14]/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500 transition-all w-64 placeholder-gray-600"
                />
              </div>
              <button 
                onClick={() => fetchEmails(activeCategoryId)} 
                disabled={loading}
                title={`Refresh ${activeCategory.label}`}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-gray-300 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
              </button>
            </div>
          )}
        </div>
      </header>

      {needsAuth ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
          <div className="glass-card border border-white/5 bg-white/[0.02] p-12 rounded-[32px] text-center max-w-lg mx-auto mt-10">
            <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connect to Gmail</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
              Securely link your Google account to browse, search, and synchronize your recent business or Google Pay transaction emails directly.
            </p>
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl max-w-md mx-auto text-left leading-relaxed">
                {error}
              </div>
            )}
            <button 
              onClick={() => fetchEmails(activeCategoryId, true)}
              disabled={isLoggingIn}
              className="px-8 py-3 bg-gradient-to-r from-pink-600 to-violet-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Connect Gmail Workspace
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Folders navigation panel */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
            <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.25em] px-3 mb-3">
              Mailboxes
            </div>
            
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategoryId === cat.id;
              
              // Get live statistics
              const stats = labelStats[cat.gmailLabelId];
              let statCount = 0;
              if (stats) {
                if (cat.badgeType === 'unread') {
                  statCount = stats.unread;
                } else {
                  statCount = stats.total;
                }
              }

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setMessages([]); // Clear previous to show loading state cleanly
                  }}
                  className={clsx(
                    "w-full text-left py-3 px-4 rounded-xl flex items-center justify-between text-sm transition-all duration-200 group border cursor-pointer",
                    isActive 
                      ? `${cat.colorClass} ${cat.bgClass} font-bold font-semibold shadow-lg shadow-black/10` 
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04] border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={clsx("w-4 h-4 transition-transform group-hover:scale-110", isActive && "stroke-[2.5px]")} />
                    <span>{cat.label}</span>
                  </div>
                  
                  {statCount > 0 && (
                    <span className={clsx(
                      "text-[10px] px-2 py-0.5 rounded-full font-extrabold transition-all",
                      isActive 
                        ? "bg-white/10 scale-105" 
                        : "bg-white/5 text-gray-500 group-hover:text-gray-300"
                    )}>
                      {cat.badgeType === 'square' ? `[${statCount}]` : statCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Email Messages Panel */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#14141E]/30 border border-white/5 rounded-[24px] p-6">
            
            {/* Tabs Row (Focused / Other) - Only visible when "Inbox" folder is active */}
            {isInbox && !error && messages.length > 0 && (
              <div className="flex border-b border-white/5 gap-6 mb-6">
                <button
                  onClick={() => setActiveTab('focused')}
                  className={clsx(
                    "pb-4 text-sm font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all relative cursor-pointer",
                    activeTab === 'focused' 
                      ? "text-pink-500 border-pink-500 font-extrabold" 
                      : "text-gray-400 border-transparent hover:text-gray-200"
                  )}
                >
                  <Sparkles className={clsx("w-4 h-4", activeTab === 'focused' ? "text-pink-500 animate-pulse" : "text-gray-400")} />
                  Focused
                  <span className={clsx(
                    "px-2 py-0.5 text-[10px] font-extrabold rounded-full transition-colors",
                    activeTab === 'focused' 
                      ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" 
                      : "bg-white/5 text-gray-400 border border-transparent"
                  )}>
                    {focusedMessages.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('other')}
                  className={clsx(
                    "pb-4 text-sm font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all relative cursor-pointer",
                    activeTab === 'other' 
                      ? "text-violet-500 border-violet-500 font-extrabold" 
                      : "text-gray-400 border-transparent hover:text-gray-200"
                  )}
                >
                  <Layers className="w-4 h-4" />
                  Other
                  <span className={clsx(
                    "px-2 py-0.5 text-[10px] font-extrabold rounded-full transition-colors",
                    activeTab === 'other' 
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" 
                      : "bg-white/5 text-gray-400 border border-transparent"
                  )}>
                    {otherMessages.length}
                  </span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
              {loading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
                  <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                  <div className="flex flex-col items-center">
                      <p className="text-gray-300 text-sm font-bold uppercase tracking-widest">Accessing Secure Inbox</p>
                      <p className="text-gray-500 text-xs mt-1">Fetching your live emails from {activeCategory.label}...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="glass-card border border-red-500/20 bg-red-500/5 p-12 rounded-[32px] text-center max-w-lg mx-auto mt-6">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Connection Issue</h3>
                  <p className="text-red-400/80 text-sm font-medium mb-6 leading-relaxed">{error}</p>
                  <button onClick={() => fetchEmails(activeCategoryId, true)} className="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 cursor-pointer">
                    Re-authenticate & Try Again
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center max-w-md mx-auto">
                  <InboxEmptyIcon categoryId={activeCategoryId} />
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.25em] mt-6">No Emails In {activeCategory.label}</p>
                  <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                    We couldn't retrieve any messages matching the label <strong>{activeCategory.gmailLabelId}</strong> in your account.
                  </p>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center max-w-md mx-auto">
                  <Sparkles className="w-12 h-12 text-pink-500 opacity-30 animate-pulse" />
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-6">
                    Nothing in {activeTab === 'focused' ? 'Focused' : 'Other'}
                  </p>
                  <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                    {activeTab === 'focused' 
                      ? "All newsletters, promotional system updates, and automated alerts reside in other." 
                      : "Primary business emails and direct communications reside in focused."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {displayedMessages.map((email) => {
                    // For Sent and Drafts, show recipients list (email.to) instead of me (email.from)
                    const isDraftOrSent = activeCategoryId === 'sent' || activeCategoryId === 'drafts';
                    const showRecipient = isDraftOrSent && email.to;
                    const addressPrefix = showRecipient ? 'To:' : 'From:';
                    const addressField = showRecipient ? email.to : email.from;

                    return (
                      <div 
                        key={email.id} 
                        className="glass-card bg-[#1A1A24]/45 border border-white/5 rounded-[22px] p-5 hover:bg-[#1A1A24]/65 hover:border-white/10 transition-all group relative overflow-hidden"
                      >
                        {/* Hover Quick Actions */}
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 flex items-center gap-2 z-10">
                          {isInbox && (
                            <button
                              onClick={() => toggleOverride(email.from, activeTab === 'focused' ? 'other' : 'focused')}
                              title={activeTab === 'focused' ? "Move to Other" : "Move to Focused"}
                              className="p-2.5 bg-[#0D0D14]/80 hover:bg-violet-500/20 rounded-xl text-gray-400 hover:text-violet-400 transition-all border border-white/5 flex items-center gap-1.5 cursor-pointer shadow-xl backdrop-blur-md"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">
                                {activeTab === 'focused' ? "To Other" : "To Focused"}
                              </span>
                            </button>
                          )}

                          <a 
                            href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`} 
                            target="_blank" 
                            rel="noreferrer"
                            title="Open in Gmail"
                            className="p-2.5 bg-[#0D0D14]/80 hover:bg-pink-500/20 rounded-xl text-gray-400 hover:text-pink-400 transition-all border border-white/5 flex items-center gap-1.5 cursor-pointer shadow-xl backdrop-blur-md"
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider">Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <div className="flex flex-col gap-3.5">
                          {/* Senders & Recipients info row */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pr-44">
                            <div className={clsx(
                              "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
                              isDraftOrSent 
                                ? "text-amber-400 bg-amber-500/5 border-amber-500/10"
                                : "text-pink-400 bg-pink-500/5 border-pink-500/10"
                            )}>
                              <User className="w-3 h-3" />
                              <span className="font-extrabold pr-0.5">{addressPrefix}</span>
                              <span className="truncate max-w-[220px] font-medium">{addressField}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(email.date)}
                            </div>
                          </div>

                          {/* Subject & Snippet content row */}
                          <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors line-clamp-1 pr-16 mb-1.5">
                              {email.subject}
                            </h3>
                            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                              {email.snippet}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="py-8 text-center flex items-center justify-center gap-2">
                    <p className="text-[9px] font-extrabold text-gray-600 uppercase tracking-[0.4em]">End of {activeCategory.label}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function InboxEmptyIcon({ categoryId }: { categoryId: CategoryId }) {
  switch (categoryId) {
    case 'inbox':
      return <Sparkles className="w-14 h-14 text-pink-500 mx-auto opacity-30 animate-pulse" />;
    case 'junk':
      return <Ban className="w-14 h-14 text-rose-500 mx-auto opacity-30" />;
    case 'drafts':
      return <FileText className="w-14 h-14 text-amber-500 mx-auto opacity-30" />;
    case 'sent':
      return <Send className="w-14 h-14 text-emerald-500 mx-auto opacity-30" />;
    case 'trash':
      return <Trash2 className="w-14 h-14 text-slate-500 mx-auto opacity-30" />;
    default:
      return <Mail className="w-14 h-14 text-pink-500 mx-auto opacity-30" />;
  }
}
