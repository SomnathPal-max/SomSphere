import React, { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import clsx from "clsx";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="absolute top-0 left-0 w-full z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="w-full bg-red-500/10 border-b border-red-500/20 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-3">
        <CloudOff className="w-4 h-4 text-red-400" />
        <span className="text-xs font-bold text-red-200 uppercase tracking-widest">
          You are offline. Changes will be saved locally.
        </span>
      </div>
    </div>
  );
}
