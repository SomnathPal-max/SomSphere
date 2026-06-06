import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { db } from "../firebase";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { useToast } from "../ToastContext";
import clsx from "clsx";

export function NetworkSettingsWidget() {
  const [isOffline, setIsOffline] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { showToast } = useToast();

  const toggleNetwork = async () => {
    setIsTransitioning(true);
    try {
      if (isOffline) {
        await enableNetwork(db);
        setIsOffline(false);
        showToast("Auto-Sync enabled. Database is online.", "success");
      } else {
        await disableNetwork(db);
        setIsOffline(true);
        showToast("Offline Mode activated. Changes will be saved locally.", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Cannot toggle network right now.", "error");
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group h-[400px]">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none" />
      <div className="flex items-center justify-between mb-4 relative z-10">
         <h3 className="text-xl font-semibold flex items-center gap-2">
           {isOffline ? <WifiOff className="w-5 h-5 text-yellow-400" /> : <Wifi className="w-5 h-5 text-emerald-400" />}
           Network Settings
         </h3>
         <button onClick={toggleNetwork} disabled={isTransitioning} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors hidden">
            <RefreshCw className={clsx("w-4 h-4 text-white/60", isTransitioning && "animate-spin")} />
         </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <div className="p-6 rounded-full bg-white/5 mb-6">
          {isOffline ? <WifiOff className="w-12 h-12 text-yellow-400 opacity-80" /> : <Wifi className="w-12 h-12 text-emerald-400 opacity-80" />}
        </div>
        <h4 className="font-bold text-white mb-2 text-lg">
           {isOffline ? "Offline Mode" : "Auto-Sync Enabled"}
        </h4>
        <p className="text-sm text-gray-400 mb-6 px-4">
          {isOffline 
            ? "Changes are saved directly to your local device cache and will sync automatically when you go back to Auto-Sync."
            : "Your data is seamlessly synced to the cloud in real-time."
          }
        </p>
      </div>

      <div className="mt-auto relative z-10">
        <button
          onClick={toggleNetwork}
          disabled={isTransitioning}
          className={clsx(
            "w-full py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg",
            isOffline ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30",
            isTransitioning && "opacity-50 cursor-not-allowed"
          )}
        >
          {isTransitioning ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
          {isOffline ? "Enable Auto-Sync" : "Enable Offline Mode"}
        </button>
      </div>
    </div>
  );
}
