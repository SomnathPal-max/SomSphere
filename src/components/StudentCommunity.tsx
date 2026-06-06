import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Hash, Users, Sparkles, User, Smile, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { useToast } from "../ToastContext";

interface ChatMessage {
  id: string;
  sender: string;
  senderEmail?: string;
  text: string;
  time: string;
  isUser: boolean;
  avatarColor: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  unread?: boolean;
}

const PEER_STATUSES = [
  { name: "Alex Chen", status: "Focusing 🎯", avatar: "AC", color: "from-blue-500 to-indigo-600" },
  { name: "Sarah Jenkins", status: "Acing Quizzes 🏆", avatar: "SJ", color: "from-emerald-400 to-teal-600" },
  { name: "Michael Wong", status: "Solving Calculus 📝", avatar: "MW", color: "from-purple-500 to-pink-500" },
  { name: "Emma Davis", status: "Studying Bio 🔬", avatar: "ED", color: "from-amber-400 to-orange-500" },
  { name: "Chloe Smith", status: "Away ☕", avatar: "CS", color: "from-red-400 to-rose-600" },
  { name: "David Kim", status: "Online Online ⚡", avatar: "DK", color: "from-cyan-400 to-blue-600" },
];

export function StudentCommunity() {
  const { showToast } = useToast();
  const [activeChannel, setActiveChannel] = useState("general");
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [channels] = useState<Channel[]>([
    { id: "general", name: "general", description: "Default announcements and community discussion workspace" },
    { id: "study-buddy", name: "study-buddy", description: "Coordinate real-time timers and join room tables together" },
    { id: "homework-help", name: "homework-help", description: "Share study tips, explain assignments, or unlock calculus guides" },
    { id: "casual", name: "casual", description: "Coffee breaks, gaming, memes, and casual conversations" },
  ]);

  const [channelMessages, setChannelMessages] = useState<Record<string, ChatMessage[]>>({
    general: [
      { id: "g1", sender: "Sarah Jenkins", text: "Has anyone checked the biology syllabus update? Chapter 4 prokaryote diagrams look massive.", time: "10:14 AM", isUser: false, avatarColor: "from-[#F59E0B] to-[#D97706]" },
      { id: "g2", sender: "Alex Chen", text: "Yeah! It took me about 4 Pomodoro cycles to finish drawing them, but the details are useful for the quiz.", time: "10:19 AM", isUser: false, avatarColor: "from-[#3B82F6] to-[#1D4ED8]" },
      { id: "g3", sender: "Emma Davis", text: "Agreed, you should lock down those diagrams before Wednesday for sure.", time: "10:22 AM", isUser: false, avatarColor: "from-[#EC4899] to-[#BE185D]" },
    ],
    "study-buddy": [
      { id: "sb1", sender: "Emma Davis", text: "Hey space lovers! I am planning a 3-hour study block for Calculus II concepts tonight at 8 PM. Anyone interested?", time: "09:40 AM", isUser: false, avatarColor: "from-[#EC4899] to-[#BE185D]" },
      { id: "sb2", sender: "Michael Wong", text: "Count me in, Emma! I need to hammer down the integration by parts problems.", time: "09:55 AM", isUser: false, avatarColor: "from-[#8B5CF6] to-[#6D28D9]" },
    ],
    "homework-help": [
      { id: "hw1", sender: "Michael Wong", text: "Stuck on Question 4 regarding Euler integration paths on the weekly practice sheet. Any hints?", time: "08:12 AM", isUser: false, avatarColor: "from-[#8B5CF6] to-[#6D28D9]" },
      { id: "hw2", sender: "Alex Chen", text: "Try setting your factor u = ln(z) first. The standard polynomial parts simplify instantly after integration parameters load.", time: "08:30 AM", isUser: false, avatarColor: "from-[#3B82F6] to-[#1D4ED8]" },
      { id: "hw3", sender: "Michael Wong", text: "Sweet, that works cleanly. Thanks Alex!", time: "08:33 AM", isUser: false, avatarColor: "from-[#8B5CF6] to-[#6D28D9]" },
    ],
    casual: [
      { id: "ca1", sender: "Chloe Smith", text: "That feeling when you click 'Export PDF' and your layout is perfectly matching on the first try! 🎉", time: "Yesterday", isUser: false, avatarColor: "from-[#F43F5E] to-[#E11D48]" },
      { id: "ca2", sender: "David Kim", text: "Absolute zen moment right there. Highly satisfying physical feedback.", time: "Yesterday", isUser: false, avatarColor: "from-[#06B6D4] to-[#0891B2]" },
    ]
  });

  // Suggestion quick tags to click
  const quickSuggestions: Record<string, string[]> = {
    general: ["Thanks for the tip!", "Makes sense", "Can't wait!", "Which page?"],
    "study-buddy": ["Count me in!", "I will join later", "Let's do it!", "What time?"],
    "homework-help": ["That worked!", "Got a different answer", "Could you explain?", "Thank you!"],
    casual: ["Hahaha true!", "Awesome", "Coffee break? ☕", "Wow!"]
  };

  // Scroll to bottom when channel or messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [channelMessages, activeChannel]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const newMessage: ChatMessage = {
      id: "us_" + Date.now(),
      sender: "Somnath",
      senderEmail: "somnathpalstudy@gmail.com",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true,
      avatarColor: "from-pink-500 to-rose-600"
    };

    // Append user message
    setChannelMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMessage]
    }));
    setInputText("");

    // Simulate instant peer response based on the active channel
    const currentChannel = activeChannel;
    setTimeout(() => {
      // Pick a random participant
      const peer = PEER_STATUSES[Math.floor(Math.random() * PEER_STATUSES.length)];
      let replyText = "";

      if (currentChannel === "general") {
        const answers = [
          `Great point Somnath! I think the updated schedule is also uploaded now.`,
          `Totally agree, Somnath. Are you ready for the Monday biology presentation?`,
          `No problem, let's discuss this further in tomorrow's lecture session.`,
          `Wow, didn't think about that. Thanks for bringing that up!`
        ];
        replyText = answers[Math.floor(Math.random() * answers.length)];
      } else if (currentChannel === "study-buddy") {
        const answers = [
          `Hey Somnath, want to join my Pomodoro workspace block later?`,
          `Perfect, let's keep keeping track of our streaks in the shared leaderboard!`,
          `Awesome, I will ping you on Gmail before we trigger our next joint timer session.`,
          `Let's draft some practice notes first, then we can exchange summaries.`
        ];
        replyText = answers[Math.floor(Math.random() * answers.length)];
      } else if (currentChannel === "homework-help") {
        const answers = [
          `That explanation works for the second question too, Somnath.`,
          `Do you know if question 6 is also counted for the final average?`,
          `Ah, got it! Let me rewrite my proof structure real quick.`,
          `Good trick! Saved me at least 45 minutes of manual trials.`
        ];
        replyText = answers[Math.floor(Math.random() * answers.length)];
      } else {
        const answers = [
          `Exactly! Same, coffee is the only thing keeping me awake 😂`,
          `Which movie are you planning to stream on Friday?`,
          `Outstanding. That template styling is elite grade level.`,
          `Haha, let me try that as well next time!`
        ];
        replyText = answers[Math.floor(Math.random() * answers.length)];
      }

      const peerResponse: ChatMessage = {
        id: "peer_" + Date.now(),
        sender: peer.name,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: false,
        avatarColor: peer.color
      };

      setChannelMessages(prev => ({
        ...prev,
        [currentChannel]: [...(prev[currentChannel] || []), peerResponse]
      }));

      // Notify user visually
      showToast(`${peer.name} replied in #${currentChannel}`, "success");
    }, 1200);
  };

  return (
    <div className="glass-card bg-[#14141E]/80 border border-white/5 rounded-[32px] overflow-hidden flex flex-col md:flex-row h-[550px] shadow-2xl">
      
      {/* Left Sidebar - Channels & Online Members */}
      <div className="w-full md:w-60 bg-[#0D0D14]/90 border-r border-white/5 flex flex-col shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Workspace Channels</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">University Community Hub</p>
        </div>

        {/* Channels List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {channels.map((chan) => (
            <button
              key={chan.id}
              onClick={() => setActiveChannel(chan.id)}
              className={clsx(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all relative group cursor-pointer",
                activeChannel === chan.id 
                  ? "bg-pink-500/10 border border-pink-500/20 text-white font-bold" 
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Hash className={clsx("w-3.5 h-3.5", activeChannel === chan.id ? "text-pink-500" : "text-gray-500 group-hover:text-pink-400")} />
              <span className="text-xs tracking-wide">#{chan.name}</span>
            </button>
          ))}

          {/* Active Members Header */}
          <div className="pt-6 pb-2 px-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
              <span>Active Peers</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">6 Online</span>
            </div>
          </div>

          {/* Peer List */}
          <div className="space-y-1">
            {PEER_STATUSES.map((p) => (
              <div key={p.name} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg group hover:bg-white/[0.02] transition-colors">
                <div className="relative">
                  <div className={clsx("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] text-white font-bold tracking-tight shadow-sm border border-white/10", p.color)}>
                    {p.avatar}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-[#09090e]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-gray-300 truncate group-hover:text-white transition-colors">{p.name}</div>
                  <div className="text-[9px] text-gray-500 truncate mt-0.5">{p.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Student Profile Bar */}
        <div className="p-3 bg-white/[0.01] border-t border-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-pink-500/20 border border-white/20">
            S
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-bold text-white truncate">Somnath</h5>
            <span className="text-[9px] text-pink-400 font-mono tracking-wide truncate block">somnathpalstudy@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Right Chat panel */}
      <div className="flex-1 flex flex-col bg-[#09090E]/60 min-w-0">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-pink-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                {activeChannel}
              </h4>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 truncate">
              {channels.find((c) => c.id === activeChannel)?.description}
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
            <MessageSquare className="w-4 h-4 text-pink-500 animate-pulse" />
            <span className="text-xs font-bold font-mono tracking-wide">STUDENTS CHAT</span>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-[#0e0e16]/20">
          {channelMessages[activeChannel]?.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                "flex items-start gap-3 max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-200",
                msg.isUser ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={clsx("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/10 shadow-md", msg.avatarColor)}>
                {msg.sender === "Somnath" ? "S" : msg.sender.split(" ").map(w => w[0]).join("")}
              </div>
              
              <div className="flex flex-col">
                <div className={clsx("flex items-center gap-2 mb-1", msg.isUser ? "justify-end" : "")}>
                  <span className="text-xs font-bold text-gray-200">{msg.sender}</span>
                  {msg.senderEmail && (
                    <span className="text-[9px] text-pink-400 font-mono tracking-wide">({msg.senderEmail})</span>
                  )}
                  <span className="text-[9px] text-gray-500 font-mono">{msg.time}</span>
                </div>
                
                <div
                  className={clsx(
                    "p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap border",
                    msg.isUser
                      ? "bg-pink-500/10 border-pink-500/20 text-white rounded-tr-none"
                      : "bg-[#161623] border-white/5 text-gray-300 rounded-tl-none"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Tags */}
        <div className="px-4 py-2 border-t border-white/[0.03] bg-[#0d0d15]/40 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0 animate-pulse" />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">Quick reply:</span>
          {quickSuggestions[activeChannel]?.map((tag) => (
            <button
              key={tag}
              onClick={() => handleSendMessage(tag)}
              className="text-[10px] text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer text-nowrap"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-[#0D0D14] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-3 bg-[#11111a] border border-white/5 focus-within:border-pink-500/50 rounded-2xl px-4 py-1 transition-all"
          >
            <Smile className="w-5 h-5 text-gray-500 hover:text-pink-500 cursor-pointer transition-colors" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Send message to #${activeChannel}...`}
              className="flex-1 py-3 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-30 disabled:hover:bg-pink-500 rounded-xl transition-all shadow-md text-white cursor-pointer group active:scale-95"
            >
              <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
