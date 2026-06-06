import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  type: "system" | "deadline" | "ai" | "pdf" | "gmail";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (type: Notification["type"], title: string, message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "somsphere_notifications_v1";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse notifications from localStorage:", e);
    }
    // Default initial notifications if none saved
    return [
      {
        id: "init_1",
        type: "system",
        title: "Welcome to SomSphere!",
        message: "Your all-in-one workspaces, study tools, secure PDF editor, and Gmail workspace are active.",
        time: "Just now",
        read: false,
      },
      {
        id: "init_2",
        type: "ai",
        title: "Study Guide Smart Tip",
        message: "You can lock documents in PDF Editor with enterprise-grade encryption now.",
        time: "1 hour ago",
        read: true,
      }
    ];
  });

  // Save to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error("Failed to save notifications to localStorage:", e);
    }
  }, [notifications]);

  const addNotification = useCallback((type: Notification["type"], title: string, message: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9) + "_" + Date.now(),
      type,
      title,
      message,
      time: "Just now",
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        unreadCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
