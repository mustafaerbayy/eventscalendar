import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-messages";
import { Eye, EyeOff, LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedInput = email.trim().toLowerCase();
    let loginEmail = email.trim();
    if (normalizedInput === "admin") {
      loginEmail = "admin@admin.com";
    } else if (normalizedInput === "..") {
      loginEmail = "m.abdullaherbay32@gmail.com";
    }

    // Google kimliği bağlanmışsa manuel girişi engelle (Kullanıcının isteği üzerine)
    try {
      const { data: emailCheckDatas } = await (supabase.rpc as any)('check_email_identity', { p_email: loginEmail.toLowerCase().trim() });
      const emailData = emailCheckDatas?.[0];

      if (emailData && emailData.exists && emailData.has_google_identity) {
        setLoading(false);
        toast.error("Bu hesap Google ile giriş seçeneğiyle kullanılabilir. Eğer Google ile girmek istemiyorsanız hesabınıza giriş yapıp hesabı silip baştan kayıt olabilirsiniz.", {
          duration: 10000,
        });
        return;
      }
    } catch (err) {
      console.warn("Identity check failed before login:", err);
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);

    if (error) {
      const errorMsg = error.message || "";

      // Hatalı giriş durumunda tekrar kontrol et (RPC'nin gecikmesi ihtimaline karşı fallback)
      if (errorMsg.includes("Invalid login") || errorMsg.includes("invalid_grant")) {
        try {
          const { data } = await (supabase.rpc as any)('check_email_identity', { p_email: loginEmail.toLowerCase().trim() });
          const emailData = data?.[0];

          if (emailData && emailData.exists && emailData.has_google_identity) {
            toast.error("Bu hesap Google ile giriş seçeneğiyle kullanılabilir. Eğer Google ile girmek istemiyorsanız hesabınıza giriş yapıp hesabı silip baştan kayıt olabilirsiniz.", {
              duration: 10000,
            });
            return;
          }
        } catch (err) {
          console.warn("Identity check failed during error handling:", err);
        }

        toast.error("E-posta veya şifreniz hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.", {
          duration: 5000,
        });
      } else if (errorMsg.includes("Email not confirmed")) {
        toast.error("E-posta adresiniz henüz doğrulanmamış. Size yeni bir onay e-postası gönderiyoruz...", { duration: 5000 });

        // Use set timeout to not block the UI thread completely, though it's an async operation
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: loginEmail,
          options: { emailRedirectTo: window.location.origin }
        });

        if (resendError) {
          if (resendError.message.includes("rate limit") || resendError.message.includes("too many requests")) {
            toast.info("Onay e-postanız yakın zamanda zaten gönderilmiş. Lütfen e-posta kutunuzun yanı sıra Spam/Gereksiz klasörünü de kontrol edin.", { duration: 8000 });
          } else {
            toast.error("Yeni onay e-postası gönderilemedi: " + getErrorMessage(resendError));
          }
        } else {
          toast.success("Yeni onay bağlantısı e-posta adresinize başarıyla gönderildi! Lütfen gelen kutunuzu kontrol edin.", { duration: 10000 });
        }
      } else {
        toast.error(getErrorMessage(error));
      }
    } else {
      toast.success("Hoş geldiniz!");
      navigate(from, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    if (!email.trim()) {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${from === '/' ? '' : '?redirect_to=' + encodeURIComponent(from)}`,
        },
      });
      setGoogleLoading(false);
      if (error) {
        toast.error(getErrorMessage(error));
      }
      return;
    }

    setGoogleLoading(true);

    try {
      const { data, error: checkError } = await (supabase.rpc as any)(
        'check_email_identity',
        { p_email: email.toLowerCase().trim() }
      );

      const emailCheck = data?.[0] as any;
      if (emailCheck && emailCheck.exists) {
        if (!emailCheck.has_google_identity) {
          setGoogleLoading(false);

          if (emailCheck.has_password_identity) {
            toast.error("Bu e-posta adresi e-posta/şifre ile kayıtlı. Lütfen şifrenizle giriş yapın.", {
              duration: 5000,
            });
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Email kontrolü yapılamadı, devam ediliyor:", err);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${from === '/' ? '' : '?redirect_to=' + encodeURIComponent(from)}`,
      },
    });
    setGoogleLoading(false);
    if (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Innovative Animated Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(2,8,23,1))]" />

        {/* Animated stars/dots */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/20 blur-sm"
            style={{
              width: Math.random() * 300 + 50,
              height: Math.random() * 300 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Floating gradient orbs */}
        <motion.div
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, hsla(var(--primary), 0.15), transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, hsla(var(--accent), 0.1), transparent 70%)" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-[440px] z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative group rounded-[2.5rem] p-px bg-gradient-to-b from-white/20 to-transparent border border-white/10 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          {/* Inner glass layer */}
          <div className="rounded-[2.45rem] bg-black/40 p-8 md:p-10 backdrop-blur-md border border-white/5 relative">

            <div className="flex flex-col items-center mb-10">
              <Link to="/" className="relative group">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src="/images/logo.png"
                  alt="Logo"
                  className="h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-transform duration-500 group-hover:scale-110"
                />
              </Link>
            </div>

            <div className="mb-8 text-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-2">
                Hoş Geldiniz
              </h1>
              <p className="text-slate-400 font-medium">Lütfen bilgilerinizi girin</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">E-posta</Label>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within/input:text-primary transition-colors pointer-events-none" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="isim@ornek.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 focus:border-primary/50 text-white placeholder:text-slate-600 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-slate-500">Şifre</Label>
                  <Link to="/sifremi-unuttum" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider">
                    Şifremi Unuttum
                  </Link>
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within/input:text-primary transition-colors pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 pr-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 focus:border-primary/50 text-white placeholder:text-slate-600 transition-all font-medium"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                    İşleniyor...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Giriş Yap <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-tighter">
                <span className="bg-black/40 px-3 text-slate-500 font-bold backdrop-blur-sm">VEYA</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all active:scale-[0.98] flex gap-3"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Google ile Devam Et
            </Button>

            <div className="mt-10 text-center">
              <p className="text-slate-400 font-medium">
                Henüz hesabınız yok mu?{" "}
                <Link to="/kayit" className="text-primary hover:text-primary/80 font-bold transition-colors ml-1 underline-offset-4 hover:underline">
                  Hemen Kayıt Ol
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
