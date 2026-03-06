import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Clock, CalendarDays, CalendarRange, CalendarClock,
  User, Save, Mail, Lock, Trash2, AlertTriangle,
  Settings, ShieldCheck, ChevronRight, LogOut,
  LayoutDashboard, Activity
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<"account" | "reminders" | "security">(
    (searchParams.get("tab") as any) || "account"
  );

  // Reminders State
  const [reminders, setReminders] = useState({
    reminder_2h: false,
    reminder_1d: false,
    reminder_2d: false,
    reminder_3d: false,
    reminder_1w: false,
  });
  const [saving, setSaving] = useState(false);

  // Name State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Email State
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete Account State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOAuthUser = user?.app_metadata?.provider === 'google' ||
    user?.identities?.some(identity => identity.provider === 'google');

  useEffect(() => {
    if (profile) {
      setReminders({
        reminder_2h: profile.reminder_2h,
        reminder_1d: profile.reminder_1d,
        reminder_2d: profile.reminder_2d,
        reminder_3d: profile.reminder_3d,
        reminder_1w: profile.reminder_1w,
      });
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
    if (user) setEmail(user.email || "");
  }, [user, profile, loading]);

  const handleSectionChange = (section: any) => {
    setActiveSection(section);
    setSearchParams({ tab: section });
  };

  const handleSaveReminders = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(reminders).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(getErrorMessage(error));
    else { toast.success("Hatırlatıcı tercihleri güncellendi."); refreshProfile(); }
  };

  const handleSaveName = async () => {
    if (!user) return;
    if (!firstName.trim()) { toast.error("İsim boş olamaz."); return; }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq("id", user.id);
    setSavingName(false);
    if (error) toast.error(getErrorMessage(error));
    else { toast.success("İsim bilgileri güncellendi."); refreshProfile(); }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) { toast.error("E-posta boş olamaz."); return; }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) toast.error(getErrorMessage(error));
    else toast.success("E-posta güncellendi. Yeni adresinize doğrulama maili gönderildi.");
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { toast.error("Yeni şifre en az 6 karakter olmalıdır."); return; }
    if (newPassword !== confirmPassword) { toast.error("Şifreler eşleşmiyor."); return; }
    setSavingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      toast.error("Mevcut şifreniz hatalı.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error(getErrorMessage(error));
    else {
      toast.success("Şifreniz başarıyla güncellendi.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("delete_my_account" as any);
      if (error) {
        toast.error(getErrorMessage(error));
        setDeleting(false);
        return;
      }
      toast.success("Hesabınız başarıyla silindi.");
      setDeleteDialogOpen(false);
      await signOut();
      navigate("/");
    } catch (err: any) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  const reminderOptions = [
    { key: "reminder_2h" as const, label: "2 saat önce", description: "Etkinlik başlamadan 2 saat önce", icon: Clock },
    { key: "reminder_1d" as const, label: "1 gün önce", description: "Etkinlikten bir gün önce", icon: CalendarDays },
    { key: "reminder_2d" as const, label: "2 gün önce", description: "Etkinlikten iki gün önce", icon: CalendarClock },
    { key: "reminder_3d" as const, label: "3 gün önce", description: "Etkinlikten üç gün önce", icon: CalendarRange },
    { key: "reminder_1w" as const, label: "1 hafta önce", description: "Etkinlikten bir hafta önce", icon: CalendarRange },
  ];

  if (loading) return null;

  const sidebarItems = [
    { id: "account", label: "Hesap Bilgileri", icon: User },
    { id: "reminders", label: "Hatırlatıcılar", icon: Bell },
    { id: "security", label: "Güvenlik", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-mesh pt-32 md:pt-40 pb-12">
      <Navbar />

      <div className="container mx-auto px-4">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 p-8 rounded-3xl glass-card overflow-hidden bg-gradient-to-br from-primary/20 via-transparent to-accent/10"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Settings className="w-32 h-32 animate-spin-slow rotate-12" />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent p-[2px] shadow-glow-primary">
                <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center overflow-hidden">
                  <User className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-accent text-accent-foreground p-1.5 rounded-lg shadow-lg border border-background">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                Hoş Geldin, <span className="text-gradient">{profile?.first_name || "Kullanıcı"}</span>
              </h1>
              <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" /> {user?.email}
              </p>
            </div>

            <div className="flex gap-4 ml-auto">
              <div className="hidden lg:flex items-center gap-2 p-4 rounded-2xl glass-sm border border-border/50">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Hesap Durumu</p>
                  <p className="text-sm font-medium text-accent">Aktif Üye</p>
                </div>
                <ShieldCheck className="w-8 h-8 text-accent/60" />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-4"
          >
            <div className="glass-card rounded-2xl p-2 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {activeSection === item.id && <ChevronRight className="ml-auto w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {activeSection === "account" && (
                  <div className="space-y-8">
                    {/* Personal Info Module */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent blur-xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="relative bg-[#0c0c0c] border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                        <div className="p-6 md:p-12 relative z-10 w-full">
                          <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                              <User className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-1 md:mb-2">
                                KİMLİK
                              </div>
                              <h2 className="text-2xl md:text-3xl font-display font-black text-white">Kişisel Bilgiler</h2>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-full">
                            <div className="space-y-3 w-full border-box">
                              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2 block">Ad</label>
                              <input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Adınız"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 md:px-6 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all focus:bg-white/[0.07] block min-w-0"
                              />
                            </div>
                            <div className="space-y-3 w-full border-box">
                              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2 block">Soyad</label>
                              <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Soyadınız"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 md:px-6 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all focus:bg-white/[0.07] block min-w-0"
                              />
                            </div>
                          </div>

                          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-end">
                            <button
                              onClick={handleSaveName}
                              disabled={savingName}
                              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-primary text-black font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              <Save className="w-5 h-5" />
                              {savingName ? "KAYDEDİLİYOR..." : "DEĞİŞİKLİKLERİ KAYDET"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Module */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent blur-xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="relative bg-[#0c0c0c] border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="p-6 md:p-12 relative z-10 w-full">
                          <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                              <Mail className="w-6 h-6 md:w-7 md:h-7 text-amber-500" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest mb-1 md:mb-2">
                                İLETİŞİM
                              </div>
                              <h2 className="text-2xl md:text-3xl font-display font-black text-white">E-posta Adresi</h2>
                            </div>
                          </div>

                          <div className="space-y-3 w-full border-box">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2 block">Kayıtlı E-posta</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isOAuthUser}
                              className={cn(
                                "w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 md:px-6 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-all focus:bg-white/[0.07] block min-w-0",
                                isOAuthUser && "opacity-50 cursor-not-allowed"
                              )}
                            />
                          </div>

                          {isOAuthUser ? (
                            <div className="mt-6 md:mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                              <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                              <p className="text-sm font-medium text-white/70 leading-relaxed">
                                Google hesabınız ile giriş yaptınız. Güvenliğiniz için e-posta değişikliği doğrudan Google hesap ayarlarınız üzerinden yapılmalıdır.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-end">
                              <button
                                onClick={handleSaveEmail}
                                disabled={savingEmail}
                                className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-amber-500 text-black font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                <Save className="w-5 h-5" />
                                {savingEmail ? "GÜNCELLENİYOR..." : "E-POSTAYI GÜNCELLE"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "reminders" && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent blur-2xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="relative bg-[#0c0c0c] border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                      <div className="p-6 md:p-12 relative z-10 w-full">
                        <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-12">
                          <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
                            <Bell className="w-6 h-6 md:w-7 md:h-7 text-primary relative z-10" />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-1 md:mb-2">
                              BİLDİRİMLER
                            </div>
                            <h2 className="text-2xl md:text-3xl font-display font-black text-white">Hatırlatıcı Tercihleri</h2>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {reminderOptions.map((opt) => (
                            <label
                              key={opt.key}
                              className="group/item flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 md:p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-white/[0.04] transition-all cursor-pointer gap-4"
                            >
                              <div className="flex items-center gap-4 md:gap-5">
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:scale-110 transition-all text-white/50 group-hover/item:text-primary">
                                  <opt.icon className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-white group-hover/item:text-primary transition-colors">{opt.label}</h3>
                                  <p className="text-xs font-medium text-white/40 mt-1">{opt.description}</p>
                                </div>
                              </div>
                              <div className="ml-auto sm:ml-4">
                                <Switch
                                  id={opt.key}
                                  checked={reminders[opt.key]}
                                  onCheckedChange={(val) => setReminders(prev => ({ ...prev, [opt.key]: val }))}
                                  className="data-[state=checked]:bg-primary"
                                />
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="mt-8 md:mt-12 flex flex-col sm:flex-row justify-end border-t border-white/10 pt-8">
                          <button
                            onClick={handleSaveReminders}
                            disabled={saving}
                            className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-primary text-black font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            <Save className="w-5 h-5" />
                            {saving ? "KAYDEDİLİYOR..." : "TERCİHLERİ KAYDET"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "security" && (
                  <div className="space-y-8">
                    {/* Password Module */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent blur-xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="relative bg-[#0c0c0c] border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="p-6 md:p-12 relative z-10 w-full">
                          <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                              <Lock className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest mb-1 md:mb-2">
                                GİZLİLİK
                              </div>
                              <h2 className="text-2xl md:text-3xl font-display font-black text-white">Şifre Yönetimi</h2>
                            </div>
                          </div>

                          {isOAuthUser ? (
                            <div className="p-8 rounded-3xl bg-blue-500/5 border border-blue-500/20 text-center space-y-4">
                              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-8 h-8 text-blue-400" />
                              </div>
                              <h3 className="text-xl font-bold text-white">Harici Sağlayıcı (Google)</h3>
                              <p className="text-sm font-medium text-white/60 max-w-md mx-auto leading-relaxed">
                                Sisteme Google altyapısı kullanarak giriş yaptınız. Şifre değiştirme ve sıfırlama işlemleri sadece Google hesap ayarları üzerinden yapılabilir.
                              </p>
                            </div>
                          ) : (
                            <div className="w-full xl:max-w-2xl">
                              <div className="space-y-6">
                                <div className="space-y-3 w-full border-box">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2 block">Mevcut Şifre</label>
                                  <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 md:px-6 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all focus:bg-white/[0.07] block min-w-0"
                                  />
                                </div>
                                <div className="space-y-3 w-full border-box">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2 block">Yeni Şifre</label>
                                  <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 md:px-6 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all focus:bg-white/[0.07] block min-w-0"
                                  />
                                </div>
                                <div className="space-y-3 w-full border-box">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2 block">Yeniden Yeni Şifre</label>
                                  <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 md:px-6 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all focus:bg-white/[0.07] block min-w-0"
                                  />
                                </div>
                              </div>

                              <div className="mt-8 md:mt-10">
                                <button
                                  onClick={handleSavePassword}
                                  disabled={savingPassword}
                                  className="w-full sm:w-auto min-w-[200px] h-14 px-10 rounded-2xl bg-blue-500 text-black font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(59,130,246,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                  <Lock className="w-5 h-5" />
                                  {savingPassword ? "GÜNCELLENİYOR..." : "ŞİFREYİ GÜNCELLE"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent blur-xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="relative bg-[#0c0c0c] border border-red-500/20 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                          <AlertTriangle className="w-64 h-64 text-red-500 -rotate-12 translate-x-1/4 -translate-y-1/4" />
                        </div>

                        <div className="p-6 md:p-12 relative z-10 w-full">
                          <div className="flex items-center gap-4 md:gap-5 mb-8">
                            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-inner">
                              <Trash2 className="w-6 h-6 md:w-7 md:h-7 text-red-500" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest mb-1 md:mb-2">
                                TEHLİKELİ BÖLGE
                              </div>
                              <h2 className="text-2xl md:text-3xl font-display font-black text-red-500">Hesabı Sil</h2>
                            </div>
                          </div>

                          <p className="text-sm font-medium text-white/50 mb-8 max-w-xl leading-relaxed">
                            Hesabınızı kalıcı olarak silmek istiyorsanız aşağıdaki butonu kullanabilirsiniz. Bu işlem geri alınamaz ve tüm verileriniz sistemden tamamen temizlenir.
                          </p>

                          <button
                            onClick={() => setDeleteDialogOpen(true)}
                            className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 font-black flex items-center justify-center gap-3 transition-all group/btn"
                          >
                            <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            KALICI OLARAK SİL
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-card border-none max-w-md">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive mx-auto md:mx-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl text-center md:text-left">Hesabınızı silmek istediğinizden emin misiniz?</DialogTitle>
            <DialogDescription className="text-center md:text-left">
              Bu işlem veri kaybına neden olur ve geri getirilemez.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting} className="w-full">
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="w-full gap-2">
              {deleting ? "Siliniyor..." : "Evet, Hesabı Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
