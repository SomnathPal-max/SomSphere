import React, { useState, useEffect } from "react";
import { Plus, X, Wallet, TrendingDown, Trash2, Download, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { fetchCollection, createItem, deleteItem, apiFetch } from "../api";
import type { Expense } from "../types";
import { format } from "date-fns";
import clsx from "clsx";
import { useToast } from "../ToastContext";
import { runGmailSync } from "../services/gmailSync";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getAccessToken, googleSignIn } from "../firebase";

const CATEGORIES = ["FOOD", "HOUSING", "TRANSPORT", "BOOKS", "ENTERTAINMENT", "OTHER"];
const CATEGORY_COLORS: Record<string, string> = {
  "FOOD": "#EC4899", // pink
  "HOUSING": "#14B8A6", // teal
  "TRANSPORT": "#3B82F6", // blue
  "BOOKS": "#8B5CF6", // purple
  "ENTERTAINMENT": "#F59E0B", // yellow
  "OTHER": "#10B981" // emerald
};

export function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number>(500); // Default mock budget
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0,
    category: "FOOD",
    date: new Date().toISOString().split('T')[0],
    description: ""
  });

  const syncGooglePay = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const result = await googleSignIn();
        if (result) token = result.accessToken;
      } catch (err) {
        showToast("Failed to authenticate with Google", "error");
        return;
      }
    }
    if (!token) return;

    try {
      setIsSyncing(true);
          const newCount = await runGmailSync();
          if (newCount > 0) {
            showToast(`Synced ${newCount} transactions from Google Pay!`, "success");
            loadExpenses();
          } else {
            showToast("No new transactions to sync", "info");
          }
        } catch (e) {
          console.error(e);
          showToast("Failed to sync Google Pay", "error");
        } finally {
          setIsSyncing(false);
        }
    };

  const loadExpenses = () => fetchCollection('expenses').then(data => {
    // Sort descending by date
    setExpenses(data.sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  });

  useEffect(() => {
    loadExpenses();
    const savedBudget = localStorage.getItem('somsphere_budget');
    if (savedBudget) setBudget(Number(savedBudget));
  }, []);

  const handleBudgetChange = (val: number) => {
    setBudget(val);
    localStorage.setItem('somsphere_budget', val.toString());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) return;
    await createItem('expenses', newExpense);
    showToast("Expense added", "success");
    setIsAdding(false);
    setNewExpense({
      amount: 0,
      category: "FOOD",
      date: new Date().toISOString().split('T')[0],
      description: ""
    });
    loadExpenses();
  };

  const handleDelete = async (id: string | number) => {
    await deleteItem('expenses', id);
    showToast("Expense deleted", "info");
    loadExpenses();
  };

  const exportToCSV = () => {
    if (expenses.length === 0) {
      showToast("No expenses to export", "info");
      return;
    }
    const headers = ["Date", "Description", "Category", "Amount"];
    const csvContent = [
      headers.join(","),
      ...expenses.map(e => `${e.date},"${e.description.replace(/"/g, '""')}",${e.category},${e.amount}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expenses_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported to CSV", "success");
  };

  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget - totalSpent;
  const percentUsed = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  const categoryTotals = CATEGORIES.map(category => {
    const total = currentMonthExpenses.filter(e => e.category === category).reduce((sum, e) => sum + Number(e.amount), 0);
    return { category, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (expenses.length === 0) return;
    const fetchInsight = async () => {
      setAnalyzing(true);
      try {
        const res = await apiFetch('/api/gemini/expense-analysis', {
          method: 'POST',
          body: JSON.stringify({ expenses: expenses.slice(0, 30) })
        });
        setAiInsight(res.text);
      } catch (err) {
        console.error("AI Insight Error:", err);
      } finally {
        setAnalyzing(false);
      }
    };
    
    // Only analyze when expenses change and not already analyzing.
    // Use a small timeout to avoid spamming the API on rapid deletes/adds.
    const timeout = setTimeout(fetchInsight, 2000);
    return () => clearTimeout(timeout);
  }, [expenses]);

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white">Expense Tracker</h2>
           <p className="text-gray-400 mt-1">Manage your budget and track spending</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={syncGooglePay} disabled={isSyncing} className={clsx("p-2.5 bg-white/5 border border-white/10 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold tracking-wide", isSyncing ? "text-pink-400 opacity-80" : "text-gray-300 hover:text-white hover:bg-white/10")} title="Sync Google Pay via Gmail">
             <RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
             <span className="hidden md:inline">{isSyncing ? "Syncing..." : "Sync GPay"}</span>
          </button>
          <button onClick={exportToCSV} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-gray-300 hover:text-white" title="Export to CSV">
            <Download className="w-4 h-4"/>
          </button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Monthly Budget</span>
             <div className="flex items-center text-pink-400 font-bold">
               ₹ <input type="number" value={budget} onChange={(e) => handleBudgetChange(Number(e.target.value))} className="bg-transparent border-none outline-none focus:ring-0 w-20 text-right text-lg" min="0" step="10" />
             </div>
          </div>
          <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-violet-700 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(212,0,255,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-white">
            <Plus className="w-4 h-4"/> Add Expense
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md shrink-0 relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6"><TrendingDown className="w-4 h-4 inline mr-2"/>New Expense</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Amount (₹)</label>
              <input required type="number" step="0.01" min="0" placeholder="0.00" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Category</label>
              <select required value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
               <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Date</label>
               <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="bg-[#0D0D14] text-white border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors w-full" style={{colorScheme: 'dark'}} />
            </div>
            <div className="flex flex-col gap-1 lg:col-span-4 mt-2">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest ml-1">Description</label>
              <input required type="text" placeholder="What did you spend on?" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="bg-[#0D0D14]/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 transition-colors text-white placeholder-gray-600" />
            </div>
            <button type="submit" className="lg:col-span-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors mt-2 border border-white/10 tracking-wide">Save Expense</button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col space-y-8 pr-2 pb-8">
        
        {/* AI Insight */}
        {expenses.length > 0 && (
          <div className="glass-card bg-gradient-to-r from-violet-900/40 to-[#0D0D14] border border-violet-500/30 rounded-[32px] p-6 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 border border-violet-500/40">
                <Sparkles className="w-6 h-6 text-violet-300" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-bold text-violet-200 tracking-wide">Gemini Financial Insight</h3>
                {analyzing ? (
                  <div className="flex items-center gap-2 text-violet-400/70 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing your spending patterns...</span>
                  </div>
                ) : (
                  <div className="text-sm text-violet-100/80 leading-relaxed font-medium">
                    {aiInsight || "Add more expenses to see personalized financial insights."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
          {/* Summary Card */}
          <div className="glass-card bg-gradient-to-br from-[#0D0D14] to-violet-950/30 border border-white/10 rounded-[32px] p-8 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 blur-[50px] rounded-full pointer-events-none" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-8">This Month</h3>
            
            <div className="flex-1 flex flex-col justify-center mb-8">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Spent</div>
              <div className="text-5xl font-black tracking-tight text-white focus:outline-none focus:ring-0">
                ₹{totalSpent.toFixed(2)}
              </div>
              <div className="mt-2 text-sm text-gray-400 font-medium tracking-wide">
                ₹{remaining.toFixed(2)} remaining
              </div>
            </div>

            <div className="w-full bg-[#0D0D14] h-2.5 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className={clsx("h-full rounded-full transition-all duration-1000 ease-out", percentUsed > 90 ? "bg-red-500 shadow-[0_0_10px_#EF4444]" : percentUsed > 75 ? "bg-yellow-500 shadow-[0_0_10px_#F59E0B]" : "bg-emerald-500 shadow-[0_0_10px_#10B981]")} 
                style={{ width: `${percentUsed}%` }} 
              />
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="lg:col-span-2 glass-card bg-white/[0.02] border border-white/10 rounded-[32px] p-8 flex flex-col">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6">Spending by Category</h3>
             <div className="flex-1 flex flex-col md:flex-row gap-8 items-center">
                {categoryTotals.length === 0 ? (
                  <div className="w-full text-center text-gray-500 text-sm uppercase tracking-widest py-8">No spending yet</div>
                ) : (
                  <>
                    <div className="w-full md:w-1/2 h-[200px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryTotals}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="total"
                            stroke="none"
                          >
                            {categoryTotals.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || "#fff"} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => `₹${value.toFixed(2)}`}
                            contentStyle={{ backgroundColor: '#0D0D14', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6">
                      {categoryTotals.map(item => {
                        const pct = (item.total / totalSpent) * 100;
                        const color = CATEGORY_COLORS[item.category] || "#fff";
                        return (
                          <div key={item.category}>
                            <div className="flex justify-between items-end mb-2">
                               <span className="text-xs font-bold text-gray-300 tracking-wider flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full" style={{backgroundColor: color}}/>
                                 {item.category}
                               </span>
                               <span className="text-sm font-bold text-white">₹{item.total.toFixed(2)} <span className="text-[10px] text-gray-500 ml-1 font-normal uppercase tracking-widest">{pct.toFixed(0)}%</span></span>
                            </div>
                            <div className="w-full bg-[#0D0D14] h-1.5 rounded-full overflow-hidden">
                               <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}80` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="glass-card bg-white/[0.02] border border-white/5 rounded-[32px] p-6 shrink-0">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 pl-2">Recent Transactions</h3>
          <div className="space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="group relative bg-[#0D0D14]/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/5 hover:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-gray-400"/>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{expense.description}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border bg-[#0D0D14]" style={{color: CATEGORY_COLORS[expense.category] || '#fff', borderColor: `${CATEGORY_COLORS[expense.category] || '#fff'}40`}}>
                        {expense.category}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-white">
                    -₹{Number(expense.amount).toFixed(2)}
                  </div>
                  <button onClick={() => handleDelete(expense.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-colors bg-[#0D0D14] rounded-lg border border-white/10 shrink-0">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
               <div className="py-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em] bg-[#0D0D14]/20">No transactions recorded</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
