import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
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
      const { data: emailCheckDatas } = await (supabase.rpc as any)('check_email_identity', { p_email: email.trim().toLowerCase() });
      const emailData = emailCheckDatas?.[0];

      if (emailData && emailData.exists && emailData.has_google_identity && !emailData.has_password_identity) {
        setLoading(false);
        toast.error("Bu hesap Google ile kayıtlıdır ve şifreye gerek kalmadan Google ile giriş yapabilirsiniz. Lütfen 'Google ile Giriş Yap' butonuna dönün.", {
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
          {sent ? (
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
                <h1 className="font-display text-2xl font-bold text-foreground">E-posta Gönderildi</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Eğer <strong className="text-foreground">{email}</strong> adresiyle bir hesap varsa,
                  şifre sıfırlama bağlantısı gönderildi. Lütfen gelen kutunuzu kontrol edin.
                </p>
              </div>
              <Button variant="outline" className="w-full h-11 gap-2" onClick={() => navigate("/giris")}>
                <ArrowLeft className="h-4 w-4" /> Giriş sayfasına dön
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold text-foreground">Şifremi Unuttum</h1>
                <p className="mt-1 text-sm text-muted-foreground">şifrenizi sıfırlamak için e-posta adresinizi girin</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input id="email" type="email" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary/60 transition-colors" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                      Gönderiliyor...
                    </span>
                  ) : "Sıfırlama Bağlantısı Gönder"}
                </Button>
              </form>
              <div className="mt-5 text-center">
                <Link to="/giris" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
