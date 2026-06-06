import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface AutoSaveToastProps {
  show: boolean;
  message?: string;
  onHide?: () => void;
  duration?: number;
}

export function AutoSaveToast({ show, message = "Draft Saved", onHide, duration = 2000 }: AutoSaveToastProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    if (show) {
      let timeoutId = setTimeout(() => {
        setIsVisible(false);
        if (onHide) onHide();
      }, duration);
      return () => clearTimeout(timeoutId);
    }
  }, [show, duration, onHide]);

  return (
    <div className={clsx(
      "absolute bottom-6 right-6 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 transition-all duration-300 pointer-events-none z-50",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
    )}>
      <CheckCircle2 className="w-3.5 h-3.5" />
      {message}
    </div>
  );
}
