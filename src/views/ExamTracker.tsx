import React, { useState, useEffect, useRef } from "react";
import { Plus, X, GraduationCap, Clock, Trash2 } from "lucide-react";
import { fetchCollection, createItem, deleteItem } from "../api";
import type { Exam } from "../types";
import { format, differenceInDays, differenceInSeconds } from "date-fns";
import clsx from "clsx";
import { useToast } from "../ToastContext";
import { playNotificationChime } from "../utils/audio";

export function ExamTracker() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { showToast } = useToast();
  const hasAlertedRef = useRef(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    subject: "",
    examDateTime: "",
    type: "MIDTERM",
    notes: "",
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadExams = () => fetchCollection('exams').then(data => {
    // Sort soonest first
    const sorted = data.sort((a: Exam, b: Exam) => new Date(a.examDateTime).getTime() - new Date(b.examDateTime).getTime());
    setExams(sorted);
  });

  useEffect(() => { loadExams(); }, []);

  useEffect(() => {
    if (exams.length === 0 || hasAlertedRef.current) return;
    const hasApproachingDeadline = exams.some(e => {
      const days = differenceInDays(new Date(e.examDateTime), now);
      return days >= 0 && days <= 3;
    });
    if (hasApproachingDeadline) {
      playNotificationChime();
      showToast("You have critical exams approaching!", "info");
      hasAlertedRef.current = true;
    }
  }, [exams, now, showToast]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.subject || !newExam.examDateTime) return;
    try {
      await createItem('exams', newExam);
      showToast("Exam added successfully", "success");
      playNotificationChime();
      setIsAdding(false);
      setNewExam({ subject: "", examDateTime: "", type: "MIDTERM", notes: "" });
      loadExams();
    } catch (e) {
      showToast("Failed to add exam", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteItem('exams', id);
      showToast("Exam removed", "info");
      loadExams();
    } catch (e) {
      showToast("Failed to remove exam", "error");
    }
  };

  const formatCountdown = (targetDate: string) => {
    const target = new Date(targetDate);
    const secs = differenceInSeconds(target, now);
    if (secs <= 0) return "Started/Passed";
    
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const getUrgencyClass = (targetDate: string) => {
    const days = differenceInDays(new Date(targetDate), now);
    if (days <= 3) return "border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.1)]";
    if (days <= 7) return "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]";
    return "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]";
  };

  const getUrgencyAccentClass = (targetDate: string) => {
    const days = differenceInDays(new Date(targetDate), now);
    if (days <= 3) return "bg-pink-500 shadow-[0_0_10px_#EC4899]";
    if (days <= 7) return "bg-yellow-500 shadow-[0_0_10px_#EAB308]";
    return "bg-emerald-500 shadow-[0_0_10px_#10B981]";
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex items-center justify-between shrink-0">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Exam Tracker</h2>
           <p className="text-gray-400 mt-1">Keep track of your upcoming assessments</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-violet-700 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(212,0,255,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-white">
          <Plus className="w-4 h-4"/> Add Exam
        </button>
      </header>

      {isAdding && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md shrink-0 relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6"><GraduationCap className="w-4 h-4 inline mr-2"/>Add New Exam</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Subject</label>
              <input required type="text" placeholder="Physics 101" value={newExam.subject} onChange={e => setNewExam({...newExam, subject: e.target.value})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Exam Type</label>
              <select required value={newExam.type} onChange={e => setNewExam({...newExam, type: e.target.value as any})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors">
                <option value="MIDTERM">Midterm</option>
                <option value="FINAL">Final</option>
                <option value="QUIZ">Quiz</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:col-span-2">
               <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Date & Time</label>
               <input required type="datetime-local" value={newExam.examDateTime} onChange={e => setNewExam({...newExam, examDateTime: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors w-full" style={{colorScheme: 'dark'}} />
            </div>
            <div className="flex flex-col gap-1 lg:col-span-4 mt-2">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Notes (Optional)</label>
              <textarea placeholder="Topics to cover..." value={newExam.notes} onChange={e => setNewExam({...newExam, notes: e.target.value})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600 h-20 resize-none custom-scrollbar" />
            </div>
            <button type="submit" className="lg:col-span-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors mt-2 border border-white/10 tracking-wide">Save Exam Entry</button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className={clsx("group relative bg-white/5 border rounded-3xl p-6 transition-all hover:bg-white/10", getUrgencyClass(exam.examDateTime))}>
              <div className={clsx("absolute top-0 left-6 w-12 h-1 rounded-b-full", getUrgencyAccentClass(exam.examDateTime))} />
              <button onClick={() => handleDelete(exam.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5 bg-[#0D0D14] rounded-lg border border-white/10 shrink-0">
                <Trash2 className="w-4 h-4"/>
              </button>
              
              <div className="flex justify-between items-start mb-6 mt-2">
                <div>
                  <div className="text-xs font-bold px-2.5 py-1 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-400 w-inline-block inline-flex items-center gap-1.5 mb-3">
                     <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                     {exam.type}
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight break-words pr-4">{exam.subject}</h3>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-sm font-medium">
                    {format(new Date(exam.examDateTime), "MMM do, yyyy 'at' h:mm a")}
                  </div>
                </div>
                
                <div className="bg-[#0D0D14]/60 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Countdown</div>
                  <div className="text-lg font-black tracking-wider text-pink-400 font-mono">
                    {formatCountdown(exam.examDateTime)}
                  </div>
                </div>
                
                {exam.notes && (
                  <div className="pt-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Notes</div>
                    <p className="text-xs text-gray-400 leading-relaxed bg-white/5 p-3 rounded-xl line-clamp-3">
                      {exam.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {exams.length === 0 && (
             <div className="col-span-1 md:col-span-2 lg:col-span-3 h-48 border border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center text-gray-500 bg-white/[0.01]">
               <GraduationCap className="w-8 h-8 mb-3 opacity-50" />
               <div className="text-xs uppercase font-bold tracking-[0.2em]">No Upcoming Exams</div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
