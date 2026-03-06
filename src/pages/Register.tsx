import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-messages";
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

const Register = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim().length === 0 || lastName.trim().length === 0) {
      toast.error("Ad ve soyad gereklidir.");
      return;
    }
    if (email !== emailConfirm) {
      toast.error("E-posta adresleri eşleşmiyor.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);

    // Email check
    try {
      const { data: emailCheckDatas, error: checkError } = await (supabase.rpc as any)('check_email_identity', { p_email: email.toLowerCase() });
      const emailData = emailCheckDatas?.[0]; // check_email_identity returns a table (array)

      if (emailData && emailData.exists) {
        if (emailData.has_google_identity && !emailData.has_password_identity) {
          setLoading(false);
          toast.error("Bu e-posta adresi Google ile zaten kayıtlı. Lütfen 'Google ile Giriş Yap' butonunu kullanın.", {
            duration: 6000,
          });
          return;
        }

        if (emailData.has_password_identity) {
          setLoading(false);
          toast.error("Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya şifrenizi sıfırlayın.", {
            duration: 6000,
          });
          return;
        }
      }
    } catch (err) {
      console.warn("Email check failed, proceeding with signup:", err);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(getErrorMessage(error));
      return;
    }

    // If user exists but no session, it often means email is already registered or needs confirmation
    if (data?.user && !data?.session) {
      toast.info("Bu hesap zaten mevcut olabilir veya onay bekliyor. Lütfen e-postanızı kontrol edin veya giriş yapmayı deneyin.");
      navigate("/giris");
      return;
    }

    toast.success("Kayıt başarılı! Lütfen e-postanızı doğrulayın.");
    navigate("/giris");
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    setGoogleLoading(false);
    if (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.18), transparent 70%)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-[440px]"
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
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">Hesap Oluştur</h1>
            <p className="mt-1 text-sm text-muted-foreground">Aramıza katılın</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">Ad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Adınız" className="pl-9 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">Soyad</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Soyadınız" className="h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com" className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailConfirm" className="text-sm font-medium">E-posta (Tekrar)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="emailConfirm" type="email" value={emailConfirm} onChange={(e) => setEmailConfirm(e.target.value)} required placeholder="E-postayı tekrar girin" className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="En az 6 karakter" className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passwordConfirm" className="text-sm font-medium">Şifre (Tekrar)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="passwordConfirm" type={showPasswordConfirm ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={6} placeholder="Şifreyi tekrar girin" className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} tabIndex={-1}>
                  {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 gap-2 mt-2 font-semibold shadow-lg shadow-primary/20" disabled={loading || googleLoading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                  Kayıt yapılıyor...
                </span>
              ) : (
                <><UserPlus className="h-4 w-4" /> Kayıt Ol</>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">veya</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2 font-semibold border-border/60 hover:bg-accent/50"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-foreground/40 border-t-foreground animate-spin" />
                Bağlanıyor...
              </span>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google ile Kayıt Ol
              </>
            )}
          </Button>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link to="/giris" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Giriş Yap
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
