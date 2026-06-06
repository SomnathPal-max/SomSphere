import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  fetchCollection,
  createItem,
  updateItem,
  deleteItem,
  apiFetch,
} from "../api";
import type { Assignment } from "../types";
import {
  Plus,
  LayoutList,
  Columns,
  FileSearch,
  Loader2,
  Trash2,
  ArrowUpDown,
  X,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useToast } from "../ToastContext";
import { AutoSaveToast } from "../components/AutoSaveToast";
import { format, subDays, isToday, isTomorrow, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { playNotificationChime } from "../utils/audio";
import { TaskInsightBadge } from "../components/TaskInsightBadge";

export function TaskManager() {
  const location = useLocation();
  const [view, setView] = useState<"LIST" | "KANBAN">("KANBAN");
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const hasAlertedRef = useRef(false);
  const [syllabusText, setSyllabusText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSmartSorting, setIsSmartSorting] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Assignment>>({
    title: "",
    description: "",
    subject: "",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "MEDIUM",
    status: "TODO",
  });
  const [sortField, setSortField] = useState<"dueDate" | "priority">("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string | number>>(
    new Set(),
  );
  const { showToast } = useToast();

  useEffect(() => {
    if (location.state?.openNewTaskModal) {
      setIsAddModalOpen(true);
      // Clean up the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadTasks = () => fetchCollection("assignments").then(setTasks);
  useEffect(() => {
    loadTasks();
  }, []);

  const toggleSelection = (id: string | number) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTasks(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedTasks.size === tasks.length && tasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedTasks).map((id) => deleteItem("assignments", id)),
      );
      showToast(`${selectedTasks.size} tasks deleted`, "success");
      setSelectedTasks(new Set());
      loadTasks();
    } catch (e) {
      showToast("Failed to delete tasks", "error");
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      await Promise.all(
        Array.from(selectedTasks).map((id) =>
          updateItem("assignments", id, { status }),
        ),
      );
      showToast(
        `Marked ${selectedTasks.size} tasks as ${status.replace("_", " ")}`,
        "success",
      );
      setSelectedTasks(new Set());
      loadTasks();
    } catch (e) {
      showToast("Failed to update tasks", "error");
    }
  };

  const handleBulkPriorityChange = async (priority: string) => {
    try {
      await Promise.all(
        Array.from(selectedTasks).map((id) =>
          updateItem("assignments", id, { priority }),
        ),
      );
      showToast(`Changed priority for ${selectedTasks.size} tasks`, "success");
      setSelectedTasks(new Set());
      loadTasks();
    } catch (e) {
      showToast("Failed to update tasks", "error");
    }
  };

  const handleParse = async () => {
    if (!syllabusText.trim()) return;
    setParsing(true);
    showToast("Analyzing syllabus...", "info");
    try {
      const { assignments } = await apiFetch("/api/gemini/parse-syllabus", {
        method: "POST",
        body: JSON.stringify({ content: syllabusText }),
      });
      for (const a of assignments) {
        await createItem("assignments", { ...a, status: "TODO" });
      }
      setSyllabusText("");
      showToast(
        `Successfully extracted ${assignments.length} tasks!`,
        "success",
      );
      playNotificationChime();
      loadTasks();
    } catch (e) {
      showToast("Failed to parse syllabus", "error");
    } finally {
      setParsing(false);
    }
  };

  const handleSmartSort = async () => {
    if (!newTask.title && !newTask.description) {
      showToast("Please enter a title or description first.", "info");
      return;
    }
    setIsSmartSorting(true);
    try {
      const result = await apiFetch("/api/gemini/smart-sort", {
        method: "POST",
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
        }),
      });
      setNewTask((prev) => ({
        ...prev,
        subject: result.subject || prev.subject,
        priority: result.priority || prev.priority,
      }));
      showToast("Smart Sort applied!", "success");
    } catch (e) {
      showToast("Smart Sort failed", "error");
    } finally {
      setIsSmartSorting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.subject) return;
    try {
      await createItem("assignments", newTask as Assignment);
      showToast("New task created", "success");
      playNotificationChime();
      setIsAddModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        subject: "",
        dueDate: new Date().toISOString().split("T")[0],
        priority: "MEDIUM",
        status: "TODO",
      });
      loadTasks();
    } catch (e) {
      showToast("Failed to create task", "error");
    }
  };

  // Check for upcoming deadlines when tasks are loaded
  useEffect(() => {
    if (tasks.length === 0 || hasAlertedRef.current) return;
    const hasApproachingDeadline = tasks.some((t) => {
      if (t.status === "DONE" || !t.dueDate) return false;
      const d = parseISO(t.dueDate);
      return isToday(d) || isTomorrow(d);
    });
    if (hasApproachingDeadline) {
      playNotificationChime();
      showToast("You have tasks due soon!", "info");
      hasAlertedRef.current = true;
    }
  }, [tasks, showToast]);

  const updateStatus = async (id: string | number, status: string) => {
    try {
      await updateItem("assignments", id, { status });
      setShowDraftSaved(true);
      loadTasks();
    } catch (e) {
      showToast("Failed to update task", "error");
    }
  };

  const handleSortPriority = () => {
    if (sortField === "priority") {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField("priority");
      setSortDirection("asc");
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === "priority") {
      const pOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = pOrder[b.priority] - pOrder[a.priority];
      return sortDirection === "asc" ? diff : -diff;
    }
    return 0; // Or standard due date sort
  });

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      data.push({
        date: format(d, "MMM d"),
        completed: dayTasks.filter((t) => t.status === "DONE").length,
        due: dayTasks.length,
      });
    }
    return data;
  }, [tasks]);

  return (
    <div className="h-full flex flex-col space-y-6 relative overflow-hidden">
      <header className="flex items-center justify-between shrink-0">
        <h2 className="text-3xl font-bold tracking-tight">Task Manager</h2>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setView("LIST")}
            className={clsx(
              "p-2 rounded-md transition-colors",
              view === "LIST"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white",
            )}
          >
            <LayoutList className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView("KANBAN")}
            className={clsx(
              "p-2 rounded-md transition-colors",
              view === "KANBAN"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white",
            )}
          >
            <Columns className="w-5 h-5" />
          </button>
        </div>
      </header>

      <TaskInsightBadge tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        {/* AI Parsing Banner */}
        <div className="lg:col-span-2 glass-card p-4 flex gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <label className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-pink-400" /> Parse Syllabus
              with AI
            </label>
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste syllabus text here..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500 h-20 resize-none custom-scrollbar"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleParse}
              disabled={parsing}
              className="bg-[#4F378B] hover:bg-[#6043A8] text-white px-6 py-3 rounded-xl font-medium transition-colors border border-[#4F378B] shadow-lg shadow-purple-900/30 flex items-center gap-2 w-full justify-center"
            >
              {parsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Extract Tasks"
              )}
            </button>
          </div>
        </div>

        {/* 7-Day Trend Chart */}
        <div className="glass-card p-4 flex flex-col justify-between hidden sm:flex">
          <h3 className="text-sm font-bold text-white/70 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> 7-Day Completion
            Trend
          </h3>
          <div className="h-20 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" hide />
                <Line
                  type="monotone"
                  dataKey="due"
                  name="Due"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A24",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "4px",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 glass-card border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-80" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No tasks yet</h3>
          <p className="text-gray-400 max-w-sm mx-auto mb-8">
            Your task list is a clean slate. Create your first assignment or use
            AI to extract tasks directly from your syllabus.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create First Task
          </button>
        </div>
      ) : view === "KANBAN" ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-4">
          <KanbanColumn
            title="To Do"
            status="TODO"
            tasks={tasks}
            onStatusChange={updateStatus}
            onAdd={() => setIsAddModalOpen(true)}
          />
          <KanbanColumn
            title="In Progress"
            status="IN_PROGRESS"
            tasks={tasks}
            onStatusChange={updateStatus}
          />
          <KanbanColumn
            title="Done"
            status="DONE"
            tasks={tasks}
            onStatusChange={updateStatus}
          />
        </div>
      ) : (
        <div className="flex-1 glass-card overflow-auto custom-scrollbar p-1 relative">
          {selectedTasks.size > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#4F378B] border border-white/20 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4 z-10 animate-in slide-in-from-top-4 duration-300">
              <span className="text-sm font-bold">
                {selectedTasks.size} selected
              </span>
              <div className="h-4 w-px bg-white/20" />
              <button
                onClick={() => handleBulkStatusChange("DONE")}
                className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 flex items-center gap-1 rounded transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> Complete
              </button>
              <div className="relative group">
                <button className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 flex items-center gap-1 rounded transition-colors">
                  <ArrowUpDown className="w-3 h-3" /> Priority
                </button>
                <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col bg-[#1A1A24] border border-white/10 rounded overflow-hidden shadow-xl">
                  <button
                    onClick={() => handleBulkPriorityChange("HIGH")}
                    className="text-[10px] text-left px-3 py-1.5 hover:bg-white/10 text-red-400"
                  >
                    High
                  </button>
                  <button
                    onClick={() => handleBulkPriorityChange("MEDIUM")}
                    className="text-[10px] text-left px-3 py-1.5 hover:bg-white/10 text-yellow-400"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handleBulkPriorityChange("LOW")}
                    className="text-[10px] text-left px-3 py-1.5 hover:bg-white/10 text-emerald-400"
                  >
                    Low
                  </button>
                </div>
              </div>
              <button
                onClick={handleBulkDelete}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-1 flex items-center gap-1 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 sticky top-0 backdrop-blur-md text-white/60">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      tasks.length > 0 && selectedTasks.size === tasks.length
                    }
                    onChange={toggleAllSelection}
                    className="w-4 h-4 rounded border-gray-600 bg-[#0D0D14] focus:ring-purple-500/50"
                  />
                </th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Due Date</th>
                <th
                  className="px-6 py-4 font-medium flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                  onClick={handleSortPriority}
                >
                  Priority <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTasks.map((task) => (
                <tr
                  key={task.id}
                  className={clsx(
                    "transition-colors",
                    selectedTasks.has(task.id)
                      ? "bg-white/10"
                      : "hover:bg-white/[0.02]",
                  )}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => toggleSelection(task.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-[#0D0D14] focus:ring-purple-500/50"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">{task.title}</td>
                  <td className="px-6 py-4 text-white/70">{task.subject}</td>
                  <td className="px-6 py-4 text-white/70">{task.dueDate}</td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        "px-2 py-1 rounded text-xs font-semibold",
                        task.priority === "HIGH"
                          ? "bg-red-500/20 text-red-300"
                          : task.priority === "MEDIUM"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-emerald-500/20 text-emerald-300",
                      )}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                      className="bg-transparent text-white/90 border border-white/20 outline-none rounded p-1 text-xs"
                    >
                      <option className="bg-[#0D0D14]" value="TODO">
                        To Do
                      </option>
                      <option className="bg-[#0D0D14]" value="IN_PROGRESS">
                        In Progress
                      </option>
                      <option className="bg-[#0D0D14]" value="DONE">
                        Done
                      </option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() =>
                        deleteItem("assignments", task.id).then(loadTasks)
                      }
                      className="text-white/40 hover:text-red-400 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A24] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleAddSubmit} className="flex flex-col h-full">
              <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Create New Task
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider">
                      Task Title & Description
                    </label>
                    <button
                      type="button"
                      onClick={handleSmartSort}
                      disabled={
                        isSmartSorting ||
                        (!newTask.title && !newTask.description)
                      }
                      className="flex items-center gap-1.5 text-xs font-bold text-pink-400 hover:text-pink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-pink-500/10 hover:bg-pink-500/20 px-2.5 py-1 rounded-lg"
                    >
                      {isSmartSorting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Smart Sort
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-t-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500/50 mb-[1px]"
                    placeholder="e.g. Read Chapter 4"
                  />
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-b-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500/50 resize-none h-20 text-sm"
                    placeholder="Add details, links, or notes..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.subject}
                    onChange={(e) =>
                      setNewTask({ ...newTask, subject: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500/50"
                    placeholder="e.g. History"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          priority: e.target.value as "HIGH" | "MEDIUM" | "LOW",
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500/50 appearance-none"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-white/5 flex gap-3 justify-end shrink-0 bg-[#0D0D14]/30 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Save Notification */}
      <AutoSaveToast
        show={showDraftSaved}
        onHide={() => setShowDraftSaved(false)}
        message="Task Status Saved"
      />
    </div>
  );
}

function KanbanColumn({
  title,
  status,
  tasks,
  onStatusChange,
  onAdd,
}: {
  title: string;
  status: string;
  tasks: Assignment[];
  onStatusChange: (id: string | number, s: string) => void;
  onAdd?: () => void;
}) {
  const columnTasks = tasks.filter((t) => t.status === status);

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden bg-white/[0.02]">
      <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/5">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          {title}{" "}
          <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">
            {columnTasks.length}
          </span>
        </h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="p-1 hover:bg-white/10 rounded-md text-white/60 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {columnTasks.map((task) => (
          <div
            key={task.id}
            className="bg-[#0D0D14]/80 border border-white/10 rounded-xl p-4 shadow-xl hover:border-white/20 transition-all cursor-move group relative"
          >
            <h4 className="font-medium text-white/90 leading-tight mb-2 pr-6">
              {task.title}
            </h4>
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-black/50 text-white/90 text-xs rounded border border-white/20 p-1 w-20 cursor-pointer"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded truncate max-w-[100px]">
                {task.subject}
              </span>
              <span
                className={clsx(
                  "w-2 h-2 rounded-full",
                  task.priority === "HIGH"
                    ? "bg-red-500"
                    : task.priority === "MEDIUM"
                      ? "bg-yellow-500"
                      : "bg-emerald-500",
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
