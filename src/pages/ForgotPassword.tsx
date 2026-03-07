import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Lütfen e-posta adresinizi girin."); return; }
    setLoading(true);
    try {
      // Identity check
      const response = await (supabase.rpc as any)('check_email_identity', { p_email: email.trim().toLowerCase() });
      const emailData = response?.data?.[0];

      if (emailData && emailData.exists && emailData.has_google_identity) {
        setLoading(false);
        toast.error("Bu hesap Google'a bağlı olduğu için şifre buradan değiştirilemez. Lütfen Google ile giriş yapmaya devam edin.", {
          duration: 6000,
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email: email.trim(), redirectUrl: `${window.location.origin}/sifre-sifirla` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSent(true);
    } catch (err: any) {
      // Don't reveal whether email exists for generic errors, but we already handled the Google case
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Innovative Animated Background - Matching Login */}
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

            {sent ? (
              <motion.div
                className="text-center space-y-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
                    <CheckCircle2 className="h-12 w-12 text-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]" />
                  </div>
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold text-white mb-3">E-posta Gönderildi</h1>
                  <p className="text-slate-400 font-medium">
                    Eğer <strong className="text-white">{email}</strong> adresiyle bir hesap varsa,
                    şifre sıfırlama bağlantısı gönderildi. Lütfen gelen kutunuzu kontrol edin.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all flex gap-3"
                  onClick={() => navigate("/giris")}
                >
                  <ArrowLeft className="h-5 w-5" /> Giriş sayfasına dön
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white mb-2">
                    Şifremi Unuttum
                  </h1>
                  <p className="text-slate-400 font-medium">Şifrenizi sıfırlama bağlantısını almak için e-posta adresinizi girin</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">E-posta</Label>
                    <div className="relative group/input">
                      <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within/input:text-primary transition-colors pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="isim@ornek.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 focus:border-primary/50 text-white placeholder:text-slate-600 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-3">
                        <span className="h-5 w-5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                        Gönderiliyor...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Şifre Sıfırlama Bağlantısı Gönder <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-10 text-center">
                  <Link to="/giris" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold transition-colors group">
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Giriş sayfasına dön
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
