import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Pencil, Trash2, Plus, Calendar, MapPin, Tag, Building, Shield, Users, Send, Megaphone, CheckCircle2, XCircle, Clock, UserPlus, Eye, Archive, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getErrorMessage } from "@/lib/error-messages";

interface City { id: string; name: string }
interface Category { id: string; name: string }
interface Venue { id: string; name: string; city_id: string }
interface Event {
  id: string; title: string; description: string; date: string; time: string;
  city_id: string; venue_name: string; category_id: string;
  cities: { name: string } | null; venues: { name: string } | null; categories: { name: string } | null;
}
interface Profile { id: string; first_name: string; last_name: string; email?: string }
interface AdminUser { id: string; email: string; first_name: string; last_name: string; has_announcement_access?: boolean; has_report_access?: boolean }
interface ManagedUser { id: string; email: string; first_name: string; last_name: string; created_at: string; has_report_role?: boolean }
interface Announcement {
  id: string; subject: string; body: string; recipient_count: number; created_at: string;
  announcement_recipients?: { status: string }[];
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const [hasAnnouncementAccess, setHasAnnouncementAccess] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalUsers: 0, reminderStats: { r2h: 0, r1d: 0, r2d: 0, r3d: 0, r1w: 0 } });

  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"city" | "category" | "venue" | "event">("city");
  const [formData, setFormData] = useState<any>({});

  // Announcement state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState("events");
  const [searchQuery, setSearchQuery] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  // Admin management state
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // User management state
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editUserData, setEditUserData] = useState<{ id: string; email: string; first_name: string; last_name: string; new_password: string; confirm_password: string }>({ id: "", email: "", first_name: "", last_name: "", new_password: "", confirm_password: "" });
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const tabsRef = useRef<HTMLDivElement>(null);

  const getFunctionErrorMessage = async (error: any) => {
    if (error?.context) {
      try {
        const response = error.context.clone ? error.context.clone() : error.context;
        const body = await response.json();
        if (body?.error) return body.error;
      } catch {
        try {
          const response = error.context.clone ? error.context.clone() : error.context;
          const text = await response.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error) return parsed.error;
            } catch {
              return text;
            }
          }
        } catch {
          // no-op
        }
      }
    }
    return getErrorMessage(error);
  };

  const fetchAll = async () => {
    try {
      const [citiesR, catsR, venuesR, eventsR, profilesR, announcementsR] = await Promise.all([
        supabase.from("cities").select("*").order("name"),
        supabase.from("categories").select("*").order("name"),
        supabase.from("venues").select("*").order("name"),
        supabase.from("events").select("*, cities(name), venues(name), categories(name)").order("date", { ascending: false }),
        supabase.from("profiles").select("id, first_name, last_name, reminder_2h, reminder_1d, reminder_2d, reminder_3d, reminder_1w"),
        supabase.from("announcements").select("*, announcement_recipients(status)").order("created_at", { ascending: false }),
      ]);
      setCities(citiesR.data || []);
      setCategories(catsR.data || []);
      setVenues(venuesR.data || []);
      setEvents((eventsR.data as unknown as Event[]) || []);
      setProfiles((profilesR.data as any[]) || []);
      setAnnouncements((announcementsR.data as unknown as Announcement[]) || []);

      const allProfiles = profilesR.data || [];
      setStats({
        totalEvents: (eventsR.data || []).length,
        totalUsers: allProfiles.length,
        reminderStats: {
          r2h: allProfiles.filter((p: any) => p.reminder_2h).length,
          r1d: allProfiles.filter((p: any) => p.reminder_1d).length,
          r2d: allProfiles.filter((p: any) => p.reminder_2d).length,
          r3d: allProfiles.filter((p: any) => p.reminder_3d).length,
          r1w: allProfiles.filter((p: any) => p.reminder_1w).length,
        },
      });
    } catch (error) {
      console.error("fetchAll error:", error);
      toast.error("Veri yüklenirken hata oluştu");
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase.rpc("list_admins_for_admin" as any);
      if (error) {
        console.error("Failed to fetch admins:", error);
        toast.error(getErrorMessage(error));
        setAdmins([]);
        return;
      }
      const adminList: AdminUser[] = (data || []) as AdminUser[];
      setAdmins(adminList);
      const currentAdmin = adminList.find((a) => a.id === user?.id);
      if (currentAdmin) setHasAnnouncementAccess(!!currentAdmin.has_announcement_access);
    } catch (err: any) {
      console.error("Failed to fetch admins error:", err);
      toast.error(getErrorMessage(err));
      setAdmins([]);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm("Bu kullanıcının admin yetkisini kaldırmak istediğinizden emin misiniz?")) return;
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.rpc("remove_admin_role" as any, { target_user_id: userId });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      toast.success("Admin yetkisi kaldırıldı.");
      fetchAdmins();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setAdminLoading(false); }
  };

  const handleToggleAnnouncement = async (userId: string) => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.rpc("toggle_user_role" as any, { target_user_id: userId, role_name: "announcement_admin" });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      toast.success("Duyuru yetkisi güncellendi.");
      fetchAdmins();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setAdminLoading(false); }
  };

  const handleToggleReportAdmin = async (userId: string) => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.rpc("toggle_user_role" as any, { target_user_id: userId, role_name: "report_admin" });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      toast.success("Rapor yetkisi güncellendi.");
      fetchAdmins();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setAdminLoading(false); }
  };

  const handleAddAdminById = async (userId: string) => {
    const userToPromote = allUsers.find(u => u.id === userId);
    if (!userToPromote?.email) {
      toast.error("Kullanıcı bilgisi bulunamadı.");
      return;
    }
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.rpc("add_admin_by_email" as any, { target_email: userToPromote.email });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      toast.success(`${userToPromote.first_name} ${userToPromote.last_name} admin yapıldı.`);
      fetchAdmins();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setAdminLoading(false); }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_all_users_for_admin" as any);
      if (error) {
        console.error("Failed to fetch users:", error);
        toast.error(getErrorMessage(error));
        setAllUsers([]);
        return;
      }
      setAllUsers((data || []) as ManagedUser[]);
    } catch (err: any) {
      console.error("Failed to fetch users error:", err);
      toast.error(getErrorMessage(err));
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Bu kullanıcıyı tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!")) return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", { body: { action: "delete", user_id: userId } });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Kullanıcı silindi.");

      // Silinen kullanıcıyı state'den hemen kaldır (UI güncelles)
      setAllUsers(prev => prev.filter(u => u.id !== userId));

      fetchUsers();
      fetchAll();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setUsersLoading(false); }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) { toast.error("E-posta ve şifre gereklidir."); return; }
    if (newUserData.password.length < 6) { toast.error("Şifre en az 6 karakter olmalıdır."); return; }
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create", ...newUserData },
      });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Kullanıcı oluşturuldu.");
      setNewUserDialog(false);
      setNewUserData({ email: "", password: "", first_name: "", last_name: "" });
      fetchUsers();
      fetchAll();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setUsersLoading(false); }
  };

  const handleEditUser = (user: ManagedUser) => {
    setEditUserData({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      new_password: "",
      confirm_password: ""
    });
    setEditUserDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editUserData.email.trim()) { toast.error("E-posta gereklidir."); return; }
    if (editUserData.new_password && editUserData.new_password.length < 6) { toast.error("Şifre en az 6 karakter olmalıdır."); return; }
    if (editUserData.new_password && editUserData.new_password !== editUserData.confirm_password) { toast.error("Şifreler eşleşmiyor."); return; }
    setUsersLoading(true);
    try {
      const updatePayload: any = {
        action: "update",
        user_id: editUserData.id,
        email: editUserData.email.trim(),
        first_name: editUserData.first_name.trim(),
        last_name: editUserData.last_name.trim()
      };
      if (editUserData.new_password) {
        updatePayload.new_password = editUserData.new_password;
      }

      console.log("Updating user with payload:", updatePayload);
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: updatePayload,
      });

      if (error) {
        console.error("Function error:", error);
        toast.error(getErrorMessage(error));
        setUsersLoading(false);
        return;
      }

      console.log("Function response:", data);

      if (data?.success === false) {
        console.error("Update failed:", data);
        toast.error(data?.error || "Güncelleme başarısız oldu");
        setUsersLoading(false);
        return;
      }

      if (data?.error) {
        console.error("Update error:", data.error);
        toast.error(data.error);
        setUsersLoading(false);
        return;
      }

      toast.success(editUserData.new_password ? "Kullanıcı bilgileri ve şifre güncellendi." : "Kullanıcı bilgileri güncellendi.");
      setEditUserDialog(false);
      setEditUserData({ id: "", email: "", first_name: "", last_name: "", new_password: "", confirm_password: "" });
      fetchUsers();
      fetchAll();
    } catch (err: any) {
      console.error("Update user error:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleReportRole = async (userId: string) => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.rpc("toggle_user_role" as any, { target_user_id: userId, role_name: "report_admin" });
      if (error) { toast.error(getErrorMessage(error)); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      toast.success("Rapor yetkisi güncellendi.");
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, has_report_role: (data as any).has_role } : u));
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setUsersLoading(false); }
  };

  useEffect(() => {
    if (isAdmin && user && !loading) {
      fetchAll();
      fetchAdmins();
      fetchUsers();
    }
  }, [isAdmin, user?.id, loading]);

  const openDialog = (type: typeof dialogType, item?: any) => {
    setDialogType(type);
    setEditingItem(item || null);
    if (type === "city") setFormData({ name: item?.name || "" });
    else if (type === "category") setFormData({ name: item?.name || "" });
    else if (type === "venue") setFormData({ name: item?.name || "", city_id: item?.city_id || "" });
    else if (type === "event") setFormData({
      title: item?.title || "", description: item?.description || "", date: item?.date || "",
      time: item?.time || "", city_id: item?.city_id || "", venue_name: item?.venue_name || item?.venues?.name || "", category_id: item?.category_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const dataToSave = { ...formData };

    if (dialogType === "event") {
      if (!formData.title || !formData.date || !formData.time || !formData.category_id) { toast.error("Lütfen başlık, tarih, saat ve kategori alanlarını doldurun."); return; }
      // Mekan bilgisi venue_name'e kaydedilecek
      if (!formData.venue_name?.trim()) { toast.error("Lütfen mekan adını girin."); return; }
      dataToSave.venue_id = null; // Artık venue_id kullanmayacağız
    }

    if ((dialogType === "city" || dialogType === "category") && !formData.name?.trim()) { toast.error("Lütfen bir ad girin."); return; }
    if (dialogType === "venue" && !formData.city_id) { toast.error("Lütfen bir şehir seçin."); return; }
    const doSave = async (table: "cities" | "categories" | "venues" | "events") => {
      if (editingItem) return supabase.from(table).update(dataToSave).eq("id", editingItem.id);
      else return supabase.from(table).insert(dataToSave);
    };
    const table = dialogType === "city" ? "cities" as const : dialogType === "category" ? "categories" as const : dialogType === "venue" ? "venues" as const : "events" as const;
    const { error } = await doSave(table);
    if (error) { toast.error((editingItem ? "Güncelleme" : "Ekleme") + " başarısız: " + error.message); return; }
    toast.success(editingItem ? "Güncellendi." : "Eklendi.");
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (table: "cities" | "categories" | "venues" | "events", id: string) => {
    if (!confirm("Silmek istediğinizden emin misiniz?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error("Silme başarısız: " + error.message); return; }
    toast.success("Silindi.");
    fetchAll();
  };

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === profiles.length) setSelectedUsers([]);
    else setSelectedUsers(profiles.map(p => p.id));
  };

  const handleSendAnnouncement = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { toast.error("Lütfen konu ve mesaj alanlarını doldurun."); return; }
    if (selectedUsers.length === 0) { toast.error("Lütfen en az bir kullanıcı seçin."); return; }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-announcement", {
        body: { subject: emailSubject, body: emailBody, recipientIds: selectedUsers },
      });

      if (error) throw error;

      toast.success(`${data.sent} kullanıcıya e-posta gönderildi.${data.failed > 0 ? ` ${data.failed} başarısız.` : ""}`);
      setEmailSubject("");
      setEmailBody("");
      setSelectedUsers([]);
      fetchAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm("Bu duyuruyu silmek istediğinizden emin misiniz?")) return;
    setAnnouncementLoading(true);
    try {
      // Önce ilişkili alıcı kayıtlarını sil
      const { error: recipientError } = await supabase.from("announcement_recipients").delete().eq("announcement_id", announcementId);
      if (recipientError) { toast.error("Alıcı kayıtları silinemedi: " + recipientError.message); return; }
      // Sonra duyuruyu sil
      const { error } = await supabase.from("announcements").delete().eq("id", announcementId);
      if (error) { toast.error("Silme başarısız: " + error.message); return; }
      toast.success("Duyuru silindi.");
      fetchAll();
    } catch (err: any) { toast.error(getErrorMessage(err)); }
    finally { setAnnouncementLoading(false); }
  };

  const statCards = [
    { icon: Calendar, label: "Toplam Etkinlik", value: stats.totalEvents, color: "text-primary", bg: "bg-primary/10", clickable: false },
    {
      icon: Users, label: "Aktif Kullanıcı", value: stats.totalUsers, color: "text-accent", bg: "bg-accent/10", clickable: user?.email === "admin@admin.com", onClick: () => {
        setActiveTab("users");
        setTimeout(() => {
          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    },
  ];

  const reminderBars = [
    { label: "2 saat", val: stats.reminderStats.r2h },
    { label: "1 gün", val: stats.reminderStats.r1d },
    { label: "2 gün", val: stats.reminderStats.r2d },
    { label: "3 gün", val: stats.reminderStats.r3d },
    { label: "1 hafta", val: stats.reminderStats.r1w },
  ];
  const maxReminder = Math.max(...reminderBars.map(r => r.val), 1);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Erişim Reddedildi</h2>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 md:pt-28">
      <Navbar />

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, hsl(var(--gold) / 0.4) 0%, transparent 50%)' }} />
        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="flex items-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm border border-primary-foreground/10">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">Yönetim Paneli</h1>
              <p className="text-primary-foreground/75 mt-1">Etkinlik, şehir, mekan ve kategorileri yönetin</p>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 20C360 40 720 0 1080 20C1260 30 1380 10 1440 20V40H0V20Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
              <Card
                className={`border-border/50 bg-card/70 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all ${s.clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
                  }`}
                onClick={s.clickable ? s.onClick : undefined}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg} ${s.color} transition-colors`}>
                      <s.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Reminder Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <Card className="mt-6 border-border/50 bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Hatırlatıcı Tercihleri Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reminderBars.map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{s.label} önce</span>
                    <div className="flex-1 h-8 rounded-lg bg-muted/50 overflow-hidden relative">
                      <motion.div className="h-full rounded-lg bg-gradient-to-r from-primary/80 to-primary" initial={{ width: 0 }} animate={{ width: `${(s.val / maxReminder) * 100}%` }} transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }} />
                      <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-primary-foreground mix-blend-difference">{s.val} kullanıcı</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CRUD Tabs */}
        <motion.div ref={tabsRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="bg-card/70 border border-border/50 backdrop-blur-sm p-1 flex-wrap h-auto gap-1">
              <TabsTrigger value="events" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-3.5 w-3.5" /> Etkinlikler
              </TabsTrigger>
              <TabsTrigger value="cities" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MapPin className="h-3.5 w-3.5" /> Şehirler
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Tag className="h-3.5 w-3.5" /> Kategoriler
              </TabsTrigger>
              {(user?.email === "admin@admin.com" || hasAnnouncementAccess) && (
                <TabsTrigger value="announcements" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Megaphone className="h-3.5 w-3.5" /> Duyurular
                </TabsTrigger>
              )}
              {user?.email === "admin@admin.com" && (
                <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="h-3.5 w-3.5" /> Kullanıcılar
                </TabsTrigger>
              )}
            </TabsList>

            {/* Events Tab */}
            <TabsContent value="events">
              <Card className="border-border/50 bg-card/70 backdrop-blur-sm mt-4">
                <CardContent className="p-4">
                  {(() => {
                    const today = new Date().toISOString().split("T")[0];
                    const upcomingEvents = events.filter(e => e.date >= today);
                    const pastEvents = events.filter(e => e.date < today);
                    return (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-sm text-muted-foreground">{upcomingEvents.length} yaklaşan etkinlik</p>
                          <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => openDialog("event")}><Plus className="h-4 w-4" /> Yeni Etkinlik</Button>
                        </div>
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold">Başlık</TableHead>
                                <TableHead className="font-semibold">Tarih</TableHead>
                                <TableHead className="font-semibold">Şehir</TableHead>
                                <TableHead className="font-semibold">Kategori</TableHead>
                                <TableHead className="text-right font-semibold">İşlem</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {upcomingEvents.map((e) => (
                                <TableRow key={e.id} className="hover:bg-muted/20">
                                  <TableCell className="font-medium">{e.title}</TableCell>
                                  <TableCell className="text-muted-foreground">{e.date}</TableCell>
                                  <TableCell>{e.cities?.name && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"><MapPin className="h-3 w-3" /> {e.cities.name}</span>}</TableCell>
                                  <TableCell>{e.categories?.name && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"><Tag className="h-3 w-3" /> {e.categories.name}</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openDialog("event", e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete("events", e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Past Events Section */}
                        {pastEvents.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-border/30">
                            <p className="text-sm text-muted-foreground mb-4 font-semibold flex items-center gap-2">
                              <Clock className="h-4 w-4" /> {pastEvents.length} geçmiş etkinlik
                            </p>
                            <div className="rounded-xl border border-border/50 overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-semibold">Başlık</TableHead>
                                    <TableHead className="font-semibold">Tarih</TableHead>
                                    <TableHead className="font-semibold">Şehir</TableHead>
                                    <TableHead className="font-semibold">Kategori</TableHead>
                                    <TableHead className="text-right font-semibold">İşlem</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pastEvents.map((e) => (
                                    <TableRow key={e.id} className="hover:bg-muted/20 opacity-60">
                                      <TableCell className="font-medium">{e.title}</TableCell>
                                      <TableCell className="text-muted-foreground">{e.date}</TableCell>
                                      <TableCell>{e.cities?.name && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"><MapPin className="h-3 w-3" /> {e.cities.name}</span>}</TableCell>
                                      <TableCell>{e.categories?.name && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"><Tag className="h-3 w-3" /> {e.categories.name}</span>}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openDialog("event", e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete("events", e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cities Tab */}
            <TabsContent value="cities">
              <Card className="border-border/50 bg-card/70 backdrop-blur-sm mt-4">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">{cities.length} şehir</p>
                    <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => openDialog("city")}><Plus className="h-4 w-4" /> Yeni Şehir</Button>
                  </div>
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead className="font-semibold">Ad</TableHead><TableHead className="text-right font-semibold">İşlem</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {cities.map((c) => (
                          <TableRow key={c.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openDialog("city", c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete("cities", c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories">
              <Card className="border-border/50 bg-card/70 backdrop-blur-sm mt-4">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">{categories.length} kategori</p>
                    <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => openDialog("category")}><Plus className="h-4 w-4" /> Yeni Kategori</Button>
                  </div>
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead className="font-semibold">Ad</TableHead><TableHead className="text-right font-semibold">İşlem</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {categories.map((c) => (
                          <TableRow key={c.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openDialog("category", c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete("categories", c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcements Tab */}
            {(user?.email === "admin@admin.com" || hasAnnouncementAccess) && <TabsContent value="announcements">
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                {/* Send Email */}
                <Card className="border-border/50 bg-card/70 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Send className="h-5 w-5 text-primary" /> Duyuru Gönder
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Konu</Label>
                      <Input placeholder="E-posta konusu..." value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mesaj</Label>
                      <Textarea placeholder="E-posta içeriğini yazın..." rows={5} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                    </div>

                    {/* User selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Alıcılar ({selectedUsers.length}/{profiles.length})</Label>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAllUsers}>
                          {selectedUsers.length === profiles.length ? "Tümünü Kaldır" : "Tümünü Seç"}
                        </Button>
                      </div>

                      {/* Search Input */}
                      <Input
                        placeholder="Kullanıcı adı veya soyadı ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-sm"
                      />

                      <div className="max-h-48 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/30">
                        {profiles
                          .filter(p =>
                            `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((p) => (
                            <label
                              key={p.id}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={selectedUsers.includes(p.id)}
                                onCheckedChange={() => toggleUser(p.id)}
                              />
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                  {p.first_name?.[0] || "?"}
                                </div>
                                <span className="text-sm font-medium text-foreground truncate">
                                  {p.first_name} {p.last_name}
                                </span>
                              </div>
                            </label>
                          ))}
                        {profiles.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {searchQuery.trim() ? "Eşleşen kullanıcı bulunamadı" : "Henüz kayıtlı kullanıcı yok"}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button onClick={handleSendAnnouncement} className="w-full gap-2 shadow-sm" disabled={sending}>
                      <Send className="h-4 w-4" />
                      {sending ? "Gönderiliyor..." : `${selectedUsers.length} Kullanıcıya Gönder`}
                    </Button>
                  </CardContent>
                </Card>

                {/* History */}
                <Card className="border-border/50 bg-card/70 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-accent" /> Geçmiş Duyurular
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {announcements.length === 0 ? (
                      <div className="text-center py-10">
                        <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                        <p className="text-sm text-muted-foreground mt-3">Henüz duyuru gönderilmedi</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {announcements.map((a) => {
                          const sentCount = a.announcement_recipients?.filter(r => r.status === "sent").length || 0;
                          const failedCount = a.announcement_recipients?.filter(r => r.status === "failed").length || 0;
                          return (
                            <div key={a.id} className="rounded-xl border border-border/50 p-4 hover:bg-muted/20 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-foreground text-sm">{a.subject}</h4>
                                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                  {new Date(a.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                              <div className="flex items-center gap-3 mt-2.5">
                                <span className="inline-flex items-center gap-1 text-xs text-primary">
                                  <Users className="h-3 w-3" /> {a.recipient_count} alıcı
                                </span>
                                {sentCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                                    <CheckCircle2 className="h-3 w-3" /> {sentCount} gönderildi
                                  </span>
                                )}
                                {failedCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                    <XCircle className="h-3 w-3" /> {failedCount} başarısız
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-end gap-1.5 mt-2.5 pt-2.5 border-t border-border/30">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1.5 text-xs hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeleteAnnouncement(a.id)}
                                  disabled={announcementLoading}
                                >
                                  <Trash2 className="h-3 w-3" /> Sil
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>}
            {/* Users Tab */}
            {user?.email === "admin@admin.com" && <TabsContent value="users">
              <Card className="border-border/50 bg-card/70 backdrop-blur-sm mt-4">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      {allUsers.filter(u => u.email !== "admin@admin.com").length} kullanıcı • {admins.length} admin
                    </p>
                    <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => setNewUserDialog(true)}>
                      <UserPlus className="h-4 w-4" /> Yeni Kullanıcı
                    </Button>
                  </div>

                  {/* Search Input */}
                  <div className="mb-4">
                    <Input
                      placeholder="Kullanıcı ara (ad, soyad veya e-posta)..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold">Ad Soyad</TableHead>
                          <TableHead className="font-semibold">E-posta</TableHead>
                          <TableHead className="font-semibold">Kayıt Tarihi</TableHead>
                          <TableHead className="font-semibold text-center">Duyuru Yetkisi</TableHead>
                          <TableHead className="font-semibold text-center">Rapor Yetkisi</TableHead>
                          <TableHead className="text-right font-semibold">İşlem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers
                          .filter(u =>
                            u.email !== "admin@admin.com" &&
                            `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                          .map((u) => {
                            const admin = admins.find(a => a.id === u.id);
                            return (
                              <TableRow key={u.id} className="hover:bg-muted/20">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                      {u.first_name?.[0] || u.email?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span>{u.first_name} {u.last_name}</span>
                                      {admin && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {new Date(u.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                                </TableCell>
                                <TableCell className="text-center">
                                  {admin ? (
                                    u.email !== "admin@admin.com" ? (
                                      <Button
                                        size="sm"
                                        className={`gap-1.5 text-xs ${admin.has_announcement_access
                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                          }`}
                                        onClick={() => handleToggleAnnouncement(u.id)}
                                        disabled={adminLoading}
                                      >
                                        <Megaphone className="h-3 w-3" />
                                        {admin.has_announcement_access ? "Aktif" : "Pasif"}
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Her zaman</span>
                                    )
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {admin ? (
                                    u.email !== "admin@admin.com" ? (
                                      <Button
                                        size="sm"
                                        className={`gap-1.5 text-xs ${admin.has_report_access
                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                          }`}
                                        onClick={() => handleToggleReportAdmin(u.id)}
                                        disabled={adminLoading}
                                      >
                                        <FileText className="h-3 w-3" />
                                        {admin.has_report_access ? "Aktif" : "Pasif"}
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Her zaman</span>
                                    )
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                      onClick={() => handleEditUser(u)}
                                      disabled={usersLoading}
                                      title="Kullanıcı bilgilerini düzenle"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {u.email !== "admin@admin.com" && (
                                      <Button
                                        size="sm"
                                        className={`h-8 px-2 text-xs gap-1 ${admin
                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                          }`}
                                        onClick={() => admin ? handleRemoveAdmin(u.id) : handleAddAdminById(u.id)}
                                        disabled={adminLoading}
                                        title={admin ? "Admin yetkisini kaldır" : "Admin yetkisi ver"}
                                      >
                                        <Shield className="h-3.5 w-3.5" />
                                        {admin ? "Admin" : "Admin Yap"}
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={usersLoading || u.id === user?.id}
                                      title={u.id === user?.id ? "Kendinizi silemezsiniz" : "Kullanıcıyı sil"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        {allUsers.filter(u =>
                          u.email !== "admin@admin.com" &&
                          `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearchQuery.toLowerCase())
                        ).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                {usersLoading ? "Yükleniyor..." : userSearchQuery.trim() ? "Eşleşen kullanıcı bulunamadı" : "Henüz kullanıcı bulunmuyor"}
                              </TableCell>
                            </TableRow>
                          )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>}
          </Tabs>
        </motion.div>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingItem ? "Düzenle" : "Yeni Ekle"} — {dialogType === "city" ? "Şehir" : dialogType === "category" ? "Kategori" : dialogType === "venue" ? "Mekan" : "Etkinlik"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {(dialogType === "city" || dialogType === "category") && (
                <div className="space-y-2">
                  <Label>Ad</Label>
                  <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
              )}
              {dialogType === "venue" && (
                <>
                  <div className="space-y-2"><Label>Ad</Label><Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Şehir</Label>
                    <Select value={formData.city_id || ""} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                      <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {dialogType === "event" && (
                <>
                  <div className="space-y-2"><Label>Başlık</Label><Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Açıklama</Label><Textarea value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Tarih</Label><Input type="date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Saat</Label><Input type="time" value={formData.time || ""} onChange={(e) => setFormData({ ...formData, time: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Şehir</Label>
                    <Select value={formData.city_id || ""} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                      <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mekan</Label>
                    <Input placeholder="Mekan adını girin" value={formData.venue_name || ""} onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select value={formData.category_id || ""} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Button onClick={handleSave} className="w-full shadow-sm">{editingItem ? "Güncelle" : "Ekle"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* New User Dialog */}
        <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Yeni Kullanıcı Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ad</Label>
                  <Input value={newUserData.first_name} onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Soyad</Label>
                  <Input value={newUserData.last_name} onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} />
              </div>
              <Button onClick={handleCreateUser} className="w-full shadow-sm" disabled={usersLoading}>
                {usersLoading ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Kullanıcı Bilgilerini Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ad</Label>
                  <Input value={editUserData.first_name} onChange={(e) => setEditUserData({ ...editUserData, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Soyad</Label>
                  <Input value={editUserData.last_name} onChange={(e) => setEditUserData({ ...editUserData, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={editUserData.email} onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} />
              </div>
              <div className="border-t pt-4 mt-2">
                <p className="text-sm text-muted-foreground mb-3">Şifre değiştirmek istiyorsanız aşağıyı doldurun (boş bırakırsanız şifre değişmez)</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Yeni Şifre</Label>
                    <Input type="password" placeholder="En az 6 karakter" value={editUserData.new_password} onChange={(e) => setEditUserData({ ...editUserData, new_password: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Yeni Şifre (Tekrar)</Label>
                    <Input type="password" placeholder="Şifreyi tekrar girin" value={editUserData.confirm_password} onChange={(e) => setEditUserData({ ...editUserData, confirm_password: e.target.value })} />
                  </div>
                </div>
              </div>
              <Button onClick={handleUpdateUser} className="w-full shadow-sm" disabled={usersLoading}>
                {usersLoading ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </div>
  );
};

export default Admin;
