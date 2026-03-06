import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-messages";
import { Eye, EyeOff, UserPlus, Mail, Lock, User, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

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

    try {
      const { data: emailCheckDatas, error: checkError } = await (supabase.rpc as any)('check_email_identity', { p_email: email.toLowerCase() });
      const emailData = emailCheckDatas?.[0];

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
    <div className="min-h-screen bg-[#02010a] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Dynamic Background Consistency */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(10,1,20,1),rgba(2,1,10,1))]" />

        {/* Animated accents */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-accent/10 blur-[80px]"
            style={{
              width: Math.random() * 400 + 100,
              height: Math.random() * 400 + 100,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 80 - 40, 0],
              y: [0, Math.random() * 80 - 40, 0],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: Math.random() * 12 + 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        <motion.div
          className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, hsla(var(--primary), 0.1), transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, hsla(var(--accent), 0.1), transparent 70%)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-[480px] perspective-1000"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative group rounded-[2.5rem] p-px bg-gradient-to-b from-white/10 to-transparent border border-white/5 backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
          <div className="rounded-[2.45rem] bg-black/40 p-8 md:p-10 backdrop-blur-sm border border-white/5 relative z-10">
            {/* Ambient inner glow */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="flex flex-col items-center mb-8" style={{ transform: "translateZ(40px)" }}>
              <Link to="/" className="relative transition-transform duration-300 hover:scale-110">
                <img src="/images/logo.png" alt="Logo" className="h-16 w-16 object-contain drop-shadow-[0_0_12px_rgba(var(--primary),0.4)]" />
              </Link>
            </div>

            <div className="mb-8 text-center" style={{ transform: "translateZ(30px)" }}>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-2">Hesap Oluştur</h1>
              <p className="text-slate-400 font-medium">Ayrıcalıklı dünyaya adım atın</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4" style={{ transform: "translateZ(20px)" }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Ad</Label>
                  <div className="relative group/input">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-primary transition-colors" />
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Ali" className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 focus:border-primary/40 text-sm text-white transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Soyad</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Yılmaz" className="h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 focus:border-primary/40 text-sm text-white transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">E-posta</Label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-primary transition-colors" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com" className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 focus:border-primary/40 text-sm text-white transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emailConfirm" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">E-posta Onay</Label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-primary transition-colors" />
                  <Input id="emailConfirm" type="email" value={emailConfirm} onChange={(e) => setEmailConfirm(e.target.value)} required placeholder="E-posta tekrar" className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 focus:border-primary/40 text-sm text-white transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Şifre</Label>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-primary transition-colors" />
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-11 pr-10 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 focus:border-primary/40 text-sm text-white" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passwordConfirm" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Onay</Label>
                  <div className="relative group/input">
                    <Input id="passwordConfirm" type={showPasswordConfirm ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={6} className="h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 focus:border-primary/40 text-sm text-white" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} tabIndex={-1}>
                      {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 mt-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/10 transition-all active:scale-[0.98] group" disabled={loading || googleLoading}>
                {loading ? (
                  <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" /> İşleniyor...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">Kayıt Ol <UserPlus className="h-5 w-5" /></span>
                )}
              </Button>
            </form>

            <div className="relative my-7" style={{ transform: "translateZ(20px)" }}>
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest"><span className="bg-black/40 px-3 text-slate-600">veya</span></div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all flex gap-3"
              onClick={handleGoogleSignup}
              disabled={loading || googleLoading}
              style={{ transform: "translateZ(20px)" }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" opacity="0.8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" opacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" opacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google ile Katılın
            </Button>

            <div className="mt-8 text-center" style={{ transform: "translateZ(20px)" }}>
              <p className="text-slate-400 font-medium text-sm">
                Zaten hesabınız var mı? <Link to="/giris" className="text-primary hover:text-primary/80 font-bold ml-1 transition-colors">Giriş Yap</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
