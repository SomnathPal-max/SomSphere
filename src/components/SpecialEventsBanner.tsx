import React, { useEffect, useState } from 'react';
import { fetchUniversityEvents, UniversityEvent } from '../services/UniversityEventsService';
import { CalendarDays, AlertTriangle } from 'lucide-react';

export function SpecialEventsBanner() {
  const [events, setEvents] = useState<UniversityEvent[]>([]);

  useEffect(() => {
    fetchUniversityEvents().then(data => {
      setEvents(data);
    });
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {events.map(event => (
        <div key={event.id} className={`flex items-center gap-3 p-3 rounded-xl border ${event.type === 'HOLIDAY' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' : 'bg-orange-500/10 border-orange-500/20 text-orange-200'}`}>
          <div className="shrink-0">
             {event.type === 'HOLIDAY' ? <CalendarDays className="w-5 h-5 text-indigo-400" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
          </div>
          <div className="flex-1 flex items-center justify-between">
             <div className="text-sm font-bold tracking-wide flex items-center gap-2">
               {event.type === 'HOLIDAY' ? 'HOLIDAY' : 'EXAM PERIOD'}: <span className="opacity-80">{event.title}</span>
             </div>
             <div className="text-xs opacity-70 font-medium">
               {event.date}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
