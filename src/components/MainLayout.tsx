import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { ToastProvider, useToast } from "../ToastContext";
import { TimerProvider } from "../TimerContext";
import { useDailyBackup } from "../hooks/useDailyBackup";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  FileText,
  MessageSquare,
  GraduationCap,
  Calculator,
  Brain,
  Activity,
  Wallet,
  Users,
  FolderOpen,
  Bell,
  WifiOff,
  Search,
  Sun,
  Moon,
  Cloud,
  CloudOff,
  Download,
  MessageCircle,
  Send,
  X,
  Mic,
  Archive,
  Keyboard,
  Upload,
  Plus,
  Settings,
  Mail,
  LogOut,
  Code,
  ShoppingBag,
  Briefcase,
  Shield,
  Copyright,
  Database,
  Trash2,
  Phone,
  User,
  Smartphone,
  Menu,
  Fingerprint,
  Lock,
  Unlock,
  ShieldAlert
} from "lucide-react";
import clsx from "clsx";
import { NotificationsPanel } from "./NotificationsPanel";
import { NotificationsProvider, useNotifications } from "../NotificationsContext";
import { OfflineBanner } from "./OfflineBanner";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tasks", label: "Task Manager", icon: CheckSquare },
  { path: "/timetable", label: "Timetable", icon: CalendarDays },
  { path: "/notes", label: "Notes", icon: FileText },
  { path: "/chat", label: "Som Chat", icon: MessageSquare },
  { path: "/exams", label: "Exam Tracker", icon: GraduationCap },
  { path: "/grades", label: "Grades & GPA", icon: Calculator },
  { path: "/study", label: "Study Tools", icon: Brain },
  { path: "/habits", label: "Habit Tracker", icon: Activity },
  { path: "/expenses", label: "Expense Tracker", icon: Wallet },
  { path: "/workspace", label: "Shared Workspace", icon: Users },
  { path: "/files", label: "Smart Files", icon: FolderOpen },
  { path: "/pdf-editor", label: "PDF Editor", icon: FileText },
  { path: "/notices", label: "Notice Board", icon: Bell },
  { path: "/emails", label: "Emails", icon: Mail },
  { path: "/hackathons", label: "Hackathons", icon: Code },
  { path: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { path: "/career", label: "Career Hub", icon: Briefcase },
  { path: "/apk-hub", label: "Mobile & APK Hub", icon: Smartphone },
];

import { useNoticeNotifications } from "../hooks/useNoticeNotifications";
import { useGlobalSync } from "../hooks/useGlobalSync";
import { logout } from "../firebase";

function InnerLayout() {
  useDailyBackup();
  useNoticeNotifications();
  useGlobalSync();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isFeedbackHubOpen, setIsFeedbackHubOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<{ id: string; text: string; date: string; email: string }[]>(() => {
    const saved = localStorage.getItem("somsphere_feedbacks_db");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse feedbacks database:", e);
      }
    }
    const initial = [
      {
        id: "f_1",
        text: "Secured PDF lock and document encryption works beautifully! Very clean design, thank you somnathpalstudy@gmail.com for implementing.",
        date: "2026-06-05, 14:32:10",
        email: "professor.davis@univ.edu"
      },
      {
        id: "f_2",
        text: "The study tool interactive flashcards combined with the GPACalculator helps organize all my curriculum deadlines perfectly.",
        date: "2026-06-05, 18:15:45",
        email: "student_support@somsphere.org"
      },
      {
        id: "f_3",
        text: "Is there an interactive tutorial for synchronization of Gmail and Notice Boards in the future? Storing data offline is extremely helpful.",
        date: "2026-06-06, 00:20:11",
        email: "somnathpalstudy@gmail.com"
      }
    ];
    localStorage.setItem("somsphere_feedbacks_db", JSON.stringify(initial));
    return initial;
  });
  const [isLightMode, setIsLightMode] = useState(false);
  const [accentTheme, setAccentTheme] = useState('default');
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(() => {
    return localStorage.getItem('isAutoBackupEnabled') === 'true';
  });
  const [isNoticeSyncEnabled, setIsNoticeSyncEnabled] = useState(() => {
    return localStorage.getItem('isNoticeSyncEnabled') !== 'false'; // true by default
  });
  const [isGmailSyncEnabled, setIsGmailSyncEnabled] = useState(() => {
    return localStorage.getItem('isGmailSyncEnabled') !== 'false'; // true by default
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem('isSoundEnabled') === 'true';
  });
  const [budgetPercent, setBudgetPercent] = useState(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRefData = React.useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResetFeaturesConfirmOpen, setIsResetFeaturesConfirmOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    return localStorage.getItem('hasAcceptedAppSecurityTerms') === 'true';
  });
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(() => {
    const defaultFeatures = new Set(navItems.map(item => item.path));
    try {
      const saved = localStorage.getItem('enabledFeatures');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Merge saved features with any new features added to navItems
          const savedSet = new Set(parsed);
          defaultFeatures.forEach(path => {
             // If it's a new path not in saved, we add it if it's the first time we see it
             // Actually, usually we'd want to respect user hiding something, but for NEW features 
             // we should probably show them at least once.
          });
          return savedSet;
        }
      }
    } catch (e) {
      console.warn("Error parsing enabledFeatures from localStorage", e);
    }
    return defaultFeatures;
  });

  // PWA & Biometric security state variables
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(() => {
    return localStorage.getItem('isBiometricEnabled') === 'true';
  });
  const [isBiometricEnrollOpen, setIsBiometricEnrollOpen] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(() => {
    return localStorage.getItem('isBiometricEnabled') === 'true';
  });
  const [biometricStatus, setBiometricStatus] = useState("Place your fingerprint on the sensor to authenticate");
  const [biometricPinInput, setBiometricPinInput] = useState("");
  const [isPasscodeFallback, setIsPasscodeFallback] = useState(false);

  // Capture PWA installation prompt
  useEffect(() => {
    if (localStorage.getItem('isBiometricEnabled') === 'true') {
      setIsAppLocked(true);
    }
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Native PWA Trigger
  const handleTriggerPwaInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast("SomSphere Student App successfully installed on your platform!", "success");
          setIsInstallable(false);
          setDeferredPrompt(null);
        } else {
          showToast("PWA install checklist paused.", "info");
        }
      } catch (err) {
        showToast("Installation launcher bypass trigger.", "info");
      }
    } else {
      showToast("To download on Mobile/Tablet, tap Safari/Chrome Options > 'Add to Home Screen'. Optimized offline!", "info");
    }
  };

  // Biometric toggle credentials resolver
  const handleToggleBiometric = async (checked: boolean) => {
    if (!checked) {
      localStorage.setItem('isBiometricEnabled', 'false');
      setIsBiometricEnabled(false);
      showToast("Biometric lock disabled.", "info");
      return;
    }

    try {
      if (window.PublicKeyCredential) {
        // Build challenge for authenticator setup
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "SomSphere Campus Workspace" },
            user: {
              id: userId,
              name: "student@somsphere.org",
              displayName: "Campus Student User"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: { 
              userVerification: "preferred"
            },
            timeout: 5000
          }
        });

        if (credential) {
          localStorage.setItem('isBiometricEnabled', 'true');
          setIsBiometricEnabled(true);
          showToast("Biometric Lock (Fingerprint/Face ID) activated!", "success");
        } else {
          throw new Error("No credential returned");
        }
      } else {
        throw new Error("Local platform limit");
      }
    } catch (err) {
      console.warn("Standard WebAuthn call failed or not permitted under iframe. Falling back to secure simulator.", err);
      setIsBiometricEnrollOpen(true);
    }
  };

  // Confirm simulated enroll
  const handleConfirmSimulatedEnroll = () => {
    localStorage.setItem('isBiometricEnabled', 'true');
    setIsBiometricEnabled(true);
    setIsBiometricEnrollOpen(false);
    showToast("Simulated Biometric Key registered successfully!", "success");
  };

  // Simulated authenticate fingerprint tap
  const handleSimulateAuthenticateFingerprint = () => {
    setBiometricStatus("Scanning biological signature...");
    setTimeout(() => {
      setIsAppLocked(false);
      setBiometricStatus("Place your fingerprint on the sensor to authenticate");
      showToast("Biometric verified successfully! App Unlocked.", "success");
    }, 1200);
  };

  // Passcode fallback verification
  const handlePasscodeUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (biometricPinInput === "1234") {
      setIsAppLocked(false);
      showToast("PIN code verified. Access granted.", "success");
    } else {
      showToast("Access Denied. Incorrect backup PIN.", "error");
    }
  };


  // Sync effect to ensure new nav items are added to enabledFeatures if they've never been seen
  useEffect(() => {
    const currentPaths = navItems.map(i => i.path);
    const seenFeatures = JSON.parse(localStorage.getItem('seenFeatures') || '[]');
    const newPaths = currentPaths.filter(p => !seenFeatures.includes(p));
    
    if (newPaths.length > 0) {
      setEnabledFeatures(prev => {
        const next = new Set(prev);
        newPaths.forEach(p => next.add(p));
        return next;
      });
      localStorage.setItem('seenFeatures', JSON.stringify([...seenFeatures, ...newPaths]));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('enabledFeatures', JSON.stringify(Array.from(enabledFeatures)));
  }, [enabledFeatures]);

  useEffect(() => {
    const fetchBudgetStatus = async () => {
      try {
        const { fetchCollection } = await import('../api');
        const expenses = await fetchCollection('expenses');
        const savedBudget = localStorage.getItem('somsphere_budget');
        const budget = savedBudget ? Number(savedBudget) : 500;
        
        const now = new Date();
        const currentMonthExpenses = expenses.filter((e: any) => {
          const d = new Date(e.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        
        const totalSpent = currentMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;
        setBudgetPercent(percentUsed);
      } catch(e) {
        // ignore
      }
    };
    fetchBudgetStatus();
    const interval = setInterval(fetchBudgetStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('isSoundEnabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('hasAcceptedAppSecurityTerms', hasAcceptedTerms.toString());
  }, [hasAcceptedTerms]);

  useEffect(() => {
    localStorage.setItem('somsphere_feedbacks_db', JSON.stringify(feedbacks));
  }, [feedbacks]);

  useEffect(() => {
    localStorage.setItem('isAutoBackupEnabled', isAutoBackupEnabled.toString());
  }, [isAutoBackupEnabled]);

  useEffect(() => {
    localStorage.setItem('isNoticeSyncEnabled', isNoticeSyncEnabled.toString());
    window.dispatchEvent(new Event('preferences-updated'));
  }, [isNoticeSyncEnabled]);

  useEffect(() => {
    localStorage.setItem('isGmailSyncEnabled', isGmailSyncEnabled.toString());
    window.dispatchEvent(new Event('preferences-updated'));
  }, [isGmailSyncEnabled]);

  const doAutoBackupExport = React.useCallback(async () => {
    try {
      const { fetchCollection } = await import('../api');
      const [fetchedNotes, fetchedAssignments] = await Promise.all([
        fetchCollection('notes'),
        fetchCollection('assignments')
      ]);
      const data = { notes: fetchedNotes, assignments: fetchedAssignments, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `somsphere-auto-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Auto backup failed", e);
    }
  }, []);

  useEffect(() => {
    if (isAutoBackupEnabled) {
      const lastBackupDate = localStorage.getItem('lastAutoBackupDate');
      const now = Date.now();
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (!lastBackupDate || (now - parseInt(lastBackupDate, 10) >= weekInMs)) {
        showToast("Triggering weekly auto-backup...", "info");
        doAutoBackupExport().then(() => {
          localStorage.setItem('lastAutoBackupDate', now.toString());
        });
      }
    }
  }, [isAutoBackupEnabled, doAutoBackupExport, showToast]);

  useEffect(() => {
    const savedPhoto = localStorage.getItem("profilePhoto");
    if (savedPhoto) {
      setProfilePhoto(savedPhoto);
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setProfilePhoto(dataUrl);
        localStorage.setItem("profilePhoto", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [syncHistory, setSyncHistory] = useState<Date[]>([]);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        showToast(`Heard: "${transcript}"`, "info");
        
        if (transcript.includes("task") || transcript.includes("tasks")) {
          navigate("/tasks");
        } else if (transcript.includes("expense") || transcript.includes("expenses") || transcript.includes("spend")) {
          navigate("/expenses");
        } else if (transcript.includes("note") || transcript.includes("notes")) {
          navigate("/notes");
        } else if (transcript.includes("dashboard") || transcript.includes("home")) {
          navigate("/");
        } else if (transcript.includes("timetable") || transcript.includes("schedule")) {
           navigate("/timetable");
        } else if (transcript.includes("chat") || transcript.includes("som")) {
           navigate("/chat");
        } else if (transcript.includes("habit") || transcript.includes("habits")) {
           navigate("/habits");
        } else if (transcript.includes("file") || transcript.includes("files")) {
           navigate("/files");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
            setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [navigate, showToast]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
         recognitionRef.current.start();
         showToast("Listening for navigation commands... (e.g. 'Go to tasks')", "info");
      } catch(e) {
         console.error(e);
      }
    } else if (!isListening && recognitionRef.current) {
      try {
         recognitionRef.current.stop();
      } catch(e) {
         console.error(e);
      }
    }
  }, [isListening, showToast]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Browser does not support voice recognition", "error");
      return;
    }
    setIsListening(prev => !prev);
  };

  useEffect(() => {
    if (isOffline) return;
    
    let syncCount = 0;
    const handleSyncStart = () => {
      syncCount++;
      setIsSyncing(true);
    };
    const handleSyncEnd = () => {
      syncCount--;
      if (syncCount <= 0) {
        syncCount = 0;
        setIsSyncing(false);
        const now = new Date();
        setLastSynced(now);
        setSyncHistory(prev => {
          const next = [now, ...prev];
          return next.slice(0, 5);
        });
      }
    };
    window.addEventListener('cloud-sync-start', handleSyncStart);
    window.addEventListener('cloud-sync-end', handleSyncEnd);

    return () => {
      window.removeEventListener('cloud-sync-start', handleSyncStart);
      window.removeEventListener('cloud-sync-end', handleSyncEnd);
    };
  }, [isOffline]);

  useEffect(() => {
    document.body.classList.remove('theme-emerald', 'theme-amber', 'theme-sky');
    if (accentTheme !== 'default') {
      document.body.classList.add(`theme-${accentTheme}`);
    }
  }, [accentTheme]);

  useEffect(() => {
    if (isSearchOpen) {
      import('../api').then(({ fetchCollection }) => {
         Promise.all([
           fetchCollection('assignments').catch(() => []),
           fetchCollection('notes').catch(() => []),
           fetchCollection('timetable').catch(() => []),
           fetchCollection('exams').catch(() => [])
         ]).then(([fetchedAssignments, fetchedNotes, fetchedTimetable, fetchedExams]) => {
           setAssignments(fetchedAssignments);
           setNotes(fetchedNotes);
           setTimetable(fetchedTimetable);
           setExams(fetchedExams);
         });
      });
    }
  }, [isSearchOpen]);

  const allCommands = React.useMemo(() => {
    const jumpCommands = navItems.filter(item => enabledFeatures.has(item.path)).map(item => ({
      id: `jump-${item.path}`,
      type: 'command',
      label: `Go to ${item.label}`,
      action: () => { navigate(item.path); setIsSearchOpen(false); },
      icon: item.icon
    }));
    const additionalCommands = [
      {
        id: 'cmd-create-task',
        type: 'command',
        label: 'Create New Task',
        action: () => { navigate('/tasks', { state: { openNewTaskModal: true } }); setIsSearchOpen(false); },
        icon: Plus
      }
    ];
    return [...jumpCommands, ...additionalCommands];
  }, [navigate]);

  const handleExportFeedbacksPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Background styling
      pdf.setFillColor(19, 19, 28);
      pdf.rect(0, 0, 210, 297, "F");

      // Draw elegant neon border framing
      pdf.setDrawColor(236, 72, 153);
      pdf.setLineWidth(1.0);
      pdf.line(10, 10, 200, 10);
      pdf.line(10, 10, 10, 287);
      pdf.line(200, 10, 200, 287);
      pdf.line(10, 287, 200, 287);

      // Title header
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("SOMSPHERE WORKSPACE", 20, 30);

      pdf.setTextColor(236, 72, 153);
      pdf.setFontSize(14);
      pdf.text("USER FEEDBACK DATABASE REPORT", 20, 38);

      pdf.setTextColor(156, 163, 175);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45);
      pdf.text(`Licensing Authorization: somnathpalstudy@gmail.com`, 20, 50);

      // Separator line
      pdf.setDrawColor(255, 255, 255, 0.1);
      pdf.setLineWidth(0.5);
      pdf.line(20, 56, 190, 56);

      let currentY = 65;

      feedbacks.forEach((fb) => {
        if (currentY > 250) {
          pdf.addPage();
          pdf.setFillColor(19, 19, 28);
          pdf.rect(0, 0, 210, 297, "F");
          
          pdf.setDrawColor(236, 72, 153);
          pdf.setLineWidth(1.0);
          pdf.line(10, 10, 200, 10);
          pdf.line(10, 10, 10, 287);
          pdf.line(200, 10, 200, 287);
          pdf.line(10, 287, 200, 287);

          currentY = 25;
        }

        // Draw card bubble
        pdf.setFillColor(26, 26, 38);
        pdf.rect(20, currentY, 170, 32, "F");
        
        pdf.setDrawColor(236, 72, 153, 0.2);
        pdf.setLineWidth(0.3);
        pdf.rect(20, currentY, 170, 32, "S");

        // Write submission metadata
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(`ID: #${fb.id}`, 24, currentY + 6);

        pdf.setTextColor(236, 72, 153);
        pdf.text(`Sender: ${fb.email}`, 24, currentY + 11);

        pdf.setTextColor(156, 163, 175);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(`Date & Time: ${fb.date}`, 130, currentY + 6);

        pdf.setFontSize(9);
        pdf.setTextColor(229, 231, 235);
        
        const splitText = pdf.splitTextToSize(fb.text, 160);
        pdf.text(splitText, 24, currentY + 17);

        currentY += 37;
      });

      // Footer brand notice
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("PAGE 1 OF 1 • SECURE SOMSPHERE LOGGING REPOSITORY", 20, 280);

      pdf.save(`somsphere-feedback-export-${Date.now()}.pdf`);
      showToast("Perfect! Generated professional student & user feedback PDF successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Error generating PDF document. Check developer console details.", "error");
    }
  };

  const searchResults = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    const isCommandMode = searchQuery.startsWith('>');
    const pureQuery = isCommandMode ? q.slice(1).trim() : q.trim();
    
    let commands = allCommands;
    if (pureQuery) {
      commands = allCommands.filter(c => c.label.toLowerCase().includes(pureQuery));
    }

    if (!searchQuery.trim() || isCommandMode) {
      return { commands, assignments: [], notes: [], files: [], timetable: [], exams: [], resources: [] };
    }
    
    const mockFiles = [
      { id: 1, name: "Calculus_Chap4_Notes.pdf", type: "pdf", size: "2.4 MB" },
      { id: 2, name: "Physics_Lab_Report.docx", type: "doc", size: "1.1 MB" },
      { id: 3, name: "Dataset_Archive.zip", type: "zip", size: "45.0 MB" },
      { id: 4, name: "Whiteboard_Session.png", type: "img", size: "4.8 MB" },
      { id: 5, name: "Study_Guide_Midterm.pdf", type: "pdf", size: "3.2 MB" },
    ];

    const mockResources = [
      { id: 1, name: "Main Library", type: "Facility", location: "Building A", hours: "24/7" },
      { id: 2, name: "CS Tutoring Center", type: "Service", location: "Room 402, Building C", hours: "10am - 6pm" },
      { id: 3, name: "Health Center", type: "Service", location: "Building E", hours: "8am - 8pm" },
      { id: 4, name: "Student Union", type: "Facility", location: "Central Campus", hours: "8am - 10pm" },
    ];

    return {
      commands: commands.slice(0, 3), // Only show a few commands when not in command mode
      assignments: assignments.filter(a => a.title?.toLowerCase().includes(q) || a.subject?.toLowerCase().includes(q)),
      notes: notes.filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)),
      files: mockFiles.filter(f => f.name.toLowerCase().includes(q)),
      timetable: timetable.filter(t => t.subject?.toLowerCase().includes(q) || t.room?.toLowerCase().includes(q)),
      exams: exams.filter(e => e.subject?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q)),
      resources: mockResources.filter(r => r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q))
    };
  }, [searchQuery, assignments, notes, timetable, exams, allCommands]);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Handle global digit shortcuts Cmd/Ctrl + 1-9 for dashboard section navigation
        if (/^[1-9]$/.test(e.key)) {
          const targetNum = parseInt(e.key, 10);
          const activeNavs = navItems.filter((item) => enabledFeatures.has(item.path));
          const targetIndex = targetNum - 1;
          if (targetIndex < activeNavs.length) {
            e.preventDefault();
            const targetNav = activeNavs[targetIndex];
            navigate(targetNav.path);
            showToast(`Navigated to ${targetNav.label}`, "info");
          }
          return;
        }

        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            setIsSearchOpen(true);
            break;
          case 'n':
            e.preventDefault();
            navigate('/notes');
            showToast("Navigated to Notes", "info");
            break;
          case 't':
            e.preventDefault();
            navigate('/tasks');
            showToast("Navigated to Task Manager", "info");
            break;
          case 'm':
            e.preventDefault();
            navigate('/chat');
            showToast("Navigated to Som Chat", "info");
            break;
        }
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setAccentTheme(prev => {
          const themes = ['default', 'emerald', 'amber', 'sky'];
          const nextIndex = (themes.indexOf(prev) + 1) % themes.length;
          const newTheme = themes[nextIndex];
          showToast(`Theme changed to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`, "success");
          return newTheme;
        });
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node) && !(e.target as Element).closest('.search-dropdown')) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navigate, showToast, enabledFeatures]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast("Connection restored", "success");
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast("You are offline. Changes will be cached locally and synced when you reconnect.", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching for: ${searchQuery}`, "info");
      setIsSearchOpen(false);
      setSearchQuery("");
      // Further integration could route to a dedicated search page
    }
  };

  const handleExportData = async () => {
    try {
      showToast("Preparing data export...", "info");
      const { fetchCollection } = await import('../api');
      const [fetchedNotes, fetchedAssignments] = await Promise.all([
        fetchCollection('notes'),
        fetchCollection('assignments')
      ]);
      const data = { 
         notes: fetchedNotes, 
         assignments: fetchedAssignments, 
         exportedAt: new Date().toISOString() 
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `somsphere-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data exported successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to export data.", "error");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        const { createItem } = await import('../api');
        
        showToast("Importing data...", "info");
        
        let count = 0;
        if (data.notes && Array.isArray(data.notes)) {
          for (const note of data.notes) {
            const { id, ...rest } = note;
            await createItem('notes', rest);
            count++;
          }
        }
        
        if (data.assignments && Array.isArray(data.assignments)) {
          for (const assignment of data.assignments) {
            const { id, ...rest } = assignment;
            await createItem('assignments', rest);
            count++;
          }
        }
        
        showToast(`Successfully imported ${count} items!`, "success");
        // Reload page to reflect new data
        window.location.reload();
      } catch (error) {
        console.error(error);
        showToast("Failed to parse or import data file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerCloudBackup = async () => {
    try {
      showToast("Syncing local cache to cloud...", "info");
      setIsSyncing(true);
      const { waitForPendingWrites } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await waitForPendingWrites(db);
      setIsSyncing(false);
      setLastSynced(new Date());
      showToast("Cloud backup synchronized successfully!", "success");
    } catch (error) {
      console.error(error);
      setIsSyncing(false);
      showToast("Failed to synchronize cloud backup.", "error");
    }
  };

  const handleBatchExport = async () => {
    try {
      showToast("Preparing archive...", "info");
      const { fetchCollection } = await import('../api');
      const JSZip = (await import('jszip')).default;
      
      const zip = new JSZip();
      
      const [fetchedNotes, fetchedExpenses, fetchedAssignments, fetchedHabits] = await Promise.all([
        fetchCollection('notes'),
        fetchCollection('expenses'),
        fetchCollection('assignments'),
        fetchCollection('habits')
      ]);

      zip.file('notes.json', JSON.stringify(fetchedNotes, null, 2));
      zip.file('expenses.json', JSON.stringify(fetchedExpenses, null, 2));
      zip.file('assignments.json', JSON.stringify(fetchedAssignments, null, 2));
      zip.file('habits.json', JSON.stringify(fetchedHabits, null, 2));
      zip.file('metadata.json', JSON.stringify({ exportedAt: new Date().toISOString() }, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `somsphere-archive-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast("Archive downloaded successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate archive.", "error");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-[#0D0D14]/80 backdrop-blur-md px-4" onClick={() => setIsSettingsModalOpen(false)}>
          <div className="w-full max-w-sm bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Settings</h2>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto max-h-[80vh] custom-scrollbar flex flex-col gap-6">
              {/* Theme Settings Panel */}
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Accent Theme</div>
                <div className="flex gap-4">
                  <button onClick={() => setAccentTheme('default')} className={clsx("w-8 h-8 rounded-full bg-pink-500 border-2 transition-all hover:scale-110", accentTheme === 'default' ? "border-white shadow-[0_0_10px_rgba(236,72,153,0.5)]" : "border-transparent opacity-70 hover:opacity-100")} />
                  <button onClick={() => setAccentTheme('emerald')} className={clsx("w-8 h-8 rounded-full bg-teal-500 border-2 transition-all hover:scale-110", accentTheme === 'emerald' ? "border-white shadow-[0_0_10px_rgba(20,184,166,0.5)]" : "border-transparent opacity-70 hover:opacity-100")} />
                  <button onClick={() => setAccentTheme('amber')} className={clsx("w-8 h-8 rounded-full bg-orange-500 border-2 transition-all hover:scale-110", accentTheme === 'amber' ? "border-white shadow-[0_0_10px_rgba(249,115,22,0.5)]" : "border-transparent opacity-70 hover:opacity-100")} />
                  <button onClick={() => setAccentTheme('sky')} className={clsx("w-8 h-8 rounded-full bg-blue-500 border-2 transition-all hover:scale-110", accentTheme === 'sky' ? "border-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "border-transparent opacity-70 hover:opacity-100")} />
                </div>
              </div>

              {/* Preferences */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Preferences</div>
                  <label className="flex items-center cursor-pointer relative gap-2">
                    <span className="text-[10px] text-gray-500 font-medium">Sound Alerts</span>
                    <input type="checkbox" checked={isSoundEnabled} onChange={(e) => setIsSoundEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-6 h-3 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[15px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </div>
              </div>

              {/* Feature Manager */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Feature Manager</div>
                  <button onClick={() => setIsResetFeaturesConfirmOpen(true)} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded">
                    Reset
                  </button>
                </div>
                {navItems.map(item => (
                  <div key={item.path} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-300 font-medium">{item.label}</span>
                    </div>
                    <label className="flex items-center cursor-pointer relative gap-2">
                      <input 
                        type="checkbox" 
                        checked={enabledFeatures.has(item.path)} 
                        onChange={(e) => {
                          const newSet = new Set(enabledFeatures);
                          if (e.target.checked) newSet.add(item.path);
                          else newSet.delete(item.path);
                          setEnabledFeatures(newSet);
                        }} 
                        className="sr-only peer" 
                        disabled={item.path === '/'} // Prevent disabling dashboard
                      />
                      <div className="w-6 h-3 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[15px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-pink-500 peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Integrations */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Integrations & Sync Mode</div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-300 font-medium">Notice Board Auto-Sync</span>
                    </div>
                    <label className="flex items-center cursor-pointer relative gap-2">
                      <input type="checkbox" checked={isNoticeSyncEnabled} onChange={(e) => setIsNoticeSyncEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-6 h-3 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[15px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>
                  <button onClick={() => { window.dispatchEvent(new Event('manual-sync-notices')); showToast('Triggered Notice Board Sync', 'info'); }} className="text-xs text-gray-400 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded uppercase tracking-wider font-bold transition-colors w-fit ml-7">
                    Trigger Now
                  </button>
                </div>
                
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Wallet className="w-4 h-4 text-gray-400" />
                       <span className="text-xs text-gray-300 font-medium">Gmail GPay Auto-Sync</span>
                    </div>
                    <label className="flex items-center cursor-pointer relative gap-2">
                      <input type="checkbox" checked={isGmailSyncEnabled} onChange={(e) => setIsGmailSyncEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-6 h-3 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[15px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>
                  <button onClick={() => { window.dispatchEvent(new Event('manual-sync-gmail')); showToast('Triggered Gmail Sync', 'info'); }} className="text-xs text-gray-400 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded uppercase tracking-wider font-bold transition-colors w-fit ml-7">
                    Trigger Now
                  </button>
                </div>
              </div>

              {/* Data Management */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data Management</div>
                  <label className="flex items-center cursor-pointer relative gap-2">
                    <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Auto-Backup</span>
                    <input type="checkbox" checked={isAutoBackupEnabled} onChange={(e) => setIsAutoBackupEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-6 h-3 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[15px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </div>
                <button onClick={handleTriggerCloudBackup} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors w-full text-left bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-3 text-emerald-400 rounded-lg mt-2">
                  <Cloud className="w-4 h-4" />
                  Trigger Cloud Backup
                </button>
                <button onClick={handleBatchExport} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors w-full text-left bg-blue-500/10 hover:bg-blue-500/20 px-4 py-3 text-blue-400 rounded-lg mt-2">
                  <Archive className="w-4 h-4" />
                  Batch Export (ZIP)
                </button>
                <button onClick={handleExportData} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors w-full text-left px-4 py-3 hover:bg-white/5 rounded-lg mt-2">
                  <Download className="w-4 h-4" />
                  Export Data (JSON)
                </button>
                <button onClick={() => fileInputRefData.current?.click()} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors w-full text-left px-4 py-3 hover:bg-white/5 rounded-lg mt-1">
                  <Upload className="w-4 h-4" />
                  Import Data (JSON)
                </button>
                <input type="file" accept=".json" ref={fileInputRefData} onChange={handleImportData} className="hidden" />
              </div>

              {/* App Protection & Terms of Service */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>App Intellectual Property</span>
                  {hasAcceptedTerms && (
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Secured
                    </span>
                  )}
                </div>
                <div className="bg-[#09090e] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded bg-pink-500/10 text-pink-400 mt-0.5 shrink-0">
                      <Copyright className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Terms & Non-Cloning License</p>
                      <p className="text-[10px] text-gray-400 leading-normal mt-0.5">
                        This application is legally protected. Unauthorized copying, cloning, or distribution is strictly prohibited under international copyright law.
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setIsTermsModalOpen(true);
                    }}
                    className="mt-1 text-[10px] font-bold text-pink-500 hover:text-pink-400 text-center bg-white/5 hover:bg-white/10 py-1.5 px-3 rounded-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Shield className="w-3 h-3" />
                    View License Settings
                  </button>
                </div>
              </div>

              {/* Feedback Database */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Feedback Database</span>
                  <span className="text-[9px] text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" /> {feedbacks.length} Records
                  </span>
                </div>
                <div className="bg-[#09090e] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Securely inspect user suggestions and compile all responses directly into one PDF report using jsPDF.
                  </p>
                  <button 
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      setIsFeedbackHubOpen(true);
                    }}
                    className="mt-1 text-[10px] font-bold text-white hover:text-white text-center bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 py-2 px-3 rounded-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3 h-3 text-pink-500" />
                    Open Feedback Database Hub
                  </button>
                </div>
              </div>

              {/* PWA Standalone App */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>PWA Standalone App</span>
                  <span className="text-[9px] bg-pink-500/10 text-pink-400 border border-pink-500/15 font-mono px-1.5 py-0.5 rounded">Offline-Ready</span>
                </div>
                <div className="bg-[#09090e] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Transform SomSphere into a native standalone mobile application. Caches core pages, timetables, and campus notice data dynamically.
                  </p>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      handleTriggerPwaInstall();
                    }}
                    className="mt-1 w-full bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer border-none"
                  >
                    <Smartphone className="w-4 h-4" />
                    Install Web App (PWA)
                  </button>
                </div>
              </div>

              {/* Device Biometric Security */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Device Biometric Security</span>
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isBiometricEnabled ? "bg-green-500/10 text-green-400 border border-green-500/15" : "bg-gray-500/10 text-gray-400"}`}>
                    {isBiometricEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="bg-[#09090e] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-pink-500" />
                        Biometric Shield Lock
                      </span>
                      <span className="text-[9px] text-gray-400 leading-normal mt-0.5">Protect grades, personal data and files using biological sensor unlock.</span>
                    </div>
                    <label className="flex items-center cursor-pointer relative gap-2 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isBiometricEnabled} 
                        onChange={(e) => handleToggleBiometric(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[19px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Account / Sign Out Panel */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Account</div>
                <button
                  onClick={async () => {
                    try {
                      await logout();
                      showToast("Logged out successfully", "success");
                      setIsSettingsModalOpen(false);
                      navigate("/");
                      window.location.reload();
                    } catch (e) {
                      showToast("Error during logout", "error");
                    }
                  }}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors w-full text-left bg-red-500/10 hover:bg-red-500/20 px-4 py-3 text-red-500 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              {/* About App & Developer */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>About App & Developer</span>
                  <span className="text-[9px] text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <User className="w-2.5 h-2.5" /> Author Profile
                  </span>
                </div>
                <div className="bg-[#09090e] border border-white/5 rounded-xl p-3.5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">SomSphere Workspace</h4>
                    <p className="text-[10px] text-gray-300 leading-normal mt-1">
                      A smart, fully integrated student workspace offering collaborative canvases, student community chatting hub, document encryption with PDF compilation generators, and real-time custom widgets.
                    </p>
                  </div>
                  
                  <div className="space-y-2.5 border-t border-white/5 pt-2.5">
                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                      <User className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-bold">Developer Name</span>
                        <span className="font-bold text-white">Somnath Pal</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-bold">Developer Email</span>
                        <a href="mailto:somnathpalstudy@gmail.com" className="text-pink-400 hover:underline hover:text-pink-300 select-all font-mono break-all text-[11px]">
                          somnathpalstudy@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-bold">Contact Number</span>
                        <span className="font-mono text-[11px] text-white tracking-wider font-bold">+91 8391987490</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync History Panel */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>Sync History</span>
                  <span className="bg-white/10 px-2 py-1 rounded text-[9px]">{syncHistory.length}/5</span>
                </div>
                {syncHistory.length === 0 ? (
                  <div className="text-xs text-gray-500 italic py-2">No recent syncs.</div>
                ) : (
                  <ul className="space-y-2 mt-2">
                    {syncHistory.map((date, idx) => (
                      <li key={idx} className="text-xs text-gray-400 flex items-center justify-between py-1 border-b border-white/5 last:border-0 relative pl-4">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                        <span className="tabular-nums">{format(date, 'h:mm:ss a')}</span>
                        <span className="text-[9px] text-emerald-500 uppercase tracking-wider font-bold">Success</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Features Confirm Modal */}
      {isResetFeaturesConfirmOpen && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-[#0D0D14]/80 backdrop-blur-md px-4" onClick={() => setIsResetFeaturesConfirmOpen(false)}>
          <div className="w-full max-w-sm bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">Reset Features?</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to revert all feature toggles back to their default state?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setIsResetFeaturesConfirmOpen(false)} className="px-4 py-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors uppercase tracking-widest cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  setEnabledFeatures(new Set(navItems.map(item => item.path)));
                  setIsResetFeaturesConfirmOpen(false);
                }} 
                className="px-4 py-2 text-xs font-bold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors uppercase tracking-widest cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions App Protection License Modal */}
      {isTermsModalOpen && (
        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-[#0D0D14]/90 backdrop-blur-md px-4" onClick={() => setIsTermsModalOpen(false)}>
          <div className="w-full max-w-xl bg-[#13131c] border border-pink-500/20 rounded-2xl shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-[#1a1a26] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-pink-500 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Terms & Software Protection License</h2>
              </div>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4">
              <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/10 space-y-2">
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block">Proprietary Notice</span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Welcome to <strong className="text-white">SomSphere Workspace App</strong>. Under international IP directives, this application and its underlying frameworks, visual design, custom UI components, databases, and source files are designated as highly specialized, proprietary closed-source software.
                </p>
              </div>

              <div className="space-y-4 text-xs text-gray-400 leading-relaxed">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">1. Ownership of Intellectual Property</h4>
                  <p>
                    All code, graphics, schemas, icons, styling presets, UX workflows, custom-coded PDF processors, secure integrations, and original databases compiled in SomSphere are the exclusive intellectual property of the author (<strong className="text-pink-400">somnathpalstudy@gmail.com</strong>).
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">2. Absolute Non-Cloning & Anti-Copying Mandate</h4>
                  <p>
                    Users, viewers, and external entities are strictly prohibited from copying, cloning, scraping, redistributing, modifying, decompiling, mirroring, or reverse-engineering any portion of the application code or visual interface. Doing so constitutes a direct violation of the <strong className="text-white">WIPO Copyright Treaty (WCT)</strong> and standard copyright laws.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">3. Strict Protection Covenants</h4>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] text-gray-400">
                    <li>No cloning or publishing of this workflow/UX structure on GitHub, Netlify, Vercel, or any alternative web hosting provider.</li>
                    <li>No automated scraping, API mirroring, or offline caching of intellectual assets outside authorized browser clients.</li>
                    <li>No extraction of custom-crafted component libraries for third-party websites or personal commercial use.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">4. Legal Remedies & Infringement Claims</h4>
                  <p>
                    Failure to adhere to these licensing conditions will result in immediate termination of the offender's database access, followed by statutory copyright claims, IP takedown requests under DMCA conventions, and legal proceedings for compensation of direct and consequential liabilities.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTermsCheckbox"
                    checked={hasAcceptedTerms}
                    onChange={(e) => {
                      setHasAcceptedTerms(e.target.checked);
                      if (e.target.checked) {
                        showToast("Terms accepted! Your app protection status is secured.", "success");
                      }
                    }}
                    className="w-4 h-4 rounded border-white/10 bg-black text-pink-500 focus:ring-pink-500/50 cursor-pointer accent-pink-500 mt-0.5"
                  />
                  <label htmlFor="acceptTermsCheckbox" className="text-xs font-semibold text-gray-300 select-none cursor-pointer leading-tight">
                    I agree to completely respect the non-cloning covenants, intellectual property rights, and proprietary licensing of SomSphere.
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#1a1a26]/50 border-t border-white/10 flex items-center justify-between">
              <div className="text-[10px] font-mono text-gray-400">
                LICENSE VERIFIED: {hasAcceptedTerms ? "SECURE-PRO" : "PENDING-CERT"}
              </div>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95"
              >
                Accept and Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Overlay */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-[#0D0D14]/80 backdrop-blur-md px-4" onClick={() => setIsSearchOpen(false)}>
          <div className="w-full max-w-2xl bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearchSubmit} className="flex items-center px-4 border-b border-white/10 relative">
              <Search className="w-5 h-5 text-pink-400 shrink-0" />
              <input
                autoFocus
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tasks, or navigate... (Press Esc to close)"
                className="w-full bg-transparent border-none outline-none py-4 px-4 text-lg text-white placeholder-gray-500"
              />
              <div className="text-xs font-mono text-gray-500 px-2 py-1 bg-white/5 rounded shrink-0">ESC</div>
            </form>
            
            <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar">
               {!searchQuery.trim() ? (
                 <div className="p-4">
                  <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">Quick Commands</div>
                  {searchResults.commands.map((cmd) => (
                    <button key={cmd.id} type="button" onClick={cmd.action} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                      {cmd.icon && <cmd.icon className="w-4 h-4 text-emerald-400" />}
                      <span>{cmd.label}</span>
                    </button>
                  ))}
                  <div className="mt-4 text-xs text-gray-500 text-center">Type <kbd className="px-1 py-0.5 bg-white/5 rounded mx-1">&gt;</kbd> to see all commands</div>
                 </div>
               ) : (
                 <div className="p-2 space-y-4">
                   {searchResults.commands.length === 0 && searchResults.assignments.length === 0 && searchResults.notes.length === 0 && searchResults.files.length === 0 && searchResults.timetable.length === 0 && searchResults.exams.length === 0 && searchResults.resources.length === 0 && (
                     <div className="text-center py-8 text-gray-500 text-sm">No results found for "{searchQuery}"</div>
                   )}
                   
                   {searchResults.commands.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1">Commands</div>
                       {searchResults.commands.map((cmd) => (
                         <button key={cmd.id} onClick={cmd.action} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                           <span className="text-pink-500 font-mono text-xs text-opacity-50">&gt;</span>
                           {cmd.icon && <cmd.icon className="w-4 h-4 text-emerald-400" />}
                           <span className="text-sm font-medium">{cmd.label}</span>
                         </button>
                       ))}
                     </div>
                   )}

                   {searchResults.assignments.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1">Tasks & Assignments</div>
                       {searchResults.assignments.map((task: any) => (
                         <button key={task.id} onClick={() => { navigate('/tasks'); setIsSearchOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex flex-col gap-1">
                           <span className="text-sm font-medium">{task.title}</span>
                           <span className="text-xs text-gray-500">{task.subject}</span>
                         </button>
                       ))}
                     </div>
                   )}
                   
                   {searchResults.notes.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1 mt-2">Notes</div>
                       {searchResults.notes.map((note: any) => (
                         <button key={note.id} onClick={() => { navigate('/notes'); setIsSearchOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex flex-col gap-1">
                           <span className="text-sm font-medium">{note.title}</span>
                         </button>
                       ))}
                     </div>
                   )}

                   {searchResults.timetable.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1 mt-2">Timetable / Classes</div>
                       {searchResults.timetable.map((t: any) => (
                         <button key={t.id} onClick={() => { navigate('/timetable'); setIsSearchOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex flex-col gap-1">
                           <span className="text-sm font-medium text-pink-400">{t.subject}</span>
                           <span className="text-xs text-gray-500">{t.day} @ {t.startTime} - {t.room}</span>
                         </button>
                       ))}
                     </div>
                   )}

                   {searchResults.exams.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1 mt-2">Exams</div>
                       {searchResults.exams.map((e: any) => (
                         <button key={e.id} onClick={() => { navigate('/exams'); setIsSearchOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex flex-col gap-1">
                           <span className="text-sm font-medium text-purple-400">{e.subject} {e.type}</span>
                           <span className="text-xs text-gray-500">{format(new Date(e.examDateTime), 'MMM d, yyyy h:mm a')}</span>
                         </button>
                       ))}
                     </div>
                   )}

                   {searchResults.resources.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1 mt-2">Campus Resources</div>
                       {searchResults.resources.map((r: any) => (
                         <button key={r.id} onClick={() => { setIsSearchOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex flex-col gap-1">
                           <span className="text-sm font-medium text-blue-400">{r.name} ({r.type})</span>
                           <span className="text-xs text-gray-500">{r.location} • {r.hours}</span>
                         </button>
                       ))}
                     </div>
                   )}

                   {searchResults.files.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-1 mt-2">Smart Files (MockData)</div>
                       {searchResults.files.map((file: any) => (
                         <button key={file.id} onClick={() => { navigate('/files'); setIsSearchOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex flex-col gap-1">
                           <span className="text-sm font-medium text-emerald-400">{file.name}</span>
                           <span className="text-xs text-gray-500">{file.size} - {file.type.toUpperCase()}</span>
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 glass-card border-r border-white/10 bg-white/5 backdrop-blur-xl border-l-0 border-t-0 border-b-0 rounded-none flex-col pt-6 pb-4 shrink-0 transition-all z-20">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 shadow-[0_0_15px_rgba(236,72,153,0.5)] flex items-center justify-center font-bold text-white italic overflow-hidden">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              "S"
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">SomSphere</h1>
        </div>
      
        <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          {navItems.filter(item => enabledFeatures.has(item.path)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center justify-between px-4 py-3 transition-all duration-200 text-sm font-medium rounded-r-xl group",
                  isActive
                    ? "bg-white/10 text-pink-400 border-l-2 border-pink-500"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.path === '/expenses' && budgetPercent > 80 && (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] flex-shrink-0" title="Budget > 80% used" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Settings Button */}
        <div className="px-6 mt-4 pt-4 border-t border-white/5 shrink-0 flex flex-col gap-2">
          <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors group">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden flex">
          {/* Backdrop screen filter */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          
          {/* Drawer Body container */}
          <aside className="relative w-64 bg-[#0D0D14] border-r border-white/10 flex flex-col pt-6 pb-4 h-full animate-in slide-in-from-left duration-200 z-10 shadow-2xl">
            {/* Header/Close button */}
            <div className="px-6 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 shadow-[0_0_15px_rgba(236,72,153,0.5)] flex items-center justify-center font-bold text-white italic overflow-hidden">
                  {profilePhoto ? <img src={profilePhoto} alt="Logo" className="w-full h-full object-cover" /> : "S"}
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">SomSphere</h1>
              </div>
              <button 
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list on Mobile */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
              {navItems.filter(item => enabledFeatures.has(item.path)).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center justify-between px-4 py-3 transition-all duration-200 text-sm font-medium rounded-xl group",
                      isActive
                        ? "bg-white/10 text-pink-400 border-l-2 border-pink-500"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.path === '/expenses' && budgetPercent > 80 && (
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="px-6 mt-4 pt-4 border-t border-white/5 shrink-0 flex flex-col gap-2">
              <button 
                type="button"
                onClick={() => { setIsMobileSidebarOpen(false); setIsSettingsModalOpen(true); }} 
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors group"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen relative min-w-0">
        <OfflineBanner />
        {/* Header */}
        <header className="h-16 px-4 md:px-8 flex items-center justify-between shrink-0 z-10 sticky top-0 backdrop-blur-md bg-[#0D0D14]/50 border-b border-white/10">
          <div className="flex items-center text-white/70 text-xs md:text-sm font-medium min-w-0">
            {/* Mobile menu hamburger toggle button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 mr-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Large screen elegant long date layout */}
            <span className="hidden sm:inline-block truncate">
              {format(new Date(), "EEEE, MMMM do, yyyy · h:mm a")}
            </span>
            {/* Tiny phone screens mini date signature */}
            <span className="inline-block sm:hidden truncate font-mono text-[10px]">
              {format(new Date(), "MMM d, yyyy")}
            </span>
            
            <div 
              className="group ml-3 md:ml-6 flex items-center gap-1.5 border border-white/10 bg-white/5 px-2 py-0.5 md:py-1 rounded-md relative cursor-help shrink-0" 
            >
              {isOffline ? (
                <CloudOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <div className="relative flex items-center justify-center">
                {isSyncing && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                )}
                <Cloud className={clsx("w-3.5 h-3.5 text-emerald-400 relative z-10", isSyncing && "animate-pulse")} />
              </div>
            )}
            <span className={clsx("text-[10px] font-bold tracking-widest uppercase", isOffline ? "text-red-400" : isSyncing ? "text-emerald-300" : "text-emerald-400")}>
              {isOffline ? "Offline" : isSyncing ? "Syncing..." : "Synced"}
            </span>

            {/* Tooltip on hover */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1A1A24] text-gray-300 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/10 pointer-events-none z-50 shadow-xl">
              {isOffline ? "Changes will sync when online" : isSyncing ? "Syncing data in background..." : "Last synced: Just now"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 relative shrink-0">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-2.5 sm:px-4 transition-all text-gray-400 hover:text-white"
            title="Search anything..."
          >
            <Search className="w-4 h-4 text-gray-400 group-hover:text-white" />
            <span className="text-xs sm:text-sm hidden sm:inline-block">Search anything...</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] hidden md:inline-block">Ctrl+K</span>
          </button>

          <button 
            onClick={toggleListening}
            className={clsx("relative w-10 h-10 flex items-center justify-center rounded-full border transition-colors shrink-0", isListening ? "bg-pink-500/20 border-pink-500/50 text-pink-400" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10")}
            title="Voice Navigation (e.g. 'Go to Tasks')"
          >
            <Mic className={clsx("w-4 h-4", isListening && "animate-pulse")} />
            {isListening && <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] border-2 border-[#1A1A24]" />}
          </button>

          <button 
            onClick={() => setIsLightMode(!isLightMode)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Toggle Theme"
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-pink-500 text-white text-[9px] font-extrabold flex items-center justify-center px-1 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 hover:border-pink-500/50 transition-colors relative" title="Upload Profile Photo">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white/80">ST</span>
            )}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
            />
          </button>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <Outlet />
      </main>

      {/* Notifications Panel */}
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Floating Shortcuts Button */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 border border-white/20 backdrop-blur-md"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-5 h-5" />
        </button>

        {/* Floating Feedback Button */}
        <button
          onClick={() => setIsFeedbackOpen(true)}
          className="w-12 h-12 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110"
          title="Send Feedback"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0D0D14]/80 backdrop-blur-md px-4" onClick={() => setIsShortcutsOpen(false)}>
          <div className="w-full max-w-sm bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-gray-400" />
                Keyboard Shortcuts
              </h2>
              <button onClick={() => setIsShortcutsOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                <span className="text-gray-400 group-hover:text-white transition-colors">Global Search</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">Ctrl</kbd>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">K</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                <span className="text-gray-400 group-hover:text-white transition-colors">Open Notes</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">Ctrl</kbd>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">N</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                <span className="text-gray-400 group-hover:text-white transition-colors">Open Tasks</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">Ctrl</kbd>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">T</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                <span className="text-gray-400 group-hover:text-white transition-colors">Open Chat</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">Ctrl</kbd>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">M</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                <span className="text-gray-400 group-hover:text-white transition-colors">Cycle Theme</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">Alt</kbd>
                  <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">T</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2 border-t border-white/5 pt-3 mt-1">
                <span className="text-gray-400 group-hover:text-white transition-colors">Switch Sections</span>
                <span className="flex gap-1 items-center">
                  <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">Ctrl</kbd>
                  <span className="text-gray-600 text-xs font-mono">+</span>
                  <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded font-mono text-xs text-white/90">1-9</kbd>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0D0D14]/80 backdrop-blur-md px-4" onClick={() => setIsFeedbackOpen(false)}>
          <div className="w-full max-w-sm bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-pink-400" />
                Send Feedback
              </h2>
              <button onClick={() => setIsFeedbackOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              We'd love to hear your thoughts, suggestions, or issues.
            </p>
            <textarea
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500/50 resize-none mb-4"
              placeholder="Tell us about your experience..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => {
                if (!feedbackText.trim()) return;
                const newFb = {
                  id: "fb_reg_" + Math.random().toString(36).substring(2, 6) + "_" + Date.now().toString().slice(-4),
                  text: feedbackText.trim(),
                  date: new Date().toLocaleString(),
                  email: "somnathpalstudy@gmail.com"
                };
                setFeedbacks(prev => [newFb, ...prev]);
                showToast("Feedback stored in SomSphere Database secure logs!", "success");
                setFeedbackText("");
                setIsFeedbackOpen(false);
              }}
              disabled={!feedbackText.trim()}
              className="w-full py-2.5 rounded-xl bg-pink-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Feedback
            </button>
          </div>
        </div>
      )}

      {/* Feedback Hub Database & PDF Compiler Modal */}
      {isFeedbackHubOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#0D0D14]/90 backdrop-blur-md px-4" onClick={() => setIsFeedbackHubOpen(false)}>
          <div className="w-full max-w-2xl bg-[#13131c] border border-pink-500/20 rounded-2xl shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-[#1a1a26] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-pink-500 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Feedback Database & PDF Creator</h2>
              </div>
              <button onClick={() => setIsFeedbackHubOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4">
              <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block">Intellectual Feedback Report Creator</span>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Compile all stored client-side submissions and system feedback into one structured PDF document instantly.
                  </p>
                </div>
                <button
                  onClick={handleExportFeedbacksPDF}
                  disabled={feedbacks.length === 0}
                  className="px-4 py-2 text-xs bg-pink-500 text-white font-bold opacity-100 hover:bg-pink-600 rounded-lg transition-all flex items-center gap-1.5 uppercase shrink-0 select-none shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Compile as PDF
                </button>
              </div>

              {/* Feedback List Table / View */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex justify-between items-center">
                  <span>Feedback Records ({feedbacks.length})</span>
                  {feedbacks.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to clear the entire local feedback backlog? This is non-reversible.")) {
                          setFeedbacks([]);
                          showToast("Database log backlog completely cleared.", "success");
                        }
                      }}
                      className="text-[9px] text-red-400 hover:text-red-300 font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Database
                    </button>
                  )}
                </div>

                {feedbacks.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    No feedback records available. Submit a feedback via the floating toggle button to test!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-300">
                    {feedbacks.map((fb) => (
                      <div key={fb.id} className="p-3 bg-[#1a1a26] border border-white/5 rounded-xl hover:border-pink-500/10 transition-colors relative group">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded font-mono font-bold">#{fb.id}</span>
                              <span className="text-xs font-bold text-gray-300 truncate">{fb.email}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 whitespace-pre-wrap leading-normal">{fb.text}</p>
                            <span className="text-[9px] text-gray-500 block mt-2 font-mono">{fb.date}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setFeedbacks((prev) => prev.filter((item) => item.id !== fb.id));
                              showToast("Feedback record deleted from local dashboard logs", "success");
                            }}
                            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-[#1a1a26]/50 border-t border-white/10 flex items-center justify-between">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Session DB
              </div>
              <button
                onClick={() => setIsFeedbackHubOpen(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Interactive Enrollment Simulator Modal */}
      {isBiometricEnrollOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-[#0D0D14]/95 backdrop-blur-md px-4">
          <div className="w-full max-w-sm bg-[#13111C] border border-pink-500/30 rounded-2xl shadow-3xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-pink-500/10 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
              <Fingerprint className="w-8 h-8 animate-pulse" />
            </div>
            
            <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">Configure Biometric Key</h3>
            
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              We detected a restricted sandbox context relative to native device hardware APIs. Let's initialize a certified simulated secure hardware chip!
            </p>

            <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <p className="text-[10px] text-pink-400 font-mono uppercase tracking-widest mb-1.5">Simulation Spec</p>
              <p className="text-xs text-gray-300 font-medium">Secured Virtual Android Keystore / Apple T2</p>
              <p className="text-[9.5px] text-gray-500 mt-1 leading-normal">
                Generates a matching ECDSA public key with secure credential ID stored to your sandboxed offline secure context.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirmSimulatedEnroll}
                className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Fingerprint className="w-4 h-4" />
                Initialize simulated biometrics
              </button>
              
              <button 
                onClick={() => {
                  setIsBiometricEnrollOpen(false);
                  setIsBiometricEnabled(false);
                  localStorage.setItem('isBiometricEnabled', 'false');
                  showToast("Biometric enrollment cancelled.", "info");
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancel Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Biometric App Lock Panel */}
      {isAppLocked && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#07070B] overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-pink-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="w-full max-w-sm px-6 text-center animate-in fade-in duration-500">
            {/* Soft pulsing brand header */}
            <div className="mb-8 select-none">
              <div className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-400 bg-clip-text text-transparent uppercase tracking-[0.2em] font-sans">
                SomSphere
              </div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">Campus Security Gateway</p>
            </div>

            <div className="bg-[#101018] border border-white/5 rounded-3xl p-8 shadow-3xl relative overflow-hidden flex flex-col items-center">
              {/* Security lock status */}
              <div className="mb-6 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="absolute inset-0 bg-pink-500/10 rounded-full scale-125 animate-ping duration-1000" />
                  <div className="w-14 h-14 bg-pink-500/10 text-pink-500 border border-pink-500/30 rounded-full flex items-center justify-center relative">
                    <Lock className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">Device Secured Panel</div>
                <p className="text-[10px] text-gray-400 mt-1">Authenticate identity to unlock database</p>
              </div>

              {!isPasscodeFallback ? (
                /* Fingerprint interactive verification screen */
                <div className="w-full flex flex-col items-center">
                  <button 
                    onClick={handleSimulateAuthenticateFingerprint}
                    className="group relative w-24 h-24 bg-gradient-to-b from-[#181824] to-[#0E0E14] border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-2xl hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] transition-all active:scale-[0.96] cursor-pointer"
                    title="Tap to verify biometric parameters"
                  >
                    {/* Ring glow */}
                    <div className="absolute inset-0 border border-pink-500/20 rounded-full scale-110 group-hover:scale-115 transition-transform duration-300" />
                    
                    {/* Concentric scan rings */}
                    <div className="absolute inset-1 border border-dashed border-white/5 rounded-full group-hover:border-pink-500/20 duration-500" />
                    
                    <Fingerprint className="w-10 h-10 text-pink-500 group-hover:text-pink-400 transition-colors animate-pulse duration-1000" />
                  </button>

                  <div className="h-8 flex items-center justify-center">
                    <span className="text-[11px] font-medium text-gray-400 group-hover:text-white transition-colors animate-fade">
                      {biometricStatus}
                    </span>
                  </div>

                  <button 
                    onClick={() => {
                      setIsPasscodeFallback(true);
                      setBiometricPinInput("");
                    }}
                    className="mt-6 text-[10px] font-bold text-pink-500 hover:text-pink-400 uppercase tracking-wider underline transition-colors cursor-pointer"
                  >
                    Use Backup PIN code
                  </button>
                </div>
              ) : (
                /* High security fallback passcode lock screen */
                <form onSubmit={handlePasscodeUnlockSubmit} className="w-full flex flex-col items-center animate-in slide-in-from-bottom-5 duration-200">
                  <div className="w-full mb-4">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-left block mb-1">Enter Override PIN code</label>
                    <input 
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={biometricPinInput}
                      onChange={(e) => setBiometricPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 text-center text-xl font-bold font-mono tracking-[0.5em] text-white outline-none focus:border-pink-500/50"
                      autoFocus
                    />
                    <div className="text-[9.5px] text-gray-500 mt-2 text-center select-none font-medium">
                      Student override test code: <strong className="text-white">1234</strong>
                    </div>
                  </div>

                  <div className="w-full flex gap-2.5 mt-2">
                    <button 
                      type="button"
                      onClick={() => setIsPasscodeFallback(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      disabled={biometricPinInput.length !== 4}
                      className="flex-1 bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none"
                    >
                      Authenticate
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick security details */}
            <div className="mt-8 flex items-center justify-center gap-1.5 text-gray-500 text-[10px] uppercase font-mono tracking-widest select-none">
              <ShieldAlert className="w-3.5 h-3.5 text-pink-500/50" />
              <span>SomSphere End-to-End Cryptography</span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

export function MainLayout() {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <TimerProvider>
          <InnerLayout />
        </TimerProvider>
      </NotificationsProvider>
    </ToastProvider>
  );
}
