import React, { useState, useEffect } from "react";
import { format, differenceInSeconds } from "date-fns";
import { Hourglass, Calendar as CalendarIcon } from "lucide-react";
import type { Exam } from "../types";

export function UpcomingExamCountdown({ exams }: { exams: Exam[] }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  
  const upcomingExam = exams
    .filter(e => new Date(e.examDateTime) > new Date())
    .sort((a, b) => new Date(a.examDateTime).getTime() - new Date(b.examDateTime).getTime())[0];

  useEffect(() => {
    if (!upcomingExam) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const examDate = new Date(upcomingExam.examDateTime);
      const diff = differenceInSeconds(examDate, now);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (3600 * 24)),
        hours: Math.floor((diff % (3600 * 24)) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [upcomingExam]);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
      
      <div className="flex items-center gap-2 mb-6">
        <Hourglass className="w-5 h-5 text-orange-400" />
        <h3 className="text-xl font-semibold">Next Exam</h3>
      </div>

      {upcomingExam ? (
        <div className="flex flex-col flex-1">
          <div className="mb-4">
            <h4 className="font-bold text-2xl truncate text-white">{upcomingExam.subject}</h4>
            <div className="flex items-center gap-2 text-white/50 text-sm mt-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {format(new Date(upcomingExam.examDateTime), "MMM do, yyyy h:mm a")}
            </div>
            <div className="inline-block px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[10px] uppercase tracking-wider font-bold mt-2">
              {upcomingExam.type}
            </div>
          </div>

          <div className="mt-auto grid grid-cols-4 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-orange-400">{timeLeft?.days ?? '0'}</span>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Days</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-orange-400">{timeLeft?.hours.toString().padStart(2, '0') ?? '00'}</span>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Hrs</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-orange-400">{timeLeft?.minutes.toString().padStart(2, '0') ?? '00'}</span>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Min</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-orange-400">{timeLeft?.seconds.toString().padStart(2, '0') ?? '00'}</span>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Sec</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
           <Hourglass className="w-8 h-8 text-white/20 mb-3" />
           <p className="text-white/40 text-sm font-medium">No upcoming exams!</p>
           <p className="text-white/30 text-xs mt-1">Enjoy your free time.</p>
        </div>
      )}
    </div>
  );
}
