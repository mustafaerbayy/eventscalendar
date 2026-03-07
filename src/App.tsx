import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";

// Supabase recovery token root'a düşerse /sifre-sifirla'ya yönlendir
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash.replace("#", "?"));

    // Recovery Link
    if (hash && hash.includes("type=recovery") && hash.includes("access_token")) {
      navigate("/sifre-sifirla" + hash, { replace: true });
      return;
    }

    // Success email verification
    const type = searchParams.get("type") || hashParams.get("type");
    if (type === "signup" && hash.includes("access_token")) {
      toast.success("E-posta adresiniz başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.", { duration: 6000 });
      // We don't navigate right away so that Supabase client has time to establish the session
      return;
    }

    // Auth Errors (e.g. from expired/used email confirmation links due to email scanners)
    const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");
    if (errorDesc) {
      const decodedError = decodeURIComponent(errorDesc).replace(/\+/g, " ");
      if (decodedError.includes("Email link is invalid or has expired")) {
        toast.error("Doğrulama bağlantınız geçersiz veya daha önce kullanılmış. (E-posta güvenlik tarayıcıları bağlantıyı otomatik tüketmiş olabilir). Lütfen tekrar kayıt olarak yeni bir onay maili isteyin.", { duration: 10000 });
      } else {
        toast.error(`Kimlik doğrulama hatası: ${decodedError}`, { duration: 8000 });
      }
      setTimeout(() => navigate("/giris", { replace: true }), 100);
      return;
    }
  }, [navigate]);
  return null;
};
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EventDetail from "./pages/EventDetail";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import WeeklyReports from "./pages/WeeklyReports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AuthRedirectHandler />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/giris" element={<Login />} />
            <Route path="/kayit" element={<Register />} />
            <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
            <Route path="/sifre-sifirla" element={<ResetPassword />} />
            <Route path="/etkinlik/:id" element={<EventDetail />} />
            <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/yonetim" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="/raporlar" element={<ProtectedRoute><WeeklyReports /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
