import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Clock, 
  History, 
  Edit3, 
  Search, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Save, 
  LogIn, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  BookOpen
} from "lucide-react";
import clsx from "clsx";
import { initAuth, googleSignIn, getAccessToken } from "../firebase";
import { useToast } from "../ToastContext";
import type { User } from "firebase/auth";

interface TimelineEvent {
  id: string;
  time: string;
  user: string;
  type: "fetch" | "edit" | "create" | "error";
  message: string;
}

export function DocumentEditorView() {
  const { showToast } = useToast();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Docs management
  const [docsList, setDocsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListLoading, setIsListLoading] = useState(false);
  
  // Selected Doc State
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [docTitle, setDocTitle] = useState<string>("");
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rawDocObj, setRawDocObj] = useState<any | null>(null);

  // New Doc Inline Form
  const [newDocTitle, setNewDocTitle] = useState("");
  const [isCreatingDev, setIsCreatingDev] = useState(false);

  // Activity logs/timeline
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    { id: "1", time: "System", user: "SomSphere", type: "fetch", message: "Google Drive and Docs Workspace loaded successfully." }
  ]);

  // Auth checker
  useEffect(() => {
    const unsub = initAuth(
      (u, token) => {
        setUser(u);
        setNeedsAuth(false);
        // Automatically fetch recent Google docs once authenticated
        fetchGoogleDocs(token);
        
        // Auto load document if redirected from a creation flow
        const autoLoadId = localStorage.getItem("auto_load_doc_id");
        const autoLoadTitle = localStorage.getItem("auto_load_doc_title");
        if (autoLoadId && autoLoadTitle) {
          localStorage.removeItem("auto_load_doc_id");
          localStorage.removeItem("auto_load_doc_title");
          loadDocument({ id: autoLoadId, name: autoLoadTitle });
        }
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  const addTimelineEvent = (type: "fetch" | "edit" | "create" | "error", message: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTimeline(prev => [
      {
        id: Date.now().toString(),
        time: timeStr,
        user: user?.displayName || "You",
        type,
        message
      },
      ...prev
    ]);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        showToast("Connected to Google Account!", "success");
        addTimelineEvent("create", "Logged into Google Account.");
        fetchGoogleDocs(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      showToast("Google authorization failed", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Searching/fetching Google Docs from Drive API
  const fetchGoogleDocs = async (tokenOverride?: string) => {
    setIsListLoading(true);
    try {
      const token = tokenOverride || await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsListLoading(false);
        return;
      }

      // Query for file type Google Doc inside active files
      const q = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=25`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setNeedsAuth(true);
        }
        throw new Error(`Drive response: ${res.status}`);
      }

      const data = await res.json();
      setDocsList(data.files || []);
      addTimelineEvent("fetch", `Retrieved ${data.files?.length || 0} Google Documents from your Drive.`);
    } catch (err: any) {
      console.error("Error fetching Google Docs:", err);
      showToast("Could not retrieve documents list", "error");
    } finally {
      setIsListLoading(false);
    }
  };

  // Utility to extract text from Google Docs JSON body
  const extractText = (docObj: any): string => {
    if (!docObj || !docObj.body || !docObj.body.content) return '';
    let text = '';
    for (const item of docObj.body.content) {
      if (item.paragraph?.elements) {
        for (const element of item.paragraph.elements) {
          if (element.textRun?.content) {
            text += element.textRun.content;
          }
        }
      }
    }
    return text;
  };

  // Loads active selected document
  const loadDocument = async (docFile: any) => {
    setIsContentLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }

      const res = await fetch(`https://docs.googleapis.com/v1/documents/${docFile.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load Google Doc: ${res.status}`);
      }

      const docObj = await res.json();
      setRawDocObj(docObj);
      setSelectedDoc(docFile);
      setDocTitle(docObj.title || docFile.name);
      
      const extracted = extractText(docObj);
      setDocContent(extracted);
      
      addTimelineEvent("fetch", `Loaded document: "${docObj.title}"`);
      showToast(`Loaded: ${docObj.title}`, "success");
    } catch (err: any) {
      console.error("Could not load Google Doc:", err);
      showToast("Failed to load Google Doc", "error");
      addTimelineEvent("error", `Failed while loading document with ID: ${docFile.id}`);
    } finally {
      setIsContentLoading(false);
    }
  };

  // Save changes to Google Doc
  const saveDocument = async () => {
    if (!selectedDoc) return;
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsSaving(false);
        return;
      }

      // To update a Google Doc text, we clear current text matching body length, option to insert
      const lastElement = rawDocObj?.body?.content?.[rawDocObj.body.content.length - 1];
      const bodyLength = lastElement ? lastElement.endIndex : 0;

      const requests: any[] = [];
      
      // Delete old contents (anything from index 1 to bodyLength - 1)
      if (bodyLength > 2) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: bodyLength - 1
            }
          }
        });
      }

      // Insert new contents
      if (docContent) {
        requests.push({
          insertText: {
            text: docContent,
            location: {
              index: 1
            }
          }
        });
      }

      const res = await fetch(`https://docs.googleapis.com/v1/documents/${selectedDoc.id}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requests })
      });

      if (!res.ok) {
        throw new Error(`Fail save batchUpdate: ${res.status}`);
      }

      // Re-fetch the newly updated doc schema
      const freshRes = await fetch(`https://docs.googleapis.com/v1/documents/${selectedDoc.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (freshRes.ok) {
        const docObj = await freshRes.json();
        setRawDocObj(docObj);
        setDocContent(extractText(docObj));
      }

      showToast("Changes synced successfully to Google Cloud!", "success");
      addTimelineEvent("edit", `Synced changes for: "${docTitle}"`);
    } catch (err: any) {
      console.error("Save failed:", err);
      showToast("Could not save to Google Doc", "error");
      addTimelineEvent("error", `Failed to save changes for: "${docTitle}"`);
    } finally {
      setIsSaving(false);
    }
  };

  // Creates a brand new document in Google Drive
  const createNewGoogleDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    setIsCreatingDev(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsCreatingDev(false);
        return;
      }

      const res = await fetch(`https://docs.googleapis.com/v1/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: newDocTitle.trim() })
      });

      if (!res.ok) {
        throw new Error(`Could not create doc: ${res.status}`);
      }

      const newDoc = await res.json();
      showToast(`Created document: ${newDocTitle}`, "success");
      setNewDocTitle("");
      addTimelineEvent("create", `Created Google Doc: "${newDoc.title}"`);

      // Refresh list to show newly created file, and load it
      await fetchGoogleDocs(token);
      
      const filePayload = {
        id: newDoc.documentId,
        name: newDoc.title,
        modifiedTime: new Date().toISOString()
      };
      
      await loadDocument(filePayload);
    } catch (err: any) {
      console.error("Doc creation error:", err);
      showToast("Failed to create document", "error");
      addTimelineEvent("error", `Failed checking/creating document: ${newDocTitle}`);
    } finally {
      setIsCreatingDev(false);
    }
  };

  const filteredDocs = docsList.filter(doc => 
    doc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      {/* Sidebar: Browser & Search */}
      <div className="w-80 glass-card shrink-0 flex flex-col overflow-hidden">
        <header className="p-5 border-b border-white/5 flex flex-col gap-4 shrink-0 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> Google Docs
            </h3>
            {user && (
              <button 
                onClick={() => fetchGoogleDocs()} 
                disabled={isListLoading}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh Documents List"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", isListLoading && "animate-spin")} />
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0D14]/80 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {/* Inline Create Document */}
          {user && (
            <form onSubmit={createNewGoogleDoc} className="flex gap-2">
              <input
                type="text"
                placeholder="New Doc title..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="flex-1 bg-[#0D0D14]/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40"
              />
              <button
                type="submit"
                disabled={isCreatingDev || !newDocTitle.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 p-2 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
                title="Create Google Doc"
              >
                {isCreatingDev ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}
        </header>

        {/* Docs List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {needsAuth ? (
            <div className="py-12 px-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3 opacity-60" />
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Unlock real-time editing & syncing of Google Docs from your Drive account.
              </p>
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    Connect Google Drive
                  </>
                )}
              </button>
            </div>
          ) : isListLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="text-xs text-gray-500">Scanning Google Drive...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No matching Google Docs found.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => loadDocument(doc)}
                  className={clsx(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group",
                    isSelected 
                      ? "bg-blue-500/10 border-blue-500/30 text-white" 
                      : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <FileText className={clsx(
                    "w-4 h-4 shrink-0 mt-0.5 transition-colors",
                    isSelected ? "text-blue-400" : "text-gray-500 group-hover:text-blue-300"
                  )} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-snug">{doc.name}</p>
                    <p className="text-[9px] text-gray-500 mt-1">
                      Edited {new Date(doc.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        {selectedDoc ? (
          <>
            <header className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30 shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate leading-tight">
                    {docTitle}
                  </h2>
                  <p className="text-[10px] text-blue-300 flex items-center gap-1.5 mt-1">
                    <span className="font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Google Doc</span>
                    <span>•</span>
                    <span className="opacity-80">Synced with Google API</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Save and Sync button */}
                <button
                  onClick={saveDocument}
                  disabled={isSaving || isContentLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 border border-white/10"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {isSaving ? "Syncing..." : "Sync to Google Cloud"}
                </button>

                {/* External link back to official Google Docs */}
                <a
                  href={`https://docs.google.com/document/d/${selectedDoc.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/10"
                  title="Open in Google Docs Web"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </header>

            {/* Document Editor Page/Card */}
            <div className="flex-1 bg-white p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
              <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/5 to-transparent pointer-events-none" />
              
              {isContentLoading ? (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="text-xs font-semibold text-gray-500">Retrieving paragraph structure from Google Docs...</span>
                </div>
              ) : null}

              <div className="max-w-3xl mx-auto h-full flex flex-col">
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  disabled // Disabled by API rules as direct rename requires a separate Drive metadata patch call
                  className="text-3xl font-serif text-gray-900 border-b border-gray-100 pb-3 mb-6 focus:outline-none bg-transparent w-full"
                />
                
                <textarea
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Start typing your study notes, essay, or comments here. Everything formats securely to the Google Docs document."
                  className="flex-1 w-full font-serif text-base leading-relaxed text-gray-800 placeholder-gray-400 focus:outline-none resize-none bg-transparent min-h-[400px] pb-10"
                />
              </div>
            </div>
          </>
        ) : (
          /* Empty Workspace Welcome Panel */
          <div className="flex-1 p-8 text-center flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent blur-3xl rounded-full translate-y-12 pointer-events-none" />
            <div className="p-5 bg-blue-600/10 rounded-[28px] border border-blue-500/20 mb-6 shrink-0 relative">
               <FileText className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 leading-tight">Your Google Docs Hub</h3>
            <p className="text-xs text-gray-400 max-w-sm mb-6 leading-relaxed">
              Import course notes, homework, outlines, and exams directly from Google Docs. Edit them right in your dashboard and keep everything perfectly synced.
            </p>
            {needsAuth ? (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 shadow-md rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                {isLoggingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                Connect Google Workspace
              </button>
            ) : (
              <p className="text-xs text-blue-400 font-semibold bg-blue-500/10 px-3.5 py-2 rounded-full border border-blue-500/20">
                ← Select a document or create a new one to begin editing!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Activity Logs Sidebar */}
      <div className="w-80 glass-card shrink-0 flex flex-col overflow-hidden">
        <header className="p-5 border-b border-white/5 flex items-center gap-3 shrink-0 bg-white/[0.02]">
          <div className="p-2 bg-[#0D0D14] border border-white/10 rounded-lg">
            <History className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest leading-none">Docs Activity Timeline</h3>
        </header>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar relative">
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1rem] before:h-full before:w-px before:bg-white/5">
            {timeline.map((event) => (
              <div key={event.id} className="relative pl-7 group flex flex-col gap-1.5">
                <div className={clsx(
                  "absolute left-2.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-[#0D0D14] ring-1 transition-all z-10",
                  event.type === "error" ? "bg-red-500 ring-red-500/20" :
                  event.type === "edit" ? "bg-blue-500 ring-blue-500/20" :
                  event.type === "create" ? "bg-emerald-500 ring-emerald-500/20" :
                  "bg-gray-500 ring-white/10"
                )} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 tracking-wider font-bold">{event.time}</span>
                  <span className="text-[9px] text-[#0D0D14] bg-white/10 px-1 rounded font-bold group-hover:bg-white/20 transition-colors uppercase select-none">{event.user}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {event.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
