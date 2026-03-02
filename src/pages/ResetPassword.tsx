import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/lib/error-messages";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Önce listener'ı kur — Supabase hash token'larını otomatik işler
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setSessionReady(true);
      }
      // SIGNED_IN ile de gelebilir, hash'te type=recovery varsa kabul et
      if (event === "SIGNED_IN" && session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get("type") === "recovery") {
          setIsRecovery(true);
          setSessionReady(true);
        }
      }
    });

    // Listener kurulmadan önce oturum zaten işlenmiş olabilir, kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get("type") === "recovery") {
          setIsRecovery(true);
          setSessionReady(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionReady) { toast.error("Oturum henüz hazır değil, lütfen bekleyin."); return; }
    if (password.length < 6) { toast.error("Şifre en az 6 karakter olmalıdır."); return; }
    if (password !== confirmPassword) { toast.error("Şifreler eşleşmiyor."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Şifreniz başarıyla güncellendi!");
      setTimeout(() => navigate("/giris"), 3000);
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.18), transparent 70%)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-[420px]"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Link to="/">
            <img src="/images/logo.png" alt="Logo" className="h-24 w-24 drop-shadow-lg object-contain hover:scale-105 transition-transform duration-300" />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/10 p-8">
          {success ? (
            <motion.div
              className="text-center space-y-5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Şifre Güncellendi</h1>
                <p className="mt-2 text-sm text-muted-foreground">Şifreniz başarıyla güncellendi. Birkaç saniye içinde giriş sayfasına yönlendirileceksiniz.</p>
              </div>
            </motion.div>
          ) : !sessionReady ? (
            <div className="text-center py-8 space-y-3">
              <div className="flex justify-center">
                <span className="h-10 w-10 rounded-full border-4 border-border border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Oturum doğrulanıyor, lütfen bekleyin...</p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold text-foreground">Yeni Şifre Belirleyin</h1>
                <p className="mt-1 text-sm text-muted-foreground">Hesabınız için güçlü bir şifre oluşturun</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Yeni Şifre</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="En az 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Yeni Şifre (Tekrar)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Şifreyi tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                      Güncelleniyor...
                    </span>
                  ) : "Şifreyi Güncelle"}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
