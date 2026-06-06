import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { fetchCollection, createItem, deleteItem, updateItem } from "../api";
import type { TimetableSlot } from "../types";
import { useToast } from "../ToastContext";
import { SpecialEventsBanner } from "../components/SpecialEventsBanner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const COLORS = ["#EC4899", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export function Timetable() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { showToast } = useToast();
  const [newSlot, setNewSlot] = useState<Partial<TimetableSlot>>({
    subject: "", room: "", day: "Monday", startTime: "09:00", endTime: "10:00", colorTag: COLORS[0]
  });

  const loadSlots = () => fetchCollection('timetable').then(setSlots);
  useEffect(() => { loadSlots(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem('timetable', newSlot);
      showToast("Class added to timetable", "success");
      setIsAdding(false);
      setNewSlot({ subject: "", room: "", day: "Monday", startTime: "09:00", endTime: "10:00", colorTag: COLORS[0] });
      loadSlots();
    } catch (err) {
      showToast("Failed to add class", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteItem('timetable', id);
      showToast("Class removed", "info");
      loadSlots();
    } catch (err) {
      showToast("Failed to remove class", "error");
    }
  };

  const handleDragStart = (e: React.DragEvent, slotId: string | number) => {
    e.dataTransfer.setData("slotId", slotId.toString());
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string) => {
    e.preventDefault();
    const slotIdStr = e.dataTransfer.getData("slotId");
    if (!slotIdStr) return;

    const slot = slots.find(s => s.id.toString() === slotIdStr);
    if (!slot) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;

    // 1 hour = 60px
    let hours = 8 + Math.floor(y / 60);
    let minutes = Math.floor((y % 60) / 15) * 15; // nearest 15 mins

    if (hours < 8) hours = 8;
    if (hours > 19) hours = 19;

    const newStartTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const [stH, stM] = slot.startTime.split(':').map(Number);
    const [enH, enM] = slot.endTime.split(':').map(Number);
    const durationMins = (enH * 60 + enM) - (stH * 60 + stM);

    const endTotalMins = (hours * 60 + minutes) + durationMins;
    const newEnH = Math.floor(endTotalMins / 60);
    const newEnM = endTotalMins % 60;
    const newEndTimeStr = `${newEnH.toString().padStart(2, '0')}:${newEnM.toString().padStart(2, '0')}`;

    try {
      await updateItem('timetable', slot.id, {
        day: targetDay,
        startTime: newStartTimeStr,
        endTime: newEndTimeStr
      });
      loadSlots();
    } catch (err) {
      showToast("Failed to move class", "error");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex items-center justify-between shrink-0">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Timetable</h2>
           <p className="text-gray-400 mt-1">Manage your weekly class schedule</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-violet-700 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(212,0,255,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-white">
          <Plus className="w-4 h-4"/> Add Class
        </button>
      </header>

      <SpecialEventsBanner />

      {isAdding && (
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md shrink-0 relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button onClick={() => setIsAdding(false)} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add New Class</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required type="text" placeholder="Subject" value={newSlot.subject} onChange={e => setNewSlot({...newSlot, subject: e.target.value})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-500" />
            <input required type="text" placeholder="Room" value={newSlot.room} onChange={e => setNewSlot({...newSlot, room: e.target.value})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-500" />
            <select required value={newSlot.day} onChange={e => setNewSlot({...newSlot, day: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors">
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input required type="time" value={newSlot.startTime} onChange={e => setNewSlot({...newSlot, startTime: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors" style={{colorScheme: 'dark'}} />
            <input required type="time" value={newSlot.endTime} onChange={e => setNewSlot({...newSlot, endTime: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors" style={{colorScheme: 'dark'}} />
            <div className="flex items-center justify-between bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3">
               {COLORS.map(c => (
                 <button key={c} type="button" onClick={() => setNewSlot({...newSlot, colorTag: c})} className={`w-6 h-6 rounded-full cursor-pointer transition-all border-2 ${newSlot.colorTag === c ? 'scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{backgroundColor: c, borderColor: newSlot.colorTag === c ? 'white' : 'transparent', boxShadow: newSlot.colorTag === c ? `0 0 10px ${c}` : 'none'}} />
               ))}
            </div>
            <button type="submit" className="md:col-span-3 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors mt-2 border border-white/10 tracking-wide">Save Timetable Entry</button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar pb-4 relative">
        <div className="min-w-[800px] flex relative h-[780px] bg-white/[0.01] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm">
           {/* Timeline Header */}
           <div className="flex w-full absolute top-0 left-0 bg-[#0D0D14]/80 backdrop-blur z-30 border-b border-white/10 h-12">
             <div className="w-16 shrink-0 border-r border-white/5"></div>
             {DAYS.map(day => (
                <div key={day} className="flex-1 border-r border-white/5 last:border-0 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{day}</div>
             ))}
           </div>
           
           {/* Time grid */}
           <div className="absolute top-12 left-0 w-full flex h-[720px] z-10 pointer-events-none">
             <div className="w-16 shrink-0 border-r border-white/5 bg-[#0D0D14]/50 flex flex-col pt-0">
               {Array.from({length: 12}).map((_, i) => (
                 <div key={i} className="h-[60px] text-[10px] text-gray-600 font-bold text-right pr-2 relative" style={{ top: '-6px' }}>
                   {i+8}:00
                 </div>
               ))}
             </div>
             {DAYS.map(day => (
                <div key={day} className="flex-1 border-r border-white/5 last:border-0 flex flex-col">
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="h-[60px] border-b border-white/[0.02] w-full"></div>
                  ))}
                </div>
             ))}
           </div>

           {/* Droppable columns */}
           <div className="absolute top-12 left-0 w-full flex h-[720px] z-20">
             <div className="w-16 shrink-0" />
             {DAYS.map(day => (
                <div 
                   key={`drop-${day}`} 
                   className="flex-1 relative"
                   onDragOver={handleDragOver}
                   onDrop={e => handleDrop(e, day)}
                >
                   {slots.filter(s => s.day === day).map(slot => {
                      const [stH, stM] = slot.startTime.split(':').map(Number);
                      const [enH, enM] = slot.endTime.split(':').map(Number);
                      const top = (stH - 8) * 60 + stM;
                      const height = ((enH * 60 + enM) - (stH * 60 + stM));
                      
                      return (
                        <div 
                           key={slot.id} 
                           draggable
                           onDragStart={(e) => handleDragStart(e, slot.id)}
                           className="absolute left-1 right-1 rounded-xl p-2 transition-all hover:z-30 overflow-hidden shadow-lg border border-white/10 group cursor-grab active:cursor-grabbing backdrop-blur-md"
                           style={{
                              top: `${Math.max(0, top)}px`, 
                              height: `${Math.max(20, height)}px`,
                              backgroundColor: `${slot.colorTag}15`,
                              borderColor: `${slot.colorTag}40`
                           }}
                        >
                           <div className="absolute top-0 left-0 w-1 h-full" style={{backgroundColor: slot.colorTag, boxShadow: `0 0 10px ${slot.colorTag}`}}></div>
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 bg-[#0D0D14] rounded-md border border-white/10 z-10">
                              <X className="w-3 h-3"/>
                           </button>
                           <h4 className="font-bold text-white mb-1 break-words pr-5 text-xs leading-none line-clamp-2">{slot.subject}</h4>
                           {(height >= 45) && (
                              <div className="flex flex-col gap-1 mt-1.5">
                                <div className="text-[9px] text-white/60 font-medium">{slot.startTime} - {slot.endTime}</div>
                                <div className="text-[9px] text-gray-400 w-fit px-1.5 py-0.5 border border-white/10 rounded truncate bg-[#0D0D14]/20">{slot.room}</div>
                              </div>
                           )}
                           {(height < 45 && height >= 30) && (
                              <div className="text-[9px] text-white/50 font-medium">{slot.startTime}</div>
                           )}
                        </div>
                      )
                   })}
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
