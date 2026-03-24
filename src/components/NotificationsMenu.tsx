import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Calendar as CalendarIcon, FileText, MessageSquare, AtSign, Loader2, Check, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "az önce";
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} sa önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};

export const NotificationsMenu = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch notifications from Supabase table
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20) as any);

      if (error) {
        console.error("Notifications fetch error:", error);
        return [];
      }
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read)?.length || 0;

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      await (supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("id", notifId) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await (supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("user_id", user!.id)
        .eq("is_read", false) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Delete all notifications for this user
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await (supabase
        .from("notifications" as any)
        .delete()
        .eq("user_id", user!.id) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Admin: clear all notifications for all users
  const clearAllGlobalMutation = useMutation({
    mutationFn: async () => {
      await (supabase.rpc("clear_all_notifications" as any) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Admin: delete specific notification for all users
  const deleteGlobalNotificationMutation = useMutation({
    mutationFn: async (item: any) => {
      await (supabase.rpc("delete_notification_for_all" as any, {
        notif_type: item.type,
        notif_description: item.description,
        notif_link: item.link
      }) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const scrollToPost = (postId: string) => {
    setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "ring-offset-2", "transition-all", "duration-500");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "transition-all", "duration-500"), 2500);
      }
    }, 600);
  };

  const handleNotificationClick = (item: any) => {
    markAsReadMutation.mutate(item.id);
    setOpen(false);

    if ((item.type === "post" || item.type === "mention") && item.post_id) {
      if (window.location.pathname === "/sosyal") {
        scrollToPost(item.post_id);
      } else {
        navigate("/sosyal");
        scrollToPost(item.post_id);
      }
    } else {
      navigate(item.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "event":
        return <CalendarIcon className="h-4 w-4 text-emerald-500" />;
      case "report":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "post":
        return <MessageSquare className="h-4 w-4 text-amber-500" />;
      case "mention":
        return <AtSign className="h-4 w-4 text-rose-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 transition-all duration-300"
      >
        <Bell className="w-5 h-5 text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center transform translate-x-1/4 -translate-y-1/4 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Overlay */}
      {open && (
        <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
      )}

      {/* Notifications Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-3 w-[320px] sm:w-[380px] bg-black/85 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[1.5rem] z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-white text-sm">Bildirimler</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-[10px] font-bold text-primary hover:text-primary/70 uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Okundu
                  </button>
                )}
                {notifications && notifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (isAdmin) {
                        if (confirm("Tüm kullanıcıların bildirimlerini silmek istiyor musunuz?")) {
                          clearAllGlobalMutation.mutate();
                        }
                      } else {
                        deleteAllMutation.mutate();
                      }
                    }}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    title={isAdmin ? "Tüm bildirimleri sil (admin)" : "Bildirimlerimi temizle"}
                  >
                    <Trash2 className="w-3 h-3" />
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/40 mb-3" />
                  <p className="text-xs text-white/50 animate-pulse">Bildirimler yükleniyor...</p>
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="flex flex-col divide-y divide-white/5">
                  {notifications.map((item: any) => {
                    const isUnread = !item.is_read;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-4 gap-3 cursor-pointer transition-all hover:bg-white/[0.04] group ${isUnread ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${isUnread ? "border-primary/20 bg-primary/10" : "border-white/5 bg-white/5"}`}>
                            {getIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-0.5">
                              <p className={`text-xs font-black uppercase tracking-widest truncate ${isUnread ? "text-primary" : "text-white/60"}`}>
                                {item.title}
                              </p>
                              <span className="text-[9px] text-white/40 whitespace-nowrap font-medium">
                                {timeAgo(item.created_at)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-white/80 line-clamp-2 leading-snug">
                              {item.description}
                            </p>
                          </div>
                          {isUnread && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-3" />
                          )}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Bu bildirimi tüm kullanıcılardan silmek istediğinizden emin misiniz?")) {
                                  deleteGlobalNotificationMutation.mutate(item);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-xl text-white/20 hover:text-red-400 shrink-0"
                              title="Tüm kullanıcılardan sil (Admin)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 text-white/30" />
                  </div>
                  <p className="text-sm font-bold text-white/60">Bildiriminiz Yok</p>
                  <p className="text-xs text-white/40 mt-1">Gelişmeler olduğunda burada görünecek.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
