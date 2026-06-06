import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Assignment } from '../types';

export function TaskProgressRing({ assignments }: { assignments: Assignment[] }) {
  const data = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === 'DONE').length;
    const pending = total - completed;

    return [
      { name: 'Completed', value: completed, color: '#10B981' }, // Emerald
      { name: 'Pending', value: pending, color: '#F59E0B' }, // Amber
    ];
  }, [assignments]);

  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === 'DONE').length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative">
      <h3 className="text-lg font-semibold mb-2">Assignment Progress</h3>
      <p className="text-xs text-gray-400 mb-4">Overall completion status</p>
      
      <div className="flex-1 relative flex items-center justify-center min-h-[200px]">
        {total === 0 ? (
          <div className="text-sm text-gray-500 text-center">No assignments</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="70%"
                  outerRadius="90%"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(26, 26, 36, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-white">{percentage}%</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Done</span>
            </div>
          </>
        )}
      </div>
      
      {total > 0 && (
        <div className="flex justify-center gap-4 mt-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-white/80">{completed} Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span className="text-xs text-white/80">{total - completed} Pending</span>
          </div>
        </div>
      )}
    </div>
  );
}
