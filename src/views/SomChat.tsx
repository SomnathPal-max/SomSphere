import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { apiFetch } from "../api";
import clsx from "clsx";

type ChatMessage = {
  id: string;
  role: 'user' | 'som';
  text: string;
  time: string;
};

export function SomChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'som', text: "Hello! I'm Som, your Smart Campus Assistant. How can I help you today?", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const PERSONAS = ['Assistant', 'Tutor', 'Editor', 'Brainstormer'] as const;
  type Persona = typeof PERSONAS[number];
  const [persona, setPersona] = useState<Persona>("Assistant");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.trim(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsTyping(true);

    try {
      const data = await apiFetch('/api/gemini/chat', { 
        method: 'POST', 
        body: JSON.stringify({ history: newHistory, persona }) 
      });
      setMessages([...newHistory, { id: 'bot-'+Date.now(), role: 'som', text: data.text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    } catch (e) {
      setMessages([...newHistory, { id: 'err', role: 'som', text: "Sorry, I'm having trouble connecting right now.", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([messages[0]]); // keep welcome message
  };

  return (
    <div className="h-full flex flex-col items-center">
      <div className="w-full max-w-4xl h-full flex flex-col glass-card">
        <header className="p-6 border-b border-white/5 flex flex-col gap-4 shrink-0 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F378B] to-pink-500 flex items-center justify-center p-0.5">
                <div className="w-full h-full bg-[#0D0D14] rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-pink-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Som Assistant</h2>
                <p className="text-xs text-white/50 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/> Online</p>
              </div>
            </div>
            <button onClick={clearChat} className="text-sm text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/5 bg-white/5">Clear chat</button>
          </div>
          
          <div className="flex gap-2.5 overflow-x-auto custom-scrollbar pb-1">
            {PERSONAS.map(p => (
               <button 
                 key={p} 
                 onClick={() => setPersona(p)}
                 className={clsx(
                    "text-xs px-3.5 py-1.5 rounded-full border transition-colors whitespace-nowrap font-medium", 
                    persona === p 
                       ? "bg-purple-500/20 border-purple-500/30 text-purple-300" 
                       : "bg-white/5 border-white/10 text-white/50 hover:text-white/80"
                 )}
               >
                 {p} mode
               </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className={clsx("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={clsx("flex gap-4 max-w-[80%]", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center border border-white/10 mt-1">
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white/70" /> : <Bot className="w-4 h-4 text-pink-400" />}
                </div>
                <div>
                  <div className={clsx("p-4 rounded-2xl border backdrop-blur-md whitespace-pre-wrap leading-relaxed", 
                    msg.role === 'user' ? "bg-purple-500/20 border-purple-500/30 text-white rounded-tr-sm" : "bg-white/5 border-white/10 text-white/90 rounded-tl-sm"
                  )}>
                    {msg.text}
                  </div>
                  <div className={clsx("text-xs text-white/40 mt-1.5 px-2", msg.role === 'user' ? "text-right" : "text-left")}>
                    {msg.time}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex w-full justify-start">
               <div className="flex gap-4 max-w-[80%] flex-row">
                 <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center border border-white/10 mt-1">
                   <Bot className="w-4 h-4 text-pink-400" />
                 </div>
                 <div className="p-4 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 flex gap-1.5 items-center h-[52px]">
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{animationDelay: '0ms'}}/>
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{animationDelay: '150ms'}}/>
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{animationDelay: '300ms'}}/>
                 </div>
               </div>
             </div>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/5 shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Som about campus, schedule, or anything..."
              className="w-full bg-[#0D0D14] border border-white/10 rounded-full py-4 pl-6 pr-14 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-inner"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping || !input.trim()}
              className="absolute right-2 p-2.5 bg-[#4F378B] hover:bg-[#6043A8] active:scale-95 transition-all text-white rounded-full disabled:opacity-50 disabled:active:scale-100"
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
