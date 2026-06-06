import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Briefcase, 
  Search, 
  ExternalLink, 
  MapPin, 
  DollarSign, 
  Building2, 
  Calendar, 
  Bookmark, 
  BookmarkCheck, 
  Plus, 
  X, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Globe, 
  Trash2, 
  Send,
  Sparkles
} from "lucide-react";
import clsx from "clsx";

interface Internship {
  id: string;
  role: string;
  company: string;
  location: string;
  stipend: string;
  duration: string;
  tags: string[];
  url: string;
  type: "Summer 2026" | "Fall 2026" | "Co-op" | "Winter 2026";
  category: "Software" | "Data & AI" | "Product" | "Design" | "Other";
  isCurated: boolean;
}

interface UserApplication {
  id: string;
  role: string;
  company: string;
  location: string;
  stipend?: string;
  status: "Wishlist" | "Applied" | "Interview" | "Offer" | "Rejected";
  notes?: string;
  dateApplied?: string;
  link?: string;
}

const curatedInternships: Internship[] = [
  {
    id: "intern-1",
    role: "Software Engineering Intern",
    company: "Google",
    location: "Mountain View, CA (Hybrid)",
    stipend: "$45 - $60 / hr",
    duration: "12 weeks",
    tags: ["React", "TypeScript", "C++", "Python"],
    url: "https://careers.google.com/students/",
    type: "Summer 2026",
    category: "Software",
    isCurated: true
  },
  {
    id: "intern-2",
    role: "Frontend Engineering Intern",
    company: "Stripe",
    location: "South San Francisco, CA",
    stipend: "$50 - $65 / hr",
    duration: "12-16 weeks",
    tags: ["React", "Ruby", "TypeScript", "Design Systems"],
    url: "https://stripe.com/jobs/students",
    type: "Summer 2026",
    category: "Software",
    isCurated: true
  },
  {
    id: "intern-3",
    role: "AI Research & Development Intern",
    company: "Meta",
    location: "Seattle, WA (On-site)",
    stipend: "$55 - $75 / hr",
    duration: "12 weeks",
    tags: ["PyTorch", "Python", "LLMs", "Generative AI"],
    url: "https://www.metacareers.com/students/",
    type: "Summer 2026",
    category: "Data & AI",
    isCurated: true
  },
  {
    id: "intern-4",
    role: "Associate Product Manager Intern",
    company: "Salesforce",
    location: "San Francisco, CA",
    stipend: "$40 - $55 / hr",
    duration: "10 weeks",
    tags: ["Agile", "Analytics", "Roadmapping", "SQL"],
    url: "https://www.salesforce.com/company/careers/students/",
    type: "Summer 2026",
    category: "Product",
    isCurated: true
  },
  {
    id: "intern-5",
    role: "UX/UI Design Intern",
    company: "Apple",
    location: "Cupertino, CA",
    stipend: "$38 - $50 / hr",
    duration: "14 weeks",
    tags: ["Figma", "Prototyping", "User Research", "Visual Design"],
    url: "https://www.apple.com/careers/us/students.html",
    type: "Summer 2026",
    category: "Design",
    isCurated: true
  },
  {
    id: "intern-6",
    role: "Data Science Intern",
    company: "Netflix",
    location: "Los Angeles, CA",
    stipend: "$50 - $70 / hr",
    duration: "12 weeks",
    tags: ["SQL", "Python", "Tableau", "A/B Testing"],
    url: "https://jobs.netflix.com/",
    type: "Summer 2026",
    category: "Data & AI",
    isCurated: true
  },
  {
    id: "intern-7",
    role: "Software Engineering Intern (Cloud)",
    company: "Microsoft",
    location: "Redmond, WA (Hybrid)",
    stipend: "$42 - $58 / hr",
    duration: "12 weeks",
    tags: ["C#", "Azure", "Cloud Native", "Kubernetes"],
    url: "https://careers.microsoft.com/us/en/students-and-graduates",
    type: "Summer 2026",
    category: "Software",
    isCurated: true
  },
  {
    id: "intern-8",
    role: "Product Management Intern",
    company: "Uber",
    location: "San Francisco, CA",
    stipend: "$45 - $58 / hr",
    duration: "12 weeks",
    tags: ["Growth", "Operations", "Product Strategy"],
    url: "https://www.uber.com/careers/list/?campus=true",
    type: "Summer 2026",
    category: "Product",
    isCurated: true
  }
];

const externalResources = [
  { name: "Simplify.jobs", url: "https://simplify.jobs", desc: "One-click application autocomplete and real-time lists." },
  { name: "LinkedIn Student", url: "https://linkedin.com", desc: "Search with filter 'Internship' and set alerts for 2026 roles." },
  { name: "GitHub Summer Internships List", url: "https://github.com/SimplifyJobs/Summer2026-Internships", desc: "The ultimate community-led list of high paying Tech & US internships." },
  { name: "Handshake", url: "https://joinhandshake.com", desc: "Direct recruitment portal approved and powered by universities." },
  { name: "Levels.fyi", url: "https://levels.fyi/internships", desc: "Compare stipend rates, housing bonuses, and check who is hiring." }
];

export function CareerHubView() {
  const [internships, setInternships] = useState<Internship[]>(curatedInternships);
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Software" | "Data & AI" | "Product" | "Design">("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"explore" | "tracker" | "links">("explore");

  // Add Custom Application Form State
  const [newRole, setNewRole] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStipend, setNewStipend] = useState("");
  const [newStatus, setNewStatus] = useState<"Wishlist" | "Applied" | "Interview" | "Offer" | "Rejected">("Wishlist");
  const [newNotes, setNewNotes] = useState("");
  const [newLink, setNewLink] = useState("");

  useEffect(() => {
    const savedApps = localStorage.getItem("careerTrackerApps");
    if (savedApps) {
      setApplications(JSON.parse(savedApps));
    } else {
      const defaultApps: UserApplication[] = [
        {
          id: "app-1",
          role: "Software Engineering Intern",
          company: "Google",
          location: "Mountain View, CA",
          stipend: "$52 / hr",
          status: "Applied",
          dateApplied: format(new Date(), "yyyy-MM-dd"),
          link: "https://careers.google.com/students/",
          notes: "Applied with technical resume. Recruiter reached out, waiting for OA."
        },
        {
          id: "app-2",
          role: "UX Design Fellow",
          company: "Adobe",
          location: "San Jose, CA",
          status: "Interview",
          dateApplied: format(Date.now() - 5 * 86400000, "yyyy-MM-dd"),
          stipend: "$45 / hr",
          notes: "Portfolio review scheduled for June 12."
        }
      ];
      setApplications(defaultApps);
      localStorage.setItem("careerTrackerApps", JSON.stringify(defaultApps));
    }
  }, []);

  const saveApplications = (newApps: UserApplication[]) => {
    setApplications(newApps);
    localStorage.setItem("careerTrackerApps", JSON.stringify(newApps));
  };

  const handleAddApplicationFromCurated = (intern: Internship) => {
    const exists = applications.some(app => app.company.toLowerCase() === intern.company.toLowerCase() && app.role.toLowerCase() === intern.role.toLowerCase());
    if (exists) {
      alert("You are already tracking an application for this role!");
      return;
    }

    const newApp: UserApplication = {
      id: `app-${Date.now()}`,
      role: intern.role,
      company: intern.company,
      location: intern.location,
      stipend: intern.stipend,
      status: "Wishlist",
      dateApplied: format(new Date(), "yyyy-MM-dd"),
      link: intern.url,
      notes: "Saved from curated internships list inside Career Hub."
    };

    saveApplications([...applications, newApp]);
    setActiveSubTab("tracker");
  };

  const handleCreateCustomApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole || !newCompany) return;

    const newApp: UserApplication = {
      id: `app-${Date.now()}`,
      role: newRole,
      company: newCompany,
      location: newLocation,
      stipend: newStipend,
      status: newStatus,
      dateApplied: newStatus === "Wishlist" ? undefined : format(new Date(), "yyyy-MM-dd"),
      notes: newNotes,
      link: newLink
    };

    saveApplications([newApp, ...applications]);
    setShowAddModal(false);
    resetForm();
    setActiveSubTab("tracker");
  };

  const resetForm = () => {
    setNewRole("");
    setNewCompany("");
    setNewLocation("");
    setNewStipend("");
    setNewStatus("Wishlist");
    setNewNotes("");
    setNewLink("");
  };

  const handleDeleteApplication = (id: string) => {
    const updated = applications.filter(app => app.id !== id);
    saveApplications(updated);
  };

  const handleStatusChange = (id: string, newStats: "Wishlist" | "Applied" | "Interview" | "Offer" | "Rejected") => {
    const updated = applications.map(app => {
      if (app.id === id) {
        return {
          ...app,
          status: newStats,
          dateApplied: app.dateApplied || (newStats === "Applied" ? format(new Date(), "yyyy-MM-dd") : undefined)
        };
      }
      return app;
    });
    saveApplications(updated);
  };

  // Filters logic
  const filteredCurated = internships.filter(intern => {
    const matchesSearch = intern.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          intern.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          intern.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "All" || intern.category === categoryFilter;
    const matchesType = typeFilter === "All" || intern.type === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="flex bg-[#09090e] h-full text-white overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full max-w-6xl mx-auto w-full">
        {/* Top Header Section */}
        <div className="p-6 md:p-10 shrink-0 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <Briefcase className="w-8 h-8 text-pink-500" />
                Career Hub
              </h1>
              <p className="text-gray-400">Discover handpicked high-paying internships, search open positions, and track applications.</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Add Application Tracker
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-white/5 gap-2 scrollbar-none overflow-x-auto">
            <button 
              onClick={() => setActiveSubTab("explore")}
              className={clsx("px-5 py-3 text-sm font-semibold border-b-2 transition-all shrink-0", activeSubTab === "explore" ? "border-pink-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
            >
              Explore Curated Internships
            </button>
            <button 
              onClick={() => setActiveSubTab("tracker")}
              className={clsx("px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0", activeSubTab === "tracker" ? "border-pink-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
            >
              Applications Pipeline
              {applications.length > 0 && (
                <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{applications.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveSubTab("links")}
              className={clsx("px-5 py-3 text-sm font-semibold border-b-2 transition-all shrink-0", activeSubTab === "links" ? "border-pink-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
            >
              Essential Job Boards & Tools
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          {activeSubTab === "explore" && (
            <div className="space-y-6">
              {/* Search & Filters block */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 hide-scrollbar scrollbar-none shrink-0">
                  <button 
                    onClick={() => setCategoryFilter("All")}
                    className={clsx("px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border", categoryFilter === "All" ? "bg-white text-black border-transparent" : "bg-[#1A1A24] text-gray-400 hover:text-white border-white/5")}
                  >
                    All Categories
                  </button>
                  <button 
                    onClick={() => setCategoryFilter("Software")}
                    className={clsx("px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border", categoryFilter === "Software" ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-[#1A1A24] text-gray-400 hover:text-white border-white/5")}
                  >
                    Software Engineering
                  </button>
                  <button 
                    onClick={() => setCategoryFilter("Data & AI")}
                    className={clsx("px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border", categoryFilter === "Data & AI" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-[#1A1A24] text-gray-400 hover:text-white border-white/5")}
                  >
                    Data Science & AI
                  </button>
                  <button 
                    onClick={() => setCategoryFilter("Product")}
                    className={clsx("px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border", categoryFilter === "Product" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-[#1A1A24] text-gray-400 hover:text-white border-white/5")}
                  >
                    Product Management
                  </button>
                  <button 
                    onClick={() => setCategoryFilter("Design")}
                    className={clsx("px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border", categoryFilter === "Design" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-[#1A1A24] text-gray-400 hover:text-white border-white/5")}
                  >
                    Design & UX
                  </button>
                </div>

                <div className="relative w-full md:w-72 shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search roles, skills, company..."
                    className="w-full bg-[#1A1A24] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-colors placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Roles listing */}
              {filteredCurated.length === 0 ? (
                <div className="text-center py-20 bg-[#1A1A24]/30 border border-white/5 rounded-3xl">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-medium text-white mb-2">No internships found</h3>
                  <p className="text-gray-400 text-sm">Try adjusting your filters or search keywords.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  {filteredCurated.map(intern => (
                    <div key={intern.id} className="relative group bg-[#1A1A24] border border-white/5 hover:border-pink-500/20 hover:bg-[#1f1f2e] rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between">
                      <div>
                        {/* Header level */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-indigo-600 p-0.5 flex items-center justify-center font-bold text-white tracking-widest text-lg">
                              {intern.company.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-white group-hover:text-pink-400 transition-colors">{intern.role}</h3>
                              <span className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                {intern.company}
                              </span>
                            </div>
                          </div>
                          
                          <span className="text-xs bg-white/5 font-medium px-2.5 py-1 rounded-full text-gray-300 whitespace-nowrap">
                            {intern.type}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-300 truncate">{intern.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-400 font-semibold">{intern.stipend}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-300">{intern.duration}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Sparkles className="w-4 h-4 text-pink-500" />
                            <span className="text-pink-400 font-medium">Verified Curated</span>
                          </div>
                        </div>

                        {/* Technology Skills */}
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {intern.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-pink-500/10 text-pink-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Application Buttons CTA */}
                      <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => handleAddApplicationFromCurated(intern)}
                          className="flex-1 py-2 bg-pink-500/15 group-hover:bg-pink-500/20 text-pink-400 hover:text-white rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer border border-pink-500/20"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          Track to My Pipeline
                        </button>
                        
                        <a 
                          href={intern.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-semibold text-xs flex items-center justify-center gap-1 border border-white/5"
                        >
                          Official Posting
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === "tracker" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Applications summary boxes */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(["Wishlist", "Applied", "Interview", "Offer", "Rejected"] as const).map(st => {
                  let badgeColor = "bg-gray-500/10 text-gray-400";
                  if (st === "Applied") badgeColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                  if (st === "Interview") badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  if (st === "Offer") badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  if (st === "Rejected") badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";

                  const count = applications.filter(app => app.status === st).length;

                  return (
                    <div key={st} className="bg-[#1A1A24] border border-white/5 p-4 rounded-2xl flex flex-col justify-between min-h-[90px]">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{st}</span>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-2xl font-bold text-white">{count}</span>
                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", badgeColor)}>
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CRM Applications List Table */}
              <div className="bg-[#1A1A24] border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white">Tracking List</h3>
                  <span className="text-xs text-gray-400">Change statuses or click bin to delete logs.</span>
                </div>

                {applications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock className="w-10 h-10 mx-auto text-gray-600 mb-3" />
                    <h4 className="font-bold text-white mb-1">Pipeline is empty</h4>
                    <p className="text-sm text-gray-400 mb-4">You are not tracking any internship applications currently.</p>
                    <button 
                      onClick={() => setActiveSubTab("explore")}
                      className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-semibold cursor-pointer"
                    >
                      Browse Curated Internships
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-widest bg-[#14141e]/50">
                          <th className="p-4 pl-6">Company / Role</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Stipend</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Notes</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map(app => (
                          <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors align-top text-sm">
                            <td className="p-4 pl-6">
                              <div className="font-bold text-white">{app.role}</div>
                              <div className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                                {app.company}
                                {app.link && (
                                  <a href={app.link} target="_blank" rel="noreferrer" className="text-pink-500 hover:underline inline-flex items-center gap-0.5">
                                    <ExternalLink className="w-3 w-3" />
                                  </a>
                                )}
                              </div>
                              {app.dateApplied && (
                                <div className="text-[10px] text-gray-500 mt-1">Date: {app.dateApplied}</div>
                              )}
                            </td>
                            
                            <td className="p-4 text-gray-300">
                              <div className="max-w-[120px] truncate">{app.location || "N/A"}</div>
                            </td>

                            <td className="p-4">
                              <span className="text-emerald-400 font-semibold">{app.stipend || "Any Rate"}</span>
                            </td>

                            <td className="p-4">
                              <select 
                                value={app.status}
                                onChange={e => handleStatusChange(app.id, e.target.value as any)}
                                className={clsx(
                                  "bg-[#09090e] border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none appearance-none cursor-pointer pr-6 relative block",
                                  app.status === "Wishlist" && "text-gray-400 border-white/10",
                                  app.status === "Applied" && "text-blue-400 border-blue-500/20 bg-blue-500/5",
                                  app.status === "Interview" && "text-amber-400 border-amber-500/20 bg-amber-500/5",
                                  app.status === "Offer" && "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
                                  app.status === "Rejected" && "text-rose-400 border-rose-500/20 bg-rose-500/5"
                                )}
                              >
                                <option value="Wishlist">Wishlist</option>
                                <option value="Applied">Applied</option>
                                <option value="Interview">Interview</option>
                                <option value="Offer">Offer</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </td>

                            <td className="p-4 text-xs text-gray-400 max-w-xs">
                              {app.notes ? (
                                <p className="line-clamp-2">{app.notes}</p>
                              ) : (
                                <span className="text-gray-600">No notes written</span>
                              )}
                            </td>

                            <td className="p-4 pr-6 text-right">
                              <button 
                                onClick={() => handleDeleteApplication(app.id)}
                                className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                                title="Delete application log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "links" && (
            <div className="space-y-6 max-w-4xl animate-fadeIn">
              <h3 className="text-lg font-bold">Key Job Boards for College Students</h3>
              <p className="text-gray-400 text-sm">Bookmark and check these daily to stay ahead of the application deadlines of late Summer and Fall recruiting cycles.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {externalResources.map(resource => (
                  <a 
                    key={resource.name}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-5 bg-[#1A1A24] border border-white/5 hover:border-pink-500/20 rounded-2xl transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white group-hover:text-pink-400 transition-colors">{resource.name}</h4>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{resource.desc}</p>
                    </div>
                    <span className="text-[10px] text-pink-500 mt-4 font-bold tracking-wide uppercase inline-flex items-center gap-1 group-hover:underline">
                      Launch job webpage <Globe className="w-3 h-3" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Application Tracking Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A24] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#09090e]/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-pink-400" />
                Track an Application
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomApplication} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company *</label>
                <input 
                  type="text" 
                  required
                  value={newCompany}
                  onChange={e => setNewCompany(e.target.value)}
                  placeholder="e.g. Netflix, Stripe, Local Startup"
                  className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Role Title *</label>
                <input 
                  type="text" 
                  required
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="e.g. Backend Engineering Intern"
                  className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</label>
                  <input 
                    type="text" 
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    placeholder="e.g. Remote, SF, NY"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stipend Rate</label>
                  <input 
                    type="text" 
                    value={newStipend}
                    onChange={e => setNewStipend(e.target.value)}
                    placeholder="e.g. $45 / hr"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
                  <select 
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 appearance-none"
                  >
                    <option value="Wishlist">Wishlist</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Job Link</label>
                  <input 
                    type="url" 
                    value={newLink}
                    onChange={e => setNewLink(e.target.value)}
                    placeholder="https://company.careers"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
                <textarea 
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Insert OA links, interview calendar timings, or referral information..."
                  rows={3}
                  className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none animate-fadeIn"
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3 bg-[#09090e]/50 -mx-6 -mb-6 p-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] cursor-pointer"
                >
                  Add to Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
