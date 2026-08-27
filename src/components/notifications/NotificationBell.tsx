/**
 * Header Notification Bell & Dropdown Center.
 * Provides interactive popover for viewing real-time alerts, deadlines, and notifications.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Clock,
  Award,
  CheckSquare,
  GraduationCap,
  Info,
  Check,
  CheckCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { AppNotification } from '@/types';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: AppNotification['type'], category: AppNotification['category']) {
  if (type === 'deadline' || category === 'todo') {
    return {
      icon: Clock,
      color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    };
  }
  if (type === 'activity' || category === 'activity') {
    return {
      icon: Award,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    };
  }
  if (category === 'grade' || type === 'grade') {
    return {
      icon: GraduationCap,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }
  if (category === 'class') {
    return {
      icon: CheckSquare,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    };
  }
  return {
    icon: Info,
    color: 'bg-primary/10 text-primary border-primary/20',
  };
}

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const [isOpen, setIsOpen] = useState(false);

  const displayedNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={`Notifications (${unreadCount} unread)`}
          />
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs border-2 border-background pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-2xl border-border bg-card shadow-2xl overflow-hidden flex flex-col gap-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-bold bg-primary/10 text-primary border-primary/20">
                {unreadCount} new
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAll()}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tab Filters: Unread on Left, All on Right */}
        <div className="flex border-b border-border bg-muted/10 px-2 pt-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'unread'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({notifications.length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <p className="text-sm font-medium text-foreground">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
                {activeTab === 'unread'
                  ? "You're all caught up with your tasks and deadlines."
                  : 'Automated deadline alerts and class updates will show up here.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((notification) => {
              const { icon: IconComponent, color } = getNotificationIcon(
                notification.type,
                notification.category
              );

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer ${
                    notification.read
                      ? 'hover:bg-muted/40 opacity-80 hover:opacity-100'
                      : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${color}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs capitalize truncate leading-tight ${
                          notification.read
                            ? 'font-medium text-foreground'
                            : 'font-bold text-foreground'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {notification.message}
                    </p>

                    {/* Action Bar for each individual notification */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                      <div>
                        {!notification.read ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="h-6 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md cursor-pointer"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Mark as read
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Read</span>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
