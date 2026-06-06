import React, { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Trophy, Globe, MapPin, Calendar, ExternalLink, CalendarDays, Code2, Heart, Search } from "lucide-react";
import clsx from "clsx";

interface Hackathon {
  id: string;
  name: string;
  organization: string;
  url: string;
  startDate: string;
  endDate: string;
  location: string;
  prizePool: string;
  logo: string;
  tags: string[];
  status: "active" | "upcoming" | "ended";
}

const mockHackathons: Hackathon[] = [
  {
    id: "hack-1",
    name: "Global GenAI Hackathon 2026",
    organization: "Google Cloud",
    url: "https://cloud.google.com/hackathons",
    startDate: "2026-06-15T00:00:00Z",
    endDate: "2026-06-25T00:00:00Z",
    location: "Online",
    prizePool: "$50,000",
    logo: "https://images.unsplash.com/photo-1633410189548-430c640e0600?w=100&q=80",
    tags: ["AI/ML", "Cloud", "Gemini"],
    status: "upcoming"
  },
  {
    id: "hack-2",
    name: "Web3 Scholars Summer Hack",
    organization: "Ethereum Foundation",
    url: "https://ethereum.org",
    startDate: "2026-06-01T00:00:00Z",
    endDate: "2026-06-30T00:00:00Z",
    location: "Online & Berlin",
    prizePool: "$100,000",
    logo: "https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=100&q=80",
    tags: ["Blockchain", "Web3", "Smart Contracts"],
    status: "active"
  },
  {
    id: "hack-3",
    name: "HealthTech Innovators",
    organization: "Devpost",
    url: "https://devpost.com",
    startDate: "2026-06-05T00:00:00Z",
    endDate: "2026-06-07T00:00:00Z",
    location: "San Francisco, CA",
    prizePool: "$25,000",
    logo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&q=80",
    tags: ["Health", "Mobile", "Open Source"],
    status: "active"
  },
  {
    id: "hack-4",
    name: "Fintech Startup Weekend",
    organization: "Stripe & Plaid",
    url: "https://stripe.com",
    startDate: "2026-07-10T00:00:00Z",
    endDate: "2026-07-12T00:00:00Z",
    location: "Online",
    prizePool: "$30,000",
    logo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&q=80",
    tags: ["Fintech", "Payments", "SaaS"],
    status: "upcoming"
  },
  {
    id: "hack-5",
    name: "EduHacks 2026",
    organization: "Major League Hacking (MLH)",
    url: "https://mlh.io",
    startDate: "2026-05-15T00:00:00Z",
    endDate: "2026-05-17T00:00:00Z",
    location: "New York, NY",
    prizePool: "$15,000",
    logo: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=100&q=80",
    tags: ["Education", "Student", "Beginner Friendly"],
    status: "ended"
  }
];

export function HackathonsView() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "upcoming">("all");

  useEffect(() => {
    // Simulate fetching from internet
    const fetchHackathons = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setHackathons(mockHackathons);
      setIsLoading(false);
    };

    fetchHackathons();
  }, []);

  const filteredHackathons = hackathons.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          h.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "active") return matchesSearch && h.status === "active";
    if (activeTab === "upcoming") return matchesSearch && h.status === "upcoming";
    return matchesSearch;
  });

  return (
    <div className="flex bg-[#09090e] h-full text-white overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full max-w-6xl mx-auto w-full">
        <div className="p-6 md:p-10 shrink-0">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Hackathons</h1>
            <a 
              href="https://devpost.com" 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg border border-white/10 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              More on Devpost
            </a>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-2 p-1 bg-[#1A1A24] rounded-xl border border-white/5 shrink-0">
              <button 
                onClick={() => setActiveTab("all")}
                className={clsx("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === "all" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200")}
              >
                All Events
              </button>
              <button 
                onClick={() => setActiveTab("active")}
                className={clsx("px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2", activeTab === "active" ? "bg-emerald-500/20 text-emerald-400" : "text-gray-400 hover:text-gray-200")}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </button>
              <button 
                onClick={() => setActiveTab("upcoming")}
                className={clsx("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === "upcoming" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-gray-200")}
              >
                Upcoming
              </button>
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search hackathons, tags..."
                className="w-full bg-[#1A1A24] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-20 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 rounded-full border-2 border-white/20 border-t-pink-500" />
            </div>
          ) : filteredHackathons.length === 0 ? (
            <div className="text-center py-20 bg-[#1A1A24]/50 border border-white/5 rounded-2xl">
              <Code2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-medium text-white mb-2">No hackathons found</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredHackathons.map(hackathon => (
                <div key={hackathon.id} className="group bg-[#1A1A24] border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all overflow-hidden relative">
                  {hackathon.status === "active" && (
                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
                  )}
                  <div className="flex items-start gap-4">
                    <img 
                      src={hackathon.logo} 
                      alt={hackathon.name} 
                      className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-base truncate group-hover:text-pink-400 transition-colors text-white">{hackathon.name}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {hackathon.status === "active" && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400">Live</span>}
                          {hackathon.status === "upcoming" && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-400">Soon</span>}
                          {hackathon.status === "ended" && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/5 text-gray-400 border border-white/5">Ended</span>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{hackathon.organization}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{format(new Date(hackathon.startDate), "MMM d")} - {format(new Date(hackathon.endDate), "MMM d, yyyy")}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-blue-400 font-medium">Ends {formatDistanceToNow(new Date(hackathon.endDate), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{hackathon.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                          <span className="font-medium text-yellow-400/90">{hackathon.prizePool}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {hackathon.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 rounded bg-white/5 text-[10px] text-gray-400 font-medium whitespace-nowrap">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                     <button className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 focus:outline-none">
                       <Heart className="w-3.5 h-3.5" /> Save
                     </button>
                     <a 
                      href={hackathon.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                     >
                       Visit Website <ExternalLink className="w-3 h-3" />
                     </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
