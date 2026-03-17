import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // 1. DUYURU DİNLEYİCİSİ (Herkes için)
    const announcementChannel = supabase
      .channel("public:announcements")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "announcements",
        },
        (payload) => {
          const newAnnouncement = payload.new as any;
          toast.message("Yeni Duyuru! 📢", {
            description: newAnnouncement.subject,
            action: {
              label: "Görüntüle",
              onClick: () => navigate("/yonetim"), // Duyurular genelde yönetimde ama listelenen bir yere de gidebilir
            },
          });
        }
      )
      .subscribe();

    // 2. SOSYAL ETKİLEŞİM DİNLEYİCİSİ (Yorumlar)
    const commentsChannel = supabase
      .channel("public:post_comments")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_comments",
        },
        async (payload) => {
          const newComment = payload.new as any;

          // Eğer yorumu yapan biz değilsek bildirimi işle
          if (newComment.user_id !== user.id) {
            // Hangi postun sahibi olduğumuzu kontrol etmemiz gerekir
            // Şimdilik basitçe bir yorum yapıldığını gösterelim, 
            // Daha sonra "size ait bir posta" filtresi ekleyebiliriz.
            const { data: post } = await supabase
              .from("posts")
              .select("user_id, content")
              .eq("id", newComment.post_id)
              .single();

            if (post && post.user_id === user.id) {
              toast.info("Postunuza Yeni Yorum! 💬", {
                description: newComment.content.substring(0, 50) + "...",
                action: {
                  label: "Git",
                  onClick: () => navigate("/sosyal"),
                },
              });
            }
          }
        }
      )
      .subscribe();

    // 3. REAKSİYON DİNLEYİCİSİ (Beğeniler)
    const reactionsChannel = supabase
      .channel("public:post_reactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_reactions",
        },
        async (payload) => {
          const newReaction = payload.new as any;

          if (newReaction.user_id !== user.id) {
            const { data: post } = await supabase
              .from("posts")
              .select("user_id, content")
              .eq("id", newReaction.post_id)
              .single();

            if (post && post.user_id === user.id) {
              toast(`Biri postuna ${newReaction.emoji} bıraktı!`, {
                action: {
                  label: "Gör",
                  onClick: () => navigate("/sosyal"),
                },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(announcementChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [user, navigate]);
};
