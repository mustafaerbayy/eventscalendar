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
import { Pencil, Trash2, Plus, Calendar, MapPin, Tag, Shield, Users, Send, Megaphone, CheckCircle2, XCircle, Clock, UserPlus, Eye, Archive, FileText, LayoutDashboard, Database, TrendingUp, AlertTriangle, Search, ChevronRight, MoreHorizontal, Activity, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import { getErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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
  if (loading) return <LoadingScreen />;

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-primary/30">
        <Navbar />
        {/* Abstract Background for Access Denied */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] opacity-30 rounded-full animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
        </div>

        <div className="text-center relative z-10 max-w-lg w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
            className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center mx-auto mb-10 box-glow group"
          >
            <Shield className="h-14 w-14 text-primary group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl -z-10 group-hover:opacity-40 transition-opacity" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl sm:text-6xl font-display font-black text-white mb-6 leading-tight"
          >
            Erişim <span className="text-gradient">Kısıtlandı</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-white/40 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-12 max-w-sm mx-auto leading-relaxed"
          >
            Bu alan yalnızca sistem yetkilileri için tasarlanmıştır. Devam etmek için gerekli izne sahip değilsiniz.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Button
              onClick={() => navigate("/")}
              className="h-16 px-10 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 hover:-translate-y-1 active:translate-y-0 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
            >
              Ana Sayfaya Dön
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-white overflow-x-hidden font-body">
      <Navbar />

      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(245,158,11,0.05)_0%,transparent_40%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150" />
      </div>

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 pt-28 pb-12 lg:pb-24">

        {/* Sleek Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">Yönetim Merkezi</span>
              <div className="h-px w-12 bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-none">
              <span className="text-gradient drop-shadow-[0_0_25px_rgba(245,158,11,0.2)]">Panel</span>
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Sistem Durumu</span>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-bold text-white/90">Aktif ve Güvenli</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onClick={s.clickable ? s.onClick : undefined}
              className={cn(
                "group relative p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 overflow-hidden",
                s.clickable ? "cursor-pointer hover:bg-white/[0.06] hover:border-primary/20 hover:scale-[1.02]" : ""
              )}
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <s.icon className="w-24 h-24 -rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="flex items-start justify-between mb-8">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                  s.color.includes("primary") ? "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary group-hover:text-black" : "bg-accent/10 border-accent/20 text-accent group-hover:bg-accent group-hover:text-white")}>
                  <s.icon className="w-6 h-6" />
                </div>
                {s.clickable && (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-4xl font-display font-black mb-1">{s.value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{s.label}</p>
              </div>
            </motion.div>
          ))}

          {/* Reminder Stats - Integrated Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="lg:col-span-2 p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Kullanıcı Davranışı</span>
                <h3 className="text-xl font-display font-black">Hatırlatıcı Dağılımı</h3>
              </div>
              <Activity className="w-6 h-6 text-primary/30" />
            </div>
            <div className="flex items-end gap-3 h-24">
              {reminderBars.map((r, i) => (
                <div key={r.label} className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end">
                  <div className="relative w-full flex-1 flex flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(r.val / (maxReminder || 1)) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1), ease: [0.23, 1, 0.32, 1] }}
                      className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-xl group-hover/bar:from-primary group-hover/bar:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                      <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-md">{r.val} Kişi</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{r.label.replace('önce', '')}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CRUD Tabs */}
        <motion.div ref={tabsRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="w-full flex justify-start gap-2 bg-transparent border-b border-white/5 p-0 h-auto mb-12 overflow-x-auto no-scrollbar">
              <TabsTrigger
                value="events"
                className="px-6 py-4 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Database className="w-3.5 h-3.5" /> ETKİNLİKLER
              </TabsTrigger>
              <TabsTrigger
                value="cities"
                className="px-6 py-4 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <MapPin className="w-3.5 h-3.5" /> ŞEHİRLER
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="px-6 py-4 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Tag className="w-3.5 h-3.5" /> KATEGORİLER
              </TabsTrigger>
              {(user?.email === "admin@admin.com" || hasAnnouncementAccess) && (
                <TabsTrigger
                  value="announcements"
                  className="px-6 py-4 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent border-b-2 border-transparent data-[state=active]:border-accent rounded-none transition-all gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Megaphone className="w-3.5 h-3.5" /> DUYURULAR
                </TabsTrigger>
              )}
              {user?.email === "admin@admin.com" && (
                <TabsTrigger
                  value="users"
                  className="px-6 py-4 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Users className="w-3.5 h-3.5" /> KULLANICILAR
                </TabsTrigger>
              )}
            </TabsList>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-8">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black">Etkinlik Yönetimi</h3>
                      <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{events.filter(e => e.date >= new Date().toISOString().split("T")[0]).length} Yaklaşan Kayıt</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openDialog("event")}
                    className="h-12 px-6 rounded-xl bg-primary text-black font-black text-xs flex items-center gap-2 shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.3)] transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" />
                    YENİ ETKİNLİK EKLE
                  </motion.button>
                </div>

                <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] overflow-hidden backdrop-blur-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 py-6 pl-8">Etkinlik</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 py-6">Tarih & Saat</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 py-6">Konum</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 py-6">Kategori</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 py-6 text-right pr-8">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.filter(e => e.date >= new Date().toISOString().split("T")[0]).map((e) => (
                        <TableRow key={e.id} className="border-white/5 group hover:bg-white/[0.03] transition-colors">
                          <TableCell className="py-6 pl-8 text-sm font-bold text-white group-hover:text-primary transition-colors">{e.title}</TableCell>
                          <TableCell className="py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white/80">{new Date(e.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })}</span>
                              <span className="text-[10px] font-black text-white/30">{e.time}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-2">
                              {e.cities?.name && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black tracking-widest text-white/60">
                                  <MapPin className="w-3 h-3 text-primary" /> {e.cities.name.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            {e.categories?.name && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black tracking-widest text-primary">
                                <Tag className="w-3 h-3" /> {e.categories.name.toUpperCase()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-6 text-right pr-8">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => openDialog("event", e)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 transition-all">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete("events", e.id)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Past Events */}
                {events.filter(e => e.date < new Date().toISOString().split("T")[0]).length > 0 && (
                  <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <Clock className="w-4 h-4 text-white/30" />
                      <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">GEÇMİŞ ETKİNLİKLER ({events.filter(e => e.date < new Date().toISOString().split("T")[0]).length})</h4>
                    </div>
                    <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] overflow-hidden opacity-60">
                      <Table>
                        <TableBody>
                          {events.filter(e => e.date < new Date().toISOString().split("T")[0]).map((e) => (
                            <TableRow key={e.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                              <TableCell className="py-4 pl-8 text-sm font-bold text-white/60">{e.title}</TableCell>
                              <TableCell className="py-4 text-[10px] font-black text-white/30 uppercase">
                                {new Date(e.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} • {e.time}
                              </TableCell>
                              <TableCell className="py-4 text-right pr-8">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => openDialog("event", e)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-all">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete("events", e.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-destructive transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Cities Tab */}
            <TabsContent value="cities" className="mt-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-black">Şehir Yönetimi</h3>
                  </div>
                  <Button onClick={() => openDialog("city")} className="rounded-xl h-12 px-6 gap-2 font-black text-xs">
                    <Plus className="w-4 h-4 stroke-[3px]" /> YENİ ŞEHİR EKLE
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {cities.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white group-hover:text-primary transition-colors">{c.name}</span>
                        <div className="flex gap-2">
                          <button onClick={() => openDialog("city", c)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-primary transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete("cities", c.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-destructive transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="mt-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-black">Kategori Yönetimi</h3>
                  </div>
                  <Button onClick={() => openDialog("category")} className="rounded-xl h-12 px-6 gap-2 font-black text-xs">
                    <Plus className="w-4 h-4 stroke-[3px]" /> YENİ KATEGORİ EKLE
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categories.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white group-hover:text-primary transition-colors">{c.name}</span>
                        <div className="flex gap-2">
                          <button onClick={() => openDialog("category", c)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-primary transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete("categories", c.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-destructive transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Announcements Tab */}
            {/* Announcements Tab */}
            {(user?.email === "admin@admin.com" || hasAnnouncementAccess) && (
              <TabsContent value="announcements" className="mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Send New Announcement */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-accent/10 flex items-center justify-center border border-accent/20">
                        <Send className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-black">Yeni Duyuru</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent/50">Bildirim Gönder</p>
                      </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Konu</Label>
                        <Input
                          placeholder="Duyuru başlığı..."
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="rounded-2xl h-14 bg-white/5 border-white/10 focus:border-accent/40 px-6 font-bold text-white placeholder:text-white/40"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">İçerik</Label>
                        <Textarea
                          placeholder="Mesajınızı buraya yazın..."
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="rounded-2xl min-h-[180px] bg-white/5 border-white/10 focus:border-accent/40 resize-none px-6 py-5 font-medium leading-relaxed text-white placeholder:text-white/40"
                        />
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Alıcılar ({selectedUsers.length}/{profiles.length})</Label>
                          <button onClick={toggleAllUsers} className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                            {selectedUsers.length === profiles.length ? "Tümünü Kaldır" : "Tümünü Seç"}
                          </button>
                        </div>
                        <div className="relative group">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                          <Input
                            placeholder="Kullanıcı ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-2xl h-14 pl-14 bg-white/5 border-white/10 font-bold text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                          {allUsers
                            .filter(u => u.email !== "admin@admin.com" &&
                              `${u.first_name} ${u.last_name}`.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')))
                            .map((u) => (
                              <label
                                key={u.id}
                                className={cn(
                                  "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer",
                                  selectedUsers.includes(u.id)
                                    ? "bg-accent/10 border-accent/20"
                                    : "bg-white/5 border-transparent hover:border-white/10 hover:bg-white/[0.06]"
                                )}
                              >
                                <Checkbox
                                  checked={selectedUsers.includes(u.id)}
                                  onCheckedChange={() => toggleUser(u.id)}
                                  className="w-5 h-5 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                                />
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xs font-black border border-white/10">
                                    {u.first_name?.[0] || "?"}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{u.first_name} {u.last_name}</span>
                                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Üye</span>
                                  </div>
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSendAnnouncement}
                        disabled={sending}
                        className="w-full h-16 rounded-2xl bg-accent text-white font-black text-xs uppercase tracking-widest hover:bg-accent/80 shadow-[0_15px_30px_rgba(245,158,11,0.2)] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                      >
                        <Send className="w-4 h-4 stroke-[3px]" />
                        {sending ? "GÖNDERİLİYOR..." : `DUYURUYU GÖNDER (${selectedUsers.length} KİŞİ)`}
                      </motion.button>
                    </div>
                  </div>

                  {/* Announcement History */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-white/5 flex items-center justify-center border border-white/10">
                        <Archive className="w-6 h-6 text-white/40" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-black">Duyuru Geçmişi</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Gönderilen Mesajlar</p>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[850px] overflow-y-auto pr-4 custom-scrollbar">
                      {announcements.length === 0 ? (
                        <div className="p-16 text-center rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/5">
                          <Megaphone className="w-16 h-16 text-white/10 mx-auto mb-6" />
                          <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Henüz kayıt bulunamadı</p>
                        </div>
                      ) : (
                        announcements.map((a) => {
                          const sentCount = a.announcement_recipients?.filter(r => r.status === "sent").length || 0;
                          return (
                            <div key={a.id} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all space-y-5">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-2">
                                  <h4 className="text-lg font-bold text-white leading-tight group-hover:text-accent transition-colors">{a.subject}</h4>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                                    <Clock className="w-3 h-3" />
                                    {new Date(a.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteAnnouncement(a.id)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 hover:text-destructive hover:bg-destructive/10 transition-all">
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                              <p className="text-sm text-white/50 font-medium leading-relaxed line-clamp-3">{a.body}</p>
                              <div className="flex items-center gap-6 pt-5 border-t border-white/5">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">ALICILAR</span>
                                  <span className="text-xs font-black text-accent flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> {a.recipient_count}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">DURUM</span>
                                  <span className="text-xs font-black text-primary flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> {sentCount} BAŞARILI
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Users Tab */}
            {user?.email === "admin@admin.com" && (
              <TabsContent value="users" className="mt-8">
                <div className="space-y-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-black">Kullanıcı Yönetimi</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">{allUsers.length} Toplam Kayıt</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                      <div className="relative group flex-1 lg:w-80">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                        <Input
                          placeholder="İsim veya e-posta..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="rounded-2xl h-14 pl-14 bg-white/[0.03] border-white/10 font-bold focus:border-primary/40"
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setNewUserDialog(true)}
                        className="h-14 px-8 rounded-2xl bg-primary text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
                      >
                        <UserPlus className="w-4 h-4 stroke-[3px]" /> YENİ KULLANICI
                      </motion.button>
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] overflow-hidden backdrop-blur-xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 py-8 pl-10">KİMLİK</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 py-8">KAYIT</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 py-8 text-center">DUYURU YETKİSİ</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 py-8 text-center">RAPOR YETKİSİ</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 py-8 text-right pr-10">AKSİYONLAR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers
                          .filter(u => u.email !== "admin@admin.com")
                          .filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLocaleLowerCase('tr-TR').includes(userSearchQuery.toLocaleLowerCase('tr-TR')))
                          .map((u) => {
                            const admin = admins.find(a => a.id === u.id);
                            return (
                              <TableRow key={u.id} className="border-white/5 group hover:bg-white/[0.03] transition-all">
                                <TableCell className="py-8 pl-10">
                                  <div className="flex items-center gap-5">
                                    <div className="relative">
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <span className="text-sm font-black text-primary">{u.first_name?.[0] || "?"}</span>
                                      </div>
                                      {admin && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-black flex items-center justify-center">
                                          <Shield className="w-2.5 h-2.5 text-black" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-3">
                                        <span className="text-base font-bold text-white group-hover:text-primary transition-colors">{u.first_name} {u.last_name}</span>
                                        {admin && <span className="text-[8px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 tracking-widest uppercase">ADMIN</span>}
                                      </div>
                                      <span className="text-xs text-white/40 font-medium">{u.email}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-8">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white/80">{new Date(u.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Üyelik Tarihi</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-8 text-center">
                                  {admin ? (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleToggleAnnouncement(u.id)}
                                      disabled={adminLoading}
                                      className={cn(
                                        "px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                                        admin.has_announcement_access
                                          ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_5px_15px_rgba(16,185,129,0.1)]"
                                          : "bg-white/5 text-white/30 border border-white/10"
                                      )}
                                    >
                                      {admin.has_announcement_access ? "AKTİF" : "PASİF"}
                                    </motion.button>
                                  ) : <span className="text-white/10 font-bold">—</span>}
                                </TableCell>
                                <TableCell className="py-8 text-center">
                                  {admin ? (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleToggleReportAdmin(u.id)}
                                      disabled={adminLoading}
                                      className={cn(
                                        "px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                                        admin.has_report_access
                                          ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_5px_15px_rgba(16,185,129,0.1)]"
                                          : "bg-white/5 text-white/30 border border-white/10"
                                      )}
                                    >
                                      {admin.has_report_access ? "AKTİF" : "PASİF"}
                                    </motion.button>
                                  ) : <span className="text-white/10 font-bold">—</span>}
                                </TableCell>
                                <TableCell className="py-8 text-right pr-10">
                                  <div className="flex justify-end gap-3">
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => admin ? handleRemoveAdmin(u.id) : handleAddAdminById(u.id)}
                                      className={cn(
                                        "h-11 px-5 rounded-2xl text-[10px] font-black tracking-widest flex items-center gap-2 transition-all",
                                        admin ? "bg-white/5 text-white/60 hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20" : "bg-primary text-black shadow-[0_5px_15px_rgba(16,185,129,0.2)]"
                                      )}
                                    >
                                      <Shield className="w-4 h-4" />
                                      {admin ? "YETKİ AL" : "ADMİN YAP"}
                                    </motion.button>
                                    <button onClick={() => handleEditUser(u)} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:bg-white/10 hover:text-white transition-all">
                                      <Pencil className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={u.id === user?.id}
                                      className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-20 transition-all"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-xl bg-[#050505]/95 backdrop-blur-3xl border-white/10 p-0 rounded-[1.5rem] sm:rounded-[2.5rem] selection:bg-primary/30 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 sm:p-10 pb-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl relative z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-black flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    {editingItem ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black">{editingItem ? "Bilgileri Düzenle" : "Yeni Kayıt Oluştur"}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{dialogType === "city" ? "Şehir Yönetimi" : dialogType === "category" ? "Kategori Yönetimi" : dialogType === "venue" ? "Mekan Yönetimi" : "Etkinlik Yönetimi"}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="p-6 sm:p-10 pt-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-6">
                {(dialogType === "city" || dialogType === "category") && (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">İsim</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white placeholder:text-white/40"
                      placeholder="Örn: İstanbul, Konser, vb."
                    />
                  </div>
                )}
                {dialogType === "venue" && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Mekan Adı</Label>
                      <Input
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Şehir</Label>
                      <Select value={formData.city_id || ""} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                        <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:ring-primary/20 transition-all font-bold text-white">
                          <SelectValue placeholder="Şehir seçin" />
                        </SelectTrigger>
                        <SelectContent className="!bg-[#0c0c0c] border-white/10 rounded-2xl p-2 !z-[9999] !opacity-100 !visible">
                          {cities.map((c) => <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold hover:bg-white/10 cursor-pointer !text-white">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {dialogType === "event" && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Etkinlik Başlığı</Label>
                      <Input
                        value={formData.title || ""}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Açıklama</Label>
                      <Textarea
                        value={formData.description || ""}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] p-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-medium leading-relaxed resize-none text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Tarih</Label>
                        <Input
                          type="date"
                          value={formData.date || ""}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Saat</Label>
                        <Input
                          type="time"
                          value={formData.time || ""}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Şehir</Label>
                      <Select value={formData.city_id || ""} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                        <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 transition-all font-bold text-white">
                          <SelectValue placeholder="Şehir seçin" />
                        </SelectTrigger>
                        <SelectContent className="!bg-[#0c0c0c] border-white/10 rounded-2xl p-2 !z-[9999] !opacity-100 !visible">
                          {cities.map((c) => <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold hover:bg-white/10 cursor-pointer !text-white">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Mekan Bilgisi</Label>
                      <Input
                        placeholder="Mekan adını girin (Örn: Jolly Joker)"
                        value={formData.venue_name || ""}
                        onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Kategori</Label>
                      <Select value={formData.category_id || ""} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                        <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 transition-all font-bold text-white">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                        <SelectContent className="!bg-[#0c0c0c] border-white/10 rounded-2xl p-2 !z-[9999] !opacity-100 !visible">
                          {categories.map((c) => <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold hover:bg-white/10 cursor-pointer !text-white">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="w-full h-16 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_15px_30px_rgba(16,185,129,0.2)] mt-4"
                >
                  {editingItem ? "GÜNCELLEMEYİ KAYDET" : "YENİ KAYIT OLUŞTUR"}
                </motion.button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New User Dialog */}
        <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
          <DialogContent className="w-[95vw] sm:max-w-xl bg-[#050505]/95 backdrop-blur-3xl border-white/10 p-0 rounded-[1.5rem] sm:rounded-[2.5rem] selection:bg-primary/30 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 sm:p-10 pb-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl relative z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-black flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black">Yeni Kullanıcı Oluştur</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Üye Kayıt Yönetimi</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="p-6 sm:p-10 pt-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">AD</Label>
                    <Input
                      value={newUserData.first_name}
                      onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">SOYAD</Label>
                    <Input
                      value={newUserData.last_name}
                      onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">E-POSTA ADRESİ</Label>
                  <Input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">ŞİFRE</Label>
                  <Input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateUser}
                  disabled={usersLoading}
                  className="w-full h-16 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_15px_30px_rgba(16,185,129,0.2)] mt-4 disabled:opacity-50"
                >
                  {usersLoading ? "OLUŞTURULUYOR..." : "KULLANICIYI KAYDET"}
                </motion.button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
          <DialogContent className="w-[95vw] sm:max-w-xl bg-[#050505]/95 backdrop-blur-3xl border-white/10 p-0 rounded-[1.5rem] sm:rounded-[2.5rem] selection:bg-primary/30 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 sm:p-10 pb-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl relative z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-black flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Pencil className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black">Kullanıcıyı Düzenle</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{editUserData.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="p-6 sm:p-10 pt-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">AD</Label>
                    <Input
                      value={editUserData.first_name}
                      onChange={(e) => setEditUserData({ ...editUserData, first_name: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">SOYAD</Label>
                    <Input
                      value={editUserData.last_name}
                      onChange={(e) => setEditUserData({ ...editUserData, last_name: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">E-POSTA ADRESİ</Label>
                  <Input
                    type="email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                    className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                  />
                </div>

                <div className="pt-6 border-t border-white/5 mt-2">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6">GÜVENLİK AYARLARI</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">YENİ ŞİFRE</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={editUserData.new_password}
                        onChange={(e) => setEditUserData({ ...editUserData, new_password: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">ŞİFRE TEKRAR</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={editUserData.confirm_password}
                        onChange={(e) => setEditUserData({ ...editUserData, confirm_password: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 transition-all font-bold text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] font-medium text-white/20 mt-4 italic">* Şifreyi değiştirmek istemiyorsanız bu alanları boş bırakabilirsiniz.</p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdateUser}
                  disabled={usersLoading}
                  className="w-full h-16 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_15px_30px_rgba(16,185,129,0.2)] mt-4 disabled:opacity-50"
                >
                  {usersLoading ? "GÜNCELLENİYOR..." : "DEĞİŞİKLİKLERİ KAYDET"}
                </motion.button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </main>
    </div>
  );
};

export default Admin;
