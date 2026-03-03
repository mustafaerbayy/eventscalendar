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
import { motion } from "framer-motion";
import { Bell, Clock, CalendarDays, CalendarRange, CalendarClock, User, Save, Mail, Lock, Trash2, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getErrorMessage } from "@/lib/error-messages";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<"account" | "reminders">(
    searchParams.get("tab") === "reminders" ? "reminders" : "account"
  );

  // Reminders
  const [reminders, setReminders] = useState({
    reminder_2h: false,
    reminder_1d: false,
    reminder_2d: false,
    reminder_3d: false,
    reminder_1w: false,
  });
  const [saving, setSaving] = useState(false);

  // Name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Email
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete Account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check if user logged in with OAuth (Google)
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

  useEffect(() => {
    setActiveSection(searchParams.get("tab") === "reminders" ? "reminders" : "account");
  }, [searchParams]);

  const handleSectionChange = (section: "account" | "reminders") => {
    setActiveSection(section);
    if (section === "reminders") setSearchParams({ tab: "reminders" });
    else setSearchParams({});
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
    // Önce mevcut şifre ile yeniden giriş yap
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
        const errorMsg = await getErrorMessage(error);
        toast.error(errorMsg);
        setDeleting(false);
        return;
      }
      toast.success("Hesabınız başarıyla silindi.");
      setDeleteDialogOpen(false);
      // Kullanıcıyı çıkış yaptır ve ana sayfaya yönlendir
      await supabase.auth.signOut();
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(var(--gold) / 0.4) 0%, transparent 50%)' }} />
        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="flex items-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm border border-primary-foreground/10">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">Profilim</h1>
              <p className="text-primary-foreground/75 mt-1">{profile?.first_name} {profile?.last_name}</p>
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
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-card/70 p-1">
            <Button
              variant={activeSection === "account" ? "default" : "ghost"}
              className="w-full"
              onClick={() => handleSectionChange("account")}
            >
              Hesap Bilgileri
            </Button>
            <Button
              variant={activeSection === "reminders" ? "default" : "ghost"}
              className="w-full"
              onClick={() => handleSectionChange("reminders")}
            >
              Hatırlatıcılar
            </Button>
          </div>

          {activeSection === "account" && (
            <>
          {/* İsim Güncelle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card className="border-border/50 bg-card/70 backdrop-blur-sm shadow-lg shadow-primary/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl">İsim Bilgileri</CardTitle>
                    <CardDescription>Ad ve soyadınızı güncelleyin</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Ad</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Adınız" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Soyad</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Soyadınız" />
                  </div>
                </div>
                <Button onClick={handleSaveName} className="w-full gap-2" disabled={savingName}>
                  <Save className="h-4 w-4" />
                  {savingName ? "Kaydediliyor..." : "İsmi Güncelle"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Google OAuth Kullanıcısı Bilgilendirmesi */}
          {isOAuthUser && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Card className="border-border/50 bg-card/70 backdrop-blur-sm shadow-lg shadow-primary/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl">E-posta Adresi</CardTitle>
                    <CardDescription>Google hesabınızdan yönetilmektedir</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-readonly">E-posta</Label>
                  <Input 
                    id="email-readonly" 
                    type="email" 
                    value={email} 
                    readOnly 
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Google ile giriş yaptığınız için e-posta adresinizi ve şifrenizi buradan değiştiremezsiniz. Bu ayarları Google hesabınızdan yönetebilirsiniz.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {/* E-posta Güncelle - Sadece email/password ile giriş yapanlar için */}
          {!isOAuthUser && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Card className="border-border/50 bg-card/70 backdrop-blur-sm shadow-lg shadow-primary/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl">E-posta Adresi</CardTitle>
                    <CardDescription>Yeni adrese doğrulama maili gönderilecektir</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" />
                </div>
                <Button onClick={handleSaveEmail} className="w-full gap-2" disabled={savingEmail}>
                  <Save className="h-4 w-4" />
                  {savingEmail ? "Güncelleniyor..." : "E-postayı Güncelle"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {/* Şifre Güncelle - Sadece email/password ile giriş yapanlar için */}
          {!isOAuthUser && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Card className="border-border/50 bg-card/70 backdrop-blur-sm shadow-lg shadow-primary/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl">Şifre Değiştir</CardTitle>
                    <CardDescription>Güvenliğiniz için güçlü bir şifre seçin</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                  <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mevcut şifreniz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yeni Şifre</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="En az 6 karakter" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Yeni şifrenizi tekrar girin" />
                </div>
                <Button onClick={handleSavePassword} className="w-full gap-2" disabled={savingPassword}>
                  <Save className="h-4 w-4" />
                  {savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {/* Hesabı Sil */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <Card className="border-destructive/50 bg-card/70 backdrop-blur-sm shadow-lg shadow-destructive/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl text-destructive">Tehlikeli İşlemler</CardTitle>
                    <CardDescription>Bu işlemlerin geri dönüşü yoktur</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive-foreground">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.</span>
                  </p>
                </div>
                <Button 
                  onClick={() => setDeleteDialogOpen(true)} 
                  variant="destructive" 
                  className="w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Hesabımı Sil
                </Button>
              </CardContent>
            </Card>
          </motion.div>

            </>
          )}

          {activeSection === "reminders" && (
            <>
          {/* Hatırlatıcılar */}
          <motion.div id="reminders-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <Card className="border-border/50 bg-card/70 backdrop-blur-sm shadow-lg shadow-primary/5 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl">Hatırlatıcı Tercihleri</CardTitle>
                    <CardDescription className="mt-0.5">Katıldığınız etkinlikler için ne zaman e-posta hatırlatıcısı almak istediğinizi seçin.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {reminderOptions.map((opt, i) => (
                  <motion.div
                    key={opt.key}
                    className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors hover:bg-muted/50"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.35 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <opt.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor={opt.key} className="text-sm font-medium text-foreground cursor-pointer">{opt.label}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={opt.key}
                      checked={reminders[opt.key]}
                      onCheckedChange={(val) => setReminders((prev) => ({ ...prev, [opt.key]: val }))}
                    />
                  </motion.div>
                ))}
                <div className="pt-4 px-4">
                  <Button onClick={handleSaveReminders} className="w-full gap-2 shadow-md shadow-primary/10" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? "Kaydediliyor..." : "Tercihleri Kaydet"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
            </>
          )}

        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl">Hesabı Sil</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Bu işlem <span className="font-semibold text-destructive">geri alınamaz</span>. Hesabınızı sildiğinizde:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Tüm kişisel bilgileriniz kalıcı olarak silinecektir</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Katıldığınız etkinlik kayıtları (RSVP) silinecektir</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Hatırlatıcı tercihleriniz ve geçmişi silinecektir</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Bu e-posta adresi ile yeniden kayıt olmak mümkün olabilir, ancak eski verileriniz geri gelmeyecektir</span>
              </li>
            </ul>
            <div className="mt-6 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Bütün verileriniz silinecektir. Bu işlemin geri dönüşü yoktur.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>Siliniyor...</>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Evet, Hesabımı Sil
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
