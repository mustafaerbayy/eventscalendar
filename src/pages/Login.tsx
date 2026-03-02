import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-messages";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedInput = email.trim().toLowerCase();
    const loginEmail = normalizedInput === "admin" ? "admin@admin.com" : email.trim();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) {
      toast.error(getErrorMessage(error));
    } else {
      toast.success("Hoş geldiniz!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Decorative background blobs */}
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
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">Giriş Yap</h1>
            <p className="mt-1 text-sm text-muted-foreground">Hesabınıza erişin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-posta veya Kullanıcı Adı</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="text"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
                <Link to="/sifremi-unuttum" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Şifremi unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 gap-2 mt-2 font-semibold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                <><LogIn className="h-4 w-4" /> Giriş Yap</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link to="/kayit" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Kayıt Ol
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
