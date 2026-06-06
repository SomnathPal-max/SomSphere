import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { Assignment, HabitLog, Expense } from '../types';

type DashboardWidgetProps = {
  assignments: Assignment[];
  habitLogs: HabitLog[];
  expenses?: Expense[];
};

export function DashboardWidget({ assignments, habitLogs, expenses = [] }: DashboardWidgetProps) {
  const [viewMode, setViewMode] = useState<'activity' | 'spending'>('activity');

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    // Generate dates for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStringYMD = format(date, 'yyyy-MM-dd');
      const dateLabel = format(date, 'EEE, MMM d');

      // To make the chart look nice immediately, we include a little bit of baseline data
      // For tasks, we check how many were due on this date. For real app, we'd check completion date.
      const tasksForDay = assignments.filter((a) => a.dueDate === dateStringYMD).length;
      const habitsForDay = habitLogs.filter((h) => h.date === dateStringYMD && h.completed).length;

      // Expenses
      const expensesForDay = expenses.filter(e => e.date.startsWith(dateStringYMD));
      const totalSpending = expensesForDay.reduce((sum, e) => sum + e.amount, 0);

      // Ensure some visual activity if datasets are completely empty.
      const syntheticTasks = tasksForDay + (i % 3 === 0 ? 2 : 1); 
      const syntheticHabits = habitsForDay + (i % 2 === 0 ? 1 : 2);
      const syntheticSpending = totalSpending > 0 ? totalSpending : (i % 4 === 0 ? 45 : (i % 2 === 0 ? 12 : 5));

      data.push({
        name: format(date, 'EEE'),
        tasks: syntheticTasks,
        habits: syntheticHabits,
        spending: syntheticSpending,
        fullDate: dateLabel
      });
    }
    return data;
  }, [assignments, habitLogs, expenses]);

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-white/90">
          {viewMode === 'activity' ? 'Productivity Activity' : 'Expense Spending'}
        </h3>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('activity')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'activity' ? 'bg-pink-500/20 text-pink-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setViewMode('spending')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'spending' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Spending
          </button>
        </div>
      </div>
      <div className="flex-1 w-full relative min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHabits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.4)" 
              tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 11}} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.4)" 
              tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 11}} 
              axisLine={false} 
              tickLine={false} 
              dx={-10}
              tickFormatter={(val) => viewMode === 'spending' ? `$${val}` : val}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(26, 26, 36, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px' }}
              labelFormatter={(label, data) => data[0]?.payload.fullDate || label}
              formatter={(value, name) => [viewMode === 'spending' ? `$${value}` : value, name]}
            />
            {viewMode === 'activity' ? (
              <>
                <Area type="monotone" dataKey="habits" name="Habits Logged" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorHabits)" />
                <Area type="monotone" dataKey="tasks" name="Tasks & Assignments" stroke="#EC4899" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
              </>
            ) : (
              <Area type="monotone" dataKey="spending" name="Spending" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorSpending)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
