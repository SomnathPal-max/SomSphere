import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Award, Trash2, Download, GraduationCap } from "lucide-react";
import { fetchCollection, createItem, deleteItem } from "../api";
import type { Course } from "../types";
import { useToast } from "../ToastContext";
import { format } from "date-fns";

const GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"];
export const GRADE_POINTS: Record<string, number> = {
  "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "D": 1.0, "F": 0.0
};

export function GradesView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { showToast } = useToast();
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    name: "",
    grade: "A",
    creditHours: 3
  });

  const loadCourses = () => fetchCollection('courses').then(setCourses);
  useEffect(() => { loadCourses(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name || !newCourse.creditHours) return;
    try {
      await createItem('courses', newCourse);
      showToast("Course added to grades vault", "success");
      setIsAdding(false);
      setNewCourse({ name: "", grade: "A", creditHours: 3 });
      loadCourses();
    } catch (err) {
      showToast("Failed to add course", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteItem('courses', id);
      showToast("Course removed from vault", "info");
      loadCourses();
    } catch (err) {
      showToast("Failed to remove course", "error");
    }
  };

  const exportToCSV = () => {
    if (courses.length === 0) {
      showToast("No grades to export", "info");
      return;
    }
    const headers = ["Course Name", "Credit Hours", "Grade"];
    const csvContent = [
      headers.join(","),
      ...courses.map(c => `"${c.name.replace(/"/g, '""')}",${c.creditHours},${c.grade}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `grades_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported to CSV", "success");
  };

  const { gpa, totalCredits } = useMemo(() => {
    let credits = 0;
    let points = 0;
    courses.forEach(c => {
      credits += Number(c.creditHours);
      points += (GRADE_POINTS[c.grade] || 0) * Number(c.creditHours);
    });
    return {
      gpa: credits > 0 ? (points / credits) : 0,
      totalCredits: credits
    };
  }, [courses]);

  const gpaPercent = (gpa / 4.0) * 100;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = Math.max(0, circumference - (gpaPercent / 100) * circumference);

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex items-center justify-between shrink-0">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Grades & GPA</h2>
           <p className="text-gray-400 mt-1">Track your academic performance</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={exportToCSV} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-gray-300 hover:text-white" title="Export to CSV">
            <Download className="w-4 h-4"/>
          </button>
          <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-violet-700 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(212,0,255,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-white">
            <Plus className="w-4 h-4"/> Add Course
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md shrink-0 relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6"><Award className="w-4 h-4 inline mr-2"/>New Course Entry</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Course Name</label>
              <input required type="text" placeholder="e.g. Intro to Computer Science" value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Credits</label>
              <input required type="number" min="1" max="10" value={newCourse.creditHours || ''} onChange={e => setNewCourse({...newCourse, creditHours: Number(e.target.value)})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Grade</label>
              <select required value={newCourse.grade} onChange={e => setNewCourse({...newCourse, grade: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors">
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button type="submit" className="md:col-span-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors mt-2 border border-white/10 tracking-wide">Save Course Details</button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-8 pr-2 pb-8">
        
        {/* GPA Summary Card */}
        <div className="w-full md:w-1/3 shrink-0">
          <div className="glass-card bg-gradient-to-br from-[#0D0D14] to-violet-950/30 border border-white/10 rounded-[32px] p-8 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 w-48 h-48 bg-pink-500/10 blur-[50px] rounded-full pointer-events-none" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 w-full text-left">Cumulative GPA</h3>
            
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                <circle
                  cx="70" cy="70" r={radius}
                  className="fill-transparent stroke-white/5"
                  strokeWidth="12"
                />
                <circle
                  cx="70" cy="70" r={radius}
                  className="fill-transparent stroke-pink-500 transition-all duration-1000 ease-out"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 10px rgba(236,72,153,0.5))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                 <span className="text-4xl font-black text-white tracking-tight">{gpa.toFixed(2)}</span>
                 <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest mt-1">Out of 4.0</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
              <div className="bg-[#0D0D14]/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Credits</span>
                <span className="text-xl font-bold text-white">{totalCredits}</span>
              </div>
              <div className="bg-[#0D0D14]/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Classes</span>
                <span className="text-xl font-bold text-white">{courses.length}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Course List */}
        <div className="flex-1 glass-card bg-white/[0.02] border border-white/5 rounded-[32px] p-6 flex flex-col">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 pl-2">Course Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar p-1">
            {courses.length === 0 ? (
               <div className="col-span-full h-full min-h-[300px] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-white/[0.01]">
                 <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
                    <GraduationCap className="w-8 h-8 text-pink-400 opacity-80" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">No grades entered yet</h3>
                 <p className="text-gray-400 max-w-sm mx-auto mb-6">Track your academic progress by adding your courses and grades. Your GPA will be calculated automatically.</p>
                 <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm">Add First Course</button>
               </div>
            ) : (
              courses.map(course => (
                <div key={course.id} className="group relative bg-[#0D0D14]/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/5 hover:border-white/10 flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-sm mb-1">{course.name}</h4>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                       <span>{course.creditHours} {course.creditHours === 1 ? 'Credit' : 'Credits'}</span>
                       <span>•</span>
                       <span className="text-pink-400/80">{GRADE_POINTS[course.grade]?.toFixed(1)} Points</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 font-black text-xl text-white shadow-inner">
                      {course.grade}
                    </div>
                    <button onClick={() => handleDelete(course.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-colors bg-[#0D0D14] rounded-lg border border-white/10 shrink-0">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
