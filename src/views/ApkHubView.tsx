import React, { useState } from "react";
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Download, 
  Settings, 
  Globe, 
  ShieldCheck, 
  Layers, 
  Check, 
  Copy, 
  AlertCircle, 
  HelpCircle, 
  Sparkles,
  RefreshCw,
  ArrowRight,
  FileCode,
  CheckCircle,
  FileText
} from "lucide-react";
import { useToast } from "../ToastContext";

export function ApkHubView() {
  const { showToast } = useToast();
  
  // APK build manifest options
  const [appName, setAppName] = useState("SomSphere Student App");
  const [shortName, setShortName] = useState("SomSphere");
  const [packageName, setPackageName] = useState("com.somsphere.app");
  const [startUrl, setStartUrl] = useState(window.location.origin);
  const [themeColor, setThemeColor] = useState("#EC4899"); // Pink-500
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [displayMode, setDisplayMode] = useState("standalone");
  
  // State for simulated preview device type
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "laptop">("mobile");
  const [mockRoute, setMockRoute] = useState<"dashboard" | "tasks" | "pdf" | "notes">("dashboard");
  
  // Copying helper status
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedSw, setCopiedSw] = useState(false);

  const manifestJson = `{
  "name": "${appName}",
  "short_name": "${shortName}",
  "description": "SomSphere All-in-One Student Workspace & Productivity Center",
  "start_url": "${startUrl}",
  "display": "${displayMode}",
  "background_color": "#0D0D14",
  "theme_color": "${themeColor}",
  "orientation": "any",
  "categories": ["education", "productivity"],
  "icons": [
    {
      "src": "https://img.icons8.com/color/192/000000/google-planet.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "https://img.icons8.com/color/512/000000/google-planet.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}`;

  const serviceWorkerCode = `// SomSphere Progressive Web App (PWA) Offline Service Worker
const CACHE_NAME = 'somsphere-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Fallback for offline usage
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});`;

  const copyToClipboard = (text: string, type: "manifest" | "sw") => {
    navigator.clipboard.writeText(text);
    if (type === "manifest") {
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    } else {
      setCopiedSw(true);
      setTimeout(() => setCopiedSw(false), 2000);
    }
    showToast("Copied script template configuration to clipboard!", "success");
  };

  const handleDownloadZipPackage = () => {
    // Generate a file download trigger for PWA config package
    const manifestBlob = new Blob([manifestJson], { type: "application/json" });
    const swBlob = new Blob([serviceWorkerCode], { type: "application/javascript" });
    
    // We can trigger individual manifest files
    const link = document.createElement("a");
    link.href = URL.createObjectURL(manifestBlob);
    link.download = "manifest.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // SW download
    setTimeout(() => {
      const swLink = document.createElement("a");
      swLink.href = URL.createObjectURL(swBlob);
      swLink.download = "service-worker.js";
      document.body.appendChild(swLink);
      swLink.click();
      document.body.removeChild(swLink);
      showToast("Config package generated! Included 'manifest.json' and 'service-worker.js'.", "success");
    }, 400);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-pink-500 uppercase font-mono px-2.5 py-1 bg-pink-500/10 rounded-full border border-pink-500/15">
            Mobilize & Cross-Platform Portal
          </span>
          <h2 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-pink-500 animate-pulse" />
            Responsive Simulator & APK Build Hub
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Package SomSphere into a native mobile workspace. Test layouts across phone sizes, configure PWA attributes, and export production assets for immediate entry into Android APK compile pipelines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Config Panel & Sideload Guides (7/12) */}
        <div className="xl:col-span-7 space-y-6">

          {/* Quick Config Card */}
          <div className="bg-[#0E0E16]/85 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5 flex items-center gap-2">
              <Settings className="w-4 h-4 text-pink-500" />
              Android APK & PWA Branding Properties
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Launcher Application Name</label>
                <input 
                  type="text" 
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50"
                  placeholder="App Launcher Title"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Short Brand Name (Homescreen)</label>
                <input 
                  type="text" 
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50"
                  placeholder="Homescreen Label"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Android Main Package Name</label>
                <input 
                  type="text" 
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 font-mono"
                  placeholder="e.g. com.somsphere.app"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Preferred Launch Theme Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-9 bg-transparent border-0 cursor-pointer overflow-hidden p-0"
                  />
                  <input 
                    type="text" 
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/50 text-center font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Application Release Version</label>
                <input 
                  type="text" 
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">Display Shell Mode</label>
                <select 
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50"
                >
                  <option value="standalone">Standalone Container (No browser address bar)</option>
                  <option value="fullscreen">Fullscreen Immersive (Ideal for games/presentations)</option>
                  <option value="minimal-ui">Minimal UI (Saves thin navigation space)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">PWA Core Feed Start Host URL</label>
              <input 
                type="text" 
                value={startUrl}
                disabled
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-gray-500 font-mono"
              />
              <span className="text-[10px] text-gray-500 block">Autodetected environment domain host. Points the APK directly inside your secured Cloud sandbox.</span>
            </div>

            <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleDownloadZipPackage}
                className="flex-1 min-w-[200px] py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-xs font-bold uppercase tracking-wider text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-pink-500/20 active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                Download Manifest Asset Package
              </button>
            </div>
          </div>

          {/* Code Export Previews */}
          <div className="bg-[#0E0E16]/85 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-pink-500" />
              Generated Manifest & Service Worker Code Blocks
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Manifest Output */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#111119] px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-[10px] text-pink-400 font-mono font-bold">manifest.json</span>
                  <button 
                    onClick={() => copyToClipboard(manifestJson, "manifest")}
                    className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedManifest ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedManifest ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-[10px] font-mono bg-black/40 p-3 rounded-xl block h-44 overflow-y-auto custom-scrollbar text-emerald-400 leading-relaxed border border-white/5">
                  {manifestJson}
                </pre>
              </div>

              {/* Serviceworker Output */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#111119] px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-[10px] text-pink-400 font-mono font-bold">service-worker.js</span>
                  <button 
                    onClick={() => copyToClipboard(serviceWorkerCode, "sw")}
                    className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSw ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSw ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-[10px] font-mono bg-black/40 p-3 rounded-xl block h-44 overflow-y-auto custom-scrollbar text-indigo-400 leading-relaxed border border-white/5">
                  {serviceWorkerCode}
                </pre>
              </div>
            </div>
          </div>

          {/* Sideload native APK step directions */}
          <div className="bg-gradient-to-br from-[#0E0E16]/95 to-[#16111e]/90 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-pink-500 animate-pulse" />
              How to Build And Install Your APK File
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px] font-bold font-mono shrink-0 mt-0.5 border border-pink-500/25">1</span>
                <div>
                  <p className="text-xs font-bold text-white">Generate Code assets</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    Configure your packaging items above, then download the config package zip consisting of the manifest schemas and icons. Set up these assets inside the root directory of your project folder.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px] font-bold font-mono shrink-0 mt-0.5 border border-pink-500/25">2</span>
                <div>
                  <p className="text-xs font-bold text-white">Pick a Packaging Toolchain</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    You have several easy ways to generate your Android APK file:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-gray-400 mt-1 pl-1 space-y-1">
                    <li><strong className="text-pink-300">Google Bubblewrap CLI (TWA)</strong>: Best for PWAs. Simply run <code className="text-gray-100 bg-white/5 px-1 py-0.5 rounded">npx @bubblewrap/cli init --manifest=manifest.json</code> then <code className="text-gray-100 bg-white/5 px-1 py-0.5 rounded">bubblewrap build</code> to compile.</li>
                    <li><strong className="text-pink-300">Capacitor JS</strong>: Best for native API bridges. Wrap the app with <code className="text-gray-100 bg-white/5 px-1 py-0.5 rounded">npx cap add android</code> and build through Android Studio easily.</li>
                    <li><strong className="text-pink-300">Online APK compilers</strong>: Simply upload your PWA URL (<code className="text-pink-400 underline">{window.location.host}</code>) directly to PWA2APK, pwabuilder.com, or Cloud APK compiles to generate a finalized debug or release APK without local toolchains.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px] font-bold font-mono shrink-0 mt-0.5 border border-pink-500/25">3</span>
                <div>
                  <p className="text-xs font-bold text-white">Sideload onto Physical Android Device</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    Transfer the output <code className="text-pink-300 font-bold">.apk</code> file to your mobile or tablet. Go to Settings &gt; Apps &gt; Special App Access and toggle <strong className="text-gray-200">"Install Unknown Apps"</strong> on for your browser or file manager. Execute the APK to run SomSphere natively!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-pink-500/5 rounded-2xl border border-pink-500/15 flex items-start gap-2.5 mt-2.5">
                <AlertCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-pink-300 leading-relaxed">
                  <strong>PWA Express Install Alternative:</strong> Instead of compiling separate APKs, users can also open the URL on mobile chrome/safari, press <strong>Add to Home Screen</strong>, and launch it directly as a lightweight native-wrapped container application instantly! This saves massive disk space and auto-updates dynamically.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Responsive Workspace Simulator Screen Frame (5/12) */}
        <div className="xl:col-span-5 flex flex-col items-center">

          {/* Simulator Toolbar Controls */}
          <div className="w-full bg-[#0E0E16]/85 border border-white/5 rounded-3xl p-4 shadow-xl space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-pink-400 uppercase font-mono">
                Interactive Viewport Simulator
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                <span className="text-[9.5px] text-gray-400 font-mono">Active Sandbox Grid Mode</span>
              </div>
            </div>

            {/* Selector list for Device type */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  previewDevice === "mobile" 
                    ? "bg-pink-500/10 border-pink-500 text-pink-400" 
                    : "bg-[#111119]/80 border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  previewDevice === "tablet" 
                    ? "bg-pink-500/10 border-pink-500 text-pink-400" 
                    : "bg-[#111119]/80 border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                Tablet
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice("laptop")}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  previewDevice === "laptop" 
                    ? "bg-pink-500/10 border-pink-500 text-pink-400" 
                    : "bg-[#111119]/80 border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                Laptop
              </button>
            </div>

            {/* Sample module selector */}
            <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5">
              <span className="text-[10.5px] text-gray-400 font-bold uppercase">Mock Modules:</span>
              <div className="flex flex-wrap gap-1">
                {(["dashboard", "tasks", "pdf", "notes"] as const).map((route) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => {
                      setMockRoute(route);
                      showToast(`Preview workspace updated for simulated route: ${route.toUpperCase()}`, "info");
                    }}
                    className={`px-2 py-1 rounded text-[9px] font-mono font-bold capitalize transition-all cursor-pointer ${
                      mockRoute === route 
                        ? "bg-white/15 text-white border border-white/20" 
                        : "bg-white/5 text-gray-400 border border-transparent hover:text-gray-200"
                    }`}
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Responsive Shell Device Frame wrapper */}
          <div className="w-full flex justify-center py-4 bg-[#09090E] border border-white/5 rounded-3xl p-4 shadow-inner relative overflow-hidden h-[640px]">
            <div className="absolute inset-0 bg-[#09090E] opacity-70 pointer-events-none" />
            
            {/* The frames depending on selection */}
            <div className="relative z-10 w-full flex items-center justify-center transition-all duration-300">
              
              {/* SMARTPHONE FRAME */}
              {previewDevice === "mobile" && (
                <div className="w-[280px] h-[540px] bg-[#0E0E16] border-8 border-[#1F1F2F] rounded-[36px] overflow-hidden shadow-2xl relative flex flex-col">
                  {/* Speaker slot sensor */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-[#1F1F2F] rounded-full z-20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-black ml-auto mr-1" />
                  </div>
                  
                  {/* Status Bar */}
                  <div className="h-6 bg-black text-white px-5 pt-2.5 flex justify-between items-center text-[9px] font-mono shrink-0 z-10">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-1">
                      <span>LTE</span>
                      <span className="w-4 h-2 bg-pink-500 rounded-sm inline-block" />
                    </div>
                  </div>

                  {/* Simulator Screen Content */}
                  <div className="flex-1 overflow-y-auto p-3.5 bg-[#09090E] text-xs space-y-3 custom-scrollbar">
                    <MockAppScreen route={mockRoute} />
                  </div>

                  {/* Mobile Navigation Bar bottom layout */}
                  <div className="h-10 bg-[#0A0A10] border-t border-white/5 flex items-center justify-around text-gray-500 shrink-0 z-10 text-[9px]">
                    <div className={`flex flex-col items-center ${mockRoute === "dashboard" ? "text-pink-400" : ""}`}>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Home</span>
                    </div>
                    <div className={`flex flex-col items-center ${mockRoute === "tasks" ? "text-pink-400" : ""}`}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Tasks</span>
                    </div>
                    <div className={`flex flex-col items-center ${mockRoute === "pdf" ? "text-pink-400" : ""}`}>
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TABLET FRAME */}
              {previewDevice === "tablet" && (
                <div className="w-[440px] h-[340px] bg-[#0E0E16] border-[12px] border-[#1F1F2F] rounded-[24px] overflow-hidden shadow-2xl relative flex flex-col">
                  {/* Mini Front Lens */}
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-black rounded-r-md z-20" />
                  
                  {/* Status Bar */}
                  <div className="h-5 bg-[#0A0A10] text-[#8C8C9C] px-4 flex justify-between items-center text-[8px] font-mono shrink-0">
                    <span>iPad LTE • Connected</span>
                    <span>100% Charged</span>
                  </div>

                  {/* Inner Content Grid */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Tablet Mini Sidebar */}
                    <div className="w-16 bg-[#0A0A10] border-r border-white/5 flex flex-col items-center py-4 space-y-4 shrink-0">
                      <div className="w-6 h-6 rounded bg-pink-500 flex items-center justify-center font-bold text-white text-[10px]">S</div>
                      <Layers className="w-4 h-4 text-pink-400" />
                      <CheckCircle className="w-4 h-4 text-gray-500" />
                      <FileCode className="w-4 h-4 text-gray-500" />
                    </div>

                    {/* Tablet Workspace Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-[#09090E] text-xs space-y-4 custom-scrollbar">
                      <MockAppScreen route={mockRoute} />
                    </div>
                  </div>
                </div>
              )}

              {/* LAPTOP FRAME */}
              {previewDevice === "laptop" && (
                <div className="w-[490px] h-[300px] flex flex-col">
                  {/* Screenshell frame */}
                  <div className="flex-1 bg-[#0E0E16] border-4 border-[#2F2F3F] rounded-t-xl overflow-hidden shadow-2xl relative flex flex-col">
                    <div className="h-4 bg-[#1F1F2F] flex justify-between items-center text-[8px] px-3 shrink-0 text-gray-400">
                      <span>MacBook Workspace Port-3000</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                      {/* Left list options sidebar */}
                      <div className="w-24 bg-[#0A0A10] border-r border-white/5 flex flex-col py-3 px-1.5 space-y-1 shrink-0">
                        <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-wider block px-1.5 mb-1.5">SomSphere</span>
                        <div className="flex items-center gap-1 bg-white/5 text-pink-400 p-1 rounded text-[8.5px]">
                          <Layers className="w-3 h-3 shrink-0" />
                          <span className="truncate">Home</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 p-1 text-[8.5px]">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">Tasks</span>
                        </div>
                      </div>

                      {/* Main workspace */}
                      <div className="flex-1 overflow-y-auto p-4 bg-[#09090E] space-y-4 text-xs custom-scrollbar">
                        <MockAppScreen route={mockRoute} />
                      </div>
                    </div>
                  </div>
                  {/* Metal keyboard hinge base shelf */}
                  <div className="h-3.5 bg-[#4F4F5F] border-b-2 border-[#1F1F2F] rounded-b-xl shadow-lg relative shrink-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#2F2F3F] rounded-b-sm" />
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// Simulated active screen output render component
function MockAppScreen({ route }: { route: "dashboard" | "tasks" | "pdf" | "notes" }) {
  if (route === "dashboard") {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-white uppercase font-mono">My Portal</span>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">GPA: 3.94</span>
        </div>
        
        <div className="p-3 bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/15 rounded-xl">
          <p className="text-[9.5px] text-pink-400 uppercase tracking-wider font-bold">Good Morning!</p>
          <p className="text-[8.5px] text-gray-400 mt-0.5">Let's finish those PDF edits and course tasks today.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl flex flex-col justify-between">
            <span className="text-[8.5px] text-gray-400 uppercase tracking-widest block font-bold">Today's Classes</span>
            <p className="text-[10.5px] font-bold text-white mt-1 leading-tight font-mono">Algorithms @ 10am</p>
          </div>
          <div className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl flex flex-col justify-between">
            <span className="text-[8.5px] text-gray-400 uppercase tracking-widest block font-bold">Unfinished Tasks</span>
            <p className="text-[10.5px] font-bold text-rose-400 mt-1 leading-tight font-mono">4 Assignments Pending</p>
          </div>
        </div>
      </div>
    );
  }

  if (route === "tasks") {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-white uppercase font-mono">Todo Queue</span>
          <span className="text-[8.5px] text-gray-500 font-mono">Filter: All</span>
        </div>

        <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <input type="checkbox" checked={false} readOnly className="rounded border-white/10" />
            <span className="text-[9.5px] text-gray-200 truncate font-mono">Finish Machine Learning research</span>
          </div>
          <span className="text-[8px] bg-pink-500/10 text-pink-400 px-1 py-0.2 rounded shrink-0">High</span>
        </div>

        <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <input type="checkbox" checked={true} readOnly className="rounded border-white/10" />
            <span className="text-[9.5px] text-gray-500 line-through truncate font-mono">Submit PDF reports</span>
          </div>
          <span className="text-[8px] bg-gray-500/10 text-gray-400 px-1 py-0.2 rounded shrink-0">Medium</span>
        </div>

        <div className="p-2.5 bg-pink-500/5 border border-pink-500/15 rounded-xl text-center">
          <span className="text-[10px] font-bold text-pink-400">Add New Sim Task +</span>
        </div>
      </div>
    );
  }

  if (route === "pdf") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚙️</span> PDF Converter Queue
        </p>
        
        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-center space-y-2">
          <p className="text-[9.5px] text-pink-400 font-bold">Image_To_PDF_Batch_1.pdf</p>
          
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="24" className="stroke-white/5" strokeWidth="4" fill="transparent" />
              <circle cx="32" cy="32" r="24" className="stroke-pink-500" strokeWidth="4" fill="transparent" strokeDasharray="150" strokeDashoffset="45" />
            </svg>
            <span className="absolute text-[8px] font-mono font-bold text-gray-200">70%</span>
          </div>
          <span className="text-[8px] text-gray-400 block font-mono">Converting workspace pages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-white uppercase font-mono">Study Notes</span>
        <span className="text-[8.5px] text-white/50">Edit Active</span>
      </div>
      
      <div className="p-2.5 bg-[#1B1B26] border border-pink-500/20 rounded-xl space-y-1">
        <p className="text-[10px] font-bold text-white font-mono">Midterm Prep Note</p>
        <p className="text-[8.5px] text-gray-400 leading-normal">
          Revise computer organization architecture, pipeline forwarding registers, hazards prevention algorithm...
        </p>
      </div>

      <div className="p-2.5 bg-white/5 border border-white/5 rounded-xl">
        <p className="text-[9px] text-gray-400 font-mono">Last Auto-Backup: Today, 3:00 am</p>
      </div>
    </div>
  );
}
