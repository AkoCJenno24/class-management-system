/**
 * Global Notification Context & Automated Deadline Evaluator.
 * 1) Subscribes to real-time notifications for the authenticated teacher.
 * 2) Background Engine: Evaluates to-dos and class activities for upcoming & overdue deadlines.
 * 3) Provides global notify/markAsRead/clearAll helpers across the entire platform.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  onNotificationsChange,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  onTodoItemsChange,
  onAllActivitiesChange,
} from '@/lib/firebase/firestore';
import type { AppNotification, NotificationType, NotificationCategory, TodoItem, Activity } from '@/types';

interface SendNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  link?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  sendNotification: (input: SendNotificationInput) => Promise<string | undefined>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Keep track of evaluated entity IDs in current session to prevent duplicate evaluations
  const evaluatedKeysRef = useRef<Set<string>>(new Set());

  // Real-time subscription to notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = onNotificationsChange(user.uid, (data) => {
      setNotifications(data);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Send a new notification (quietly saved to notification center without popping toast cards)
  const sendNotification = useCallback(
    async (input: SendNotificationInput) => {
      if (!user) return undefined;
      try {
        const id = await createNotification(user.uid, {
          title: input.title,
          message: input.message,
          type: input.type ?? 'info',
          category: input.category ?? 'general',
          link: input.link,
          entityId: input.entityId,
          metadata: input.metadata,
        });

        return id;
      } catch (err) {
        console.error('Failed to send notification:', err);
        return undefined;
      }
    },
    [user]
  );

  // Mark single as read
  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await markNotificationAsRead(user.uid, id);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [user]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [user]);

  // Dismiss / delete single notification
  const dismissNotification = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await deleteNotification(user.uid, id);
      } catch (err) {
        console.error('Failed to delete notification:', err);
      }
    },
    [user]
  );

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!user) return;
    try {
      await clearAllNotifications(user.uid);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, [user]);

  // ─── Automated Deadline Evaluator Engine ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const now = new Date();
    const todayDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Evaluate To-Dos
    const unsubTodos = onTodoItemsChange(user.uid, (todos: TodoItem[]) => {
      if (!isMounted) return;

      todos.forEach((todo) => {
        if (todo.completed || !todo.dueDate) return;

        const due = new Date(todo.dueDate);
        const dueDateStr = due.toISOString().slice(0, 10);
        const evalKey = `todo_${todo.id}_${todayDateStr}`;

        // Check if due today or overdue
        const isDueToday = dueDateStr === todayDateStr;
        const isOverdue = due < now && !isDueToday;

        if ((isDueToday || isOverdue) && !evaluatedKeysRef.current.has(evalKey)) {
          evaluatedKeysRef.current.add(evalKey);

          // Check if a notification already exists in Firestore for this todo today
          const alreadyNotified = notifications.some(
            (n) => n.category === 'todo' && n.entityId === todo.id
          );

          if (!alreadyNotified) {
            const title = isDueToday ? 'To-Do Deadline Today' : 'Overdue To-Do Task';
            const message = isDueToday
              ? `"${todo.title}" is scheduled for completion today.`
              : `"${todo.title}" has passed its scheduled deadline.`;

            sendNotification({
              title,
              message,
              type: 'deadline',
              category: 'todo',
              link: '/',
              entityId: todo.id,
              metadata: { dueDate: todo.dueDate },
            });
          }
        }
      });
    });

    // 2. Evaluate Class Activities & Quizzes
    const unsubActivities = onAllActivitiesChange(user.uid, (activities: Activity[]) => {
      if (!isMounted) return;

      activities.forEach((activity) => {
        if (!activity.dueDate) return;

        const due = new Date(activity.dueDate);
        const dueDateStr = due.toISOString().slice(0, 10);
        const evalKey = `activity_${activity.id}_${todayDateStr}`;

        const isDueToday = dueDateStr === todayDateStr;
        const isOverdue = due < now && !isDueToday;

        if ((isDueToday || isOverdue) && !evaluatedKeysRef.current.has(evalKey)) {
          evaluatedKeysRef.current.add(evalKey);

          const alreadyNotified = notifications.some(
            (n) => n.category === 'activity' && n.entityId === activity.id
          );

          if (!alreadyNotified) {
            const title = isDueToday ? 'Activity Due Today' : 'Overdue Class Activity';
            const message = isDueToday
              ? `"${activity.name}" (${activity.type}) is due today.`
              : `"${activity.name}" was due on ${due.toLocaleDateString()}.`;

            sendNotification({
              title,
              message,
              type: 'activity',
              category: 'activity',
              link: `/classes/${activity.classId}`,
              entityId: activity.id,
              metadata: { classId: activity.classId },
            });
          }
        }
      });
    });

    return () => {
      isMounted = false;
      unsubTodos();
      unsubActivities();
    };
  }, [user, notifications, sendNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAll,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
