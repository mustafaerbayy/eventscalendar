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

            <div className="glass-card rounded-2xl p-2">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Çıkış Yap</span>
              </button>
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
                  <div className="space-y-6">
                    <Card className="glass-card border-none overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl font-display">
                          <User className="w-6 h-6 text-primary" />
                          Kişisel Bilgiler
                        </CardTitle>
                        <CardDescription>Profil bilgilerinizi buradan düzenleyebilirsiniz.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">Ad</Label>
                            <Input
                              id="firstName"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="bg-background/50 border-border/50 focus-visible:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Soyad</Label>
                            <Input
                              id="lastName"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="bg-background/50 border-border/50"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleSaveName}
                          className="w-full md:w-auto px-8 gap-2 bg-primary hover:shadow-glow-primary transition-all"
                          disabled={savingName}
                        >
                          <Save className="w-4 h-4" />
                          {savingName ? "Kaydediliyor..." : "İsmi Güncelle"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-none overflow-hidden group border-glow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl font-display">
                          <Mail className="w-6 h-6 text-primary" />
                          E-posta Adresi
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">E-posta</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isOAuthUser}
                            className={cn(
                              "bg-background/50 border-border/50",
                              isOAuthUser && "cursor-not-allowed opacity-70"
                            )}
                          />
                        </div>
                        {isOAuthUser ? (
                          <div className="p-4 rounded-xl bg-muted/50 border border-border/50 flex gap-3 text-sm">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <p className="text-muted-foreground">
                              Google ile giriş yaptığınız için e-posta düzenlemesi Google hesabınızdan yapılmalıdır.
                            </p>
                          </div>
                        ) : (
                          <Button
                            onClick={handleSaveEmail}
                            className="w-full md:w-auto px-8 gap-2"
                            disabled={savingEmail}
                          >
                            <Save className="w-4 h-4" />
                            {savingEmail ? "Güncelleniyor..." : "E-postayı Güncelle"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeSection === "reminders" && (
                  <Card className="glass-card border-none overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl font-display">
                        <Bell className="w-6 h-6 text-primary" />
                        Hatırlatıcı Tercihleri
                      </CardTitle>
                      <CardDescription>Etkinlikler için bildirim zamanlarını belirleyin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {reminderOptions.map((opt, i) => (
                        <div
                          key={opt.key}
                          className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <opt.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <Label htmlFor={opt.key} className="text-base font-medium transition-colors group-hover:text-primary">
                                {opt.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">{opt.description}</p>
                            </div>
                          </div>
                          <Switch
                            id={opt.key}
                            checked={reminders[opt.key]}
                            onCheckedChange={(val) => setReminders(prev => ({ ...prev, [opt.key]: val }))}
                          />
                        </div>
                      ))}
                      <div className="pt-6">
                        <Button
                          onClick={handleSaveReminders}
                          className="w-full gap-2 shadow-glow-primary"
                          disabled={saving}
                        >
                          <Save className="w-4 h-4" />
                          {saving ? "Kaydediliyor..." : "Tercihleri Kaydet"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSection === "security" && (
                  <div className="space-y-6">
                    <Card className="glass-card border-none overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl font-display">
                          <Lock className="w-6 h-6 text-primary" />
                          Şifre Yönetimi
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {isOAuthUser ? (
                          <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 text-center space-y-3">
                            <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                            <p className="text-muted-foreground">
                              Google hesabınız ile giriş yaptınız. Şifre işlemleri Google üzerinden yönetilmektedir.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="newPassword">Yeni Şifre</Label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                              </div>
                            </div>
                            <Button onClick={handleSavePassword} className="w-full" disabled={savingPassword}>
                              {savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-none border-destructive/20 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Trash2 className="w-16 h-16 text-destructive" />
                      </div>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl font-display text-destructive">
                          <AlertTriangle className="w-6 h-6" />
                          Hesabı Kapat
                        </CardTitle>
                        <CardDescription>Bu işlem geri alınamaz. Lütfen dikkatli olun.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                          className="w-full gap-2 bg-destructive/90 hover:bg-destructive shadow-lg hover:shadow-destructive/20 transition-all font-semibold"
                        >
                          <Trash2 className="w-4 h-4" />
                          Kalıcı Olarak Sil
                        </Button>
                      </CardContent>
                    </Card>
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
