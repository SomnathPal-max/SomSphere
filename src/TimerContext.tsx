import React, { createContext, useContext, useState, useEffect } from 'react';

type TimerMode = 'WORK' | 'BREAK';

interface TimerContextType {
  timeLeft: number;
  isActive: boolean;
  mode: TimerMode;
  sessionCount: number;
  toggleTimer: () => void;
  resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [sessionCount, setSessionCount] = useState(1);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      if (mode === 'WORK') {
        setMode('BREAK');
        setTimeLeft(BREAK_TIME);
      } else {
        setMode('WORK');
        setTimeLeft(WORK_TIME);
        setSessionCount(c => c + 1);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setMode('WORK');
    setTimeLeft(WORK_TIME);
  };

  return (
    <TimerContext.Provider value={{ timeLeft, isActive, mode, sessionCount, toggleTimer, resetTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used within TimerProvider");
  return context;
};
