import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Clock, Book, Calendar as CalendarIcon, Target, DollarSign, ClipboardCheck, AlertTriangle, Check, X, Award, FileText, Wallet, Plus } from "lucide-react";
import { fetchCollection } from "../api";
import type { Assignment, Announcement, Course, TimetableSlot, HabitLog, Expense, Exam, Habit } from "../types";
import { useTimer } from "../TimerContext";
import { useToast } from "../ToastContext";
import { DashboardWidget } from "../components/DashboardWidget";

import { QuickNotes } from "../components/QuickNotes";
import { UpcomingExamCountdown } from "../components/UpcomingExamCountdown";
import { TopHabitsWidget } from "../components/TopHabitsWidget";
import { WeeklyInsightCard } from "../components/WeeklyInsightCard";
import { TaskProgressRing } from "../components/TaskProgressRing";
import { StudentAchievementsWidget } from "../components/StudentAchievementsWidget";
import { NetworkSettingsWidget } from "../components/NetworkSettingsWidget";
import { AIDailySummaryCard } from "../components/AIDailySummaryCard";
import { FlashcardQuickReviewWidget } from "../components/FlashcardQuickReviewWidget";
import { SemesterXpWidget } from "../components/SemesterXpWidget";
import { ProductivityChart } from "../components/ProductivityChart";
import { motion } from "motion/react";

function QuickActionsWidget({ navigate }: { navigate: any }) {
  const actions = [
    { title: 'Create Task', icon: Plus, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', hover: 'hover:bg-indigo-500/20', path: '/tasks' },
    { title: 'Record Note', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'hover:bg-emerald-500/20', path: '/notes' },
    { title: 'Check Expenses', icon: Wallet, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hover: 'hover:bg-amber-500/20', path: '/expenses' }
  ];

  return (
    <section className="glass-card p-6 flex flex-col h-full items-start">
      <h3 className="text-lg font-bold mb-4 tracking-tight">Quick Actions</h3>
      <div className="grid grid-cols-1 gap-3 w-full">
        {actions.map((action) => (
          <button 
            key={action.path} 
            onClick={() => navigate(action.path)} 
            className={`flex items-center gap-3 p-3 w-full border ${action.bg} ${action.hover} ${action.border} ${action.color} rounded-xl transition-all text-left group`}
          >
            <div className={`p-2 rounded-lg bg-black/10 group-hover:bg-black/20 transition-colors`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white/90 group-hover:text-white">{action.title}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [conflictData, setConflictData] = useState<{ localCount: number; cloudCount: number } | null>(null);
  const { timeLeft, isActive, mode, sessionCount } = useTimer();
  const { showToast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cloudAssignments, cloudAnnouncements, cloudCourses, cloudTimetable, cloudHabitLogs, cloudHabits, cloudExpenses, cloudExams, collegeNoticesData] = await Promise.all([
          fetchCollection('assignments'),
          fetchCollection('announcements'),
          fetchCollection('courses'),
          fetchCollection('timetable'),
          fetchCollection('habitLogs'),
          fetchCollection('habits'),
          fetchCollection('expenses'),
          fetchCollection('exams'),
          import('../api').then(m => m.apiFetch('/api/college-notices').catch(() => []))
        ]);
        
        setAssignments(cloudAssignments);
        const rawAnnouncements = [...cloudAnnouncements, ...collegeNoticesData];
        const uniqueAnnouncements = Array.from(new Map(rawAnnouncements.map(item => [item.id, item])).values());
        setAnnouncements(uniqueAnnouncements.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        }));
        setCourses(cloudCourses);
        setTimetable(cloudTimetable);
        setHabitLogs(cloudHabitLogs);
        setHabits(cloudHabits);
        setExpenses(cloudExpenses);
        setExams(cloudExams);

        if (navigator.onLine) {
          const localCache = localStorage.getItem('sync_cache_assignments');
          if (localCache) {
            const parsedLocal = JSON.parse(localCache);
            if (Array.isArray(parsedLocal) && parsedLocal.length !== cloudAssignments.length) {
              setConflictData({ localCount: parsedLocal.length, cloudCount: cloudAssignments.length });
            }
          }
          localStorage.setItem('sync_cache_assignments', JSON.stringify(cloudAssignments));
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    
    fetchData(); // initial fetch

    const handleOnline = () => {
      setTimeout(fetchData, 1000); // Wait a bit for Firebase to reconnect
    };
    window.addEventListener('online', handleOnline);

    const interval = setInterval(() => {
      setCurrentTime(new Date());
      fetchData(); // periodic poll for real-time data
    }, 60000); // Poll every minute
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const pendingAssignments = assignments.filter(a => a.status !== 'DONE');

  // GPA Calculation
  const cumulativeGpa = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;
    const GRADE_POINTS: Record<string, number> = {
      "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "D": 1.0, "F": 0.0
    };
    courses.forEach(c => {
      totalCredits += c.creditHours;
      totalPoints += (GRADE_POINTS[c.grade] || 0) * c.creditHours;
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  }, [courses]);

  // Next Class Calculation
  const { nextClassTime, nextClassSubtitle } = useMemo(() => {
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const now = currentTime;
    const currentDayName = DAYS[now.getDay()];
    const currentTimeString = now.toTimeString().slice(0, 5); 

    const sortedSlots = [...timetable].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const todaysClasses = sortedSlots.filter(t => t.day === currentDayName);
    
    let nextClass = todaysClasses.find(t => t.startTime > currentTimeString);
    
    if (nextClass) {
      return { 
        nextClassTime: nextClass.startTime, 
        nextClassSubtitle: `${nextClass.subject}, ${nextClass.room}` 
      };
    }
    
    for (let i = 1; i <= 7; i++) {
       const nextDayName = DAYS[(now.getDay() + i) % 7];
       const nextDayClasses = sortedSlots.filter(t => t.day === nextDayName);
       if (nextDayClasses.length > 0) {
          nextClass = nextDayClasses[0];
          return {
            nextClassTime: `${nextClass.startTime} (${nextDayName.substring(0,3)})`,
            nextClassSubtitle: `${nextClass.subject}, ${nextClass.room}`
          };
       }
    }
    
    return { nextClassTime: "--:--", nextClassSubtitle: "No upcoming classes" };
  }, [timetable, currentTime]);

  const timerDisplay = `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;
  const timerSubtitle = isActive ? `${mode === 'WORK' ? 'Focusing' : 'Break'}...` : "Ready to start";

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    }).reduce((total, e) => total + Number(e.amount), 0).toFixed(2);
  }, [expenses]);

  const generateProductivityReport = () => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const completedTasks = assignments.filter(a => a.status === 'DONE').length;
    const pendingTasks = assignments.filter(a => a.status !== 'DONE').length;
    
    const recentLogs = habitLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= oneWeekAgo && logDate <= today && log.completed;
    });
    
    const habitCompletionRate = habits.length > 0 ? ((recentLogs.length / (habits.length * 7)) * 100).toFixed(0) : "0";

    const report = `Weekly Productivity Report 📊
Generated: ${today.toLocaleDateString()}

🎯 Tasks & Assignments
- Completed: ${completedTasks}
- Pending: ${pendingTasks}
- Completion Rate: ${assignments.length > 0 ? Math.round((completedTasks / assignments.length) * 100) : 0}%

🌱 Habit Progress (Last 7 Days)
- Logged Completions: ${recentLogs.length}
- Week Success Rate: ${habitCompletionRate}%

Keep up the great work! 🚀`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report).then(() => {
        showToast("Weekly productivity report copied to clipboard!", "success");
      }).catch(err => {
        showToast("Failed to copy report.", "error");
        console.error(err);
      });
    } else {
      showToast("Clipboard API not supported in this browser.", "error");
    }
  };

  const resolveConflict = (keepLocal: boolean) => {
    if (keepLocal) {
      showToast("Local cache kept. Syncing to cloud postponed.", "info");
      // Read local cache and set local state
      const localCache = localStorage.getItem('sync_cache_assignments');
      if (localCache) {
        try {
          const parsedLocal = JSON.parse(localCache);
          setAssignments(parsedLocal);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      showToast("Cloud data kept. Local cache overwritten.", "success");
      // Local cache already has cloud data updated in the effect or will be refreshed
      const forceFetch = () => fetchCollection('assignments').then(setAssignments).catch(console.error);
      forceFetch();
    }
    setConflictData(null);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = format(currentTime, 'EEEE, MMMM do, yyyy');
  const formattedTime = format(currentTime, 'h:mm a');

  return (
    <div className="space-y-6 relative">
      {/* Greeting Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight flex items-center gap-2">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">Student</span>
          </h1>
          <p className="text-sm text-gray-400">Here's your academic summary for today.</p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-xl font-mono font-bold text-white/90">{formattedTime}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">{formattedDate}</div>
        </div>
      </motion.div>

      {conflictData && (
        <div className="absolute top-0 right-0 z-50 p-4 bg-[#1A1A24] border border-red-500/50 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 max-w-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-500/10 rounded-full shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Data Conflict Detected</h4>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Your local cache has <strong className="text-white">{conflictData.localCount} assignments</strong>, but the cloud has <strong className="text-white">{conflictData.cloudCount}</strong>. You just came back online. How do you want to resolve this?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => resolveConflict(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white transition-all"
                >
                  <Check className="w-3 h-3" /> Keep Local
                </button>
                <button
                  onClick={() => resolveConflict(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-xl text-xs font-medium text-pink-400 transition-all"
                >
                  <X className="w-3 h-3" /> Use Cloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Overview</h2>
            <p className="text-gray-400">You have {pendingAssignments.length} pending assignments.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={generateProductivityReport} 
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-sm text-white hover:bg-white/10 transition-all flex items-center gap-2"
              title="Copy Weekly Report"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Report</span>
            </button>
            <button onClick={() => showToast("Features under construction. Stay tuned!", "info")} className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-violet-700 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(212,0,255,0.3)] transition-all hover:scale-105 active:scale-95 text-white">
              + Add Task
            </button>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <AIDailySummaryCard assignments={assignments} />
        <FlashcardQuickReviewWidget />
        <SemesterXpWidget assignments={assignments} habitLogs={habitLogs} />
        <QuickActionsWidget navigate={navigate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard icon={<Clock className="text-pink-400" />} title="Focus Timer" value={timerDisplay} subtitle={timerSubtitle} />
        <StatCard icon={<Target className="text-purple-400" />} title="Cumulative GPA" value={cumulativeGpa} subtitle="Calculated from Grades module" />
        <StatCard icon={<CalendarIcon className="text-blue-400" />} title="Next Class" value={nextClassTime} subtitle={nextClassSubtitle} />
        <StatCard icon={<Book className="text-emerald-400" />} title="Pending Tasks" value={pendingAssignments.length.toString()} subtitle="Assignments due" />
        <StatCard icon={<DollarSign className="text-amber-400" />} title="Expenses" value={`$${currentMonthExpenses}`} subtitle="This month" />
      </div>

      <div className="dashboard-stats-container grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ProductivityChart assignments={assignments} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8 relative z-10">
        <div className="lg:col-span-2 glass-card">
          <DashboardWidget assignments={assignments} habitLogs={habitLogs} expenses={expenses} />
        </div>
        <div>
          <WeeklyInsightCard expenses={expenses} habitLogs={habitLogs} />
        </div>
        <div>
          <TaskProgressRing assignments={assignments} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mt-8">
        <section className="lg:col-span-2 flex flex-col h-[400px]">
          <StudentAchievementsWidget assignments={assignments} habitLogs={habitLogs} focusSessionCount={sessionCount} />
        </section>

        <section className="lg:col-span-2 glass-card p-6 flex flex-col h-[400px]">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Book className="w-5 h-5 text-emerald-400"/> Pending Assignments</h3>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {pendingAssignments.length === 0 ? (
              <div className="text-center py-12 text-white/40">No pending assignments! 🎉</div>
            ) : (
              pendingAssignments.map(a => (
                <div key={a.id} className="group relative flex items-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                  <div className="w-1 h-10 rounded-full mr-4" style={{ backgroundColor: a.priority === 'HIGH' ? '#EC4899' : a.priority === 'MEDIUM' ? '#FBBF24' : '#10B981', boxShadow: a.priority === 'HIGH' ? '0 0 10px #EC4899' : 'none' }}></div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{a.title}</h4>
                    <p className="text-xs text-gray-500">{a.subject}</p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-pink-500">{a.dueDate}</div>
                    <div className="text-gray-500">{a.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="lg:col-span-2 glass-card p-6 flex flex-col h-[400px]">
          <h3 className="text-xl font-semibold mb-6">Notice Board</h3>
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {announcements.slice(0, 10).map(n => (
              <div key={n.id} className="p-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-pink-400 tracking-wider uppercase">{n.category}</span>
                  {n.pinned && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Pinned</span>}
                </div>
                <h4 className="font-medium mb-1 leading-snug text-white/90">{n.title}</h4>
                <p className="text-sm text-white/60 line-clamp-2">
                   {n.body && n.body.startsWith('Click here to view: ') && n.body.split('Click here to view: ')[1] ? (
                      <a href={n.body.split('Click here to view: ')[1]} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline underline-offset-2">
                        View Document
                      </a>
                   ) : (
                      n.body
                   )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 flex flex-col h-[400px]">
          <UpcomingExamCountdown exams={exams} />
        </section>

        <section className="lg:col-span-2 flex flex-col h-[400px]">
          <TopHabitsWidget habits={habits} habitLogs={habitLogs} />
        </section>

        <section className="lg:col-span-2 flex flex-col h-full min-h-[400px]">
          <QuickNotes />
        </section>
        <section className="lg:col-span-2 flex flex-col h-[400px]">
          <NetworkSettingsWidget />
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }: { icon: React.ReactNode, title: string, value: string, subtitle: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</div>
      <div className="text-2xl font-black text-pink-400">{value}</div>
      <div className="text-[10px] text-gray-400 mt-2">{subtitle}</div>
    </div>
  );
}
