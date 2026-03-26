import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Loader2, AlertCircle, CheckCircle2, Info, AlertTriangle, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

type NotificationType = "success" | "error" | "info" | "warning";

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
};

const TYPE_BG: Record<NotificationType, string> = {
  success: "bg-green-400/5 border-green-400/10",
  error: "bg-red-400/5 border-red-400/10",
  info: "bg-blue-400/5 border-blue-400/10",
  warning: "bg-yellow-400/5 border-yellow-400/10",
};

function formatRelativeTime(date: Date | string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHour < 24) return `${diffHour}h atrás`;
  return `${diffDay}d atrás`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Poll unread count every 30 seconds
  const { data: unreadData } = trpc.notifications.countUnread.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { enabled: open, refetchOnWindowFocus: true }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.countUnread.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.countUnread.invalidate();
      utils.notifications.list.invalidate();
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = unreadData?.count ?? 0;

  function handleNotificationClick(notification: {
    id: number;
    readAt: Date | null;
    projectId?: number | null;
  }) {
    if (!notification.readAt) {
      markReadMutation.mutate({ id: notification.id });
    }
    if (notification.projectId) {
      setOpen(false);
      navigate(`/projects/${notification.projectId}`);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Marcar todas
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-muted-foreground opacity-30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você será notificado quando o processamento concluir
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((n) => {
                  const type = n.type as NotificationType;
                  const isUnread = !n.readAt;
                  return (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                        isUnread ? "bg-muted/20" : ""
                      }`}
                      onClick={() =>
                        handleNotificationClick({
                          id: n.id,
                          readAt: n.readAt,
                          projectId: n.projectId,
                        })
                      }
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg border ${TYPE_BG[type]}`}>
                        {TYPE_ICONS[type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground/70">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                          {n.projectId && (
                            <span className="text-xs text-primary/70 flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" />
                              Ver projeto
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
