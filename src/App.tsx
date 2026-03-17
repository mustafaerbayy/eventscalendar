import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { Suspense, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { NotificationPermission } from "@/components/NotificationPermission";

const NotificationManager = () => {
  useRealtimeNotifications();
  return null;
};

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

// Lazy-loaded pages (code splitting)
const Index = React.lazy(() => import("./pages/Index"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const EventDetail = React.lazy(() => import("./pages/EventDetail"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Admin = React.lazy(() => import("./pages/Admin"));
const WeeklyReports = React.lazy(() => import("./pages/WeeklyReports"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Social = React.lazy(() => import("./pages/Social"));
const SocialProfileView = React.lazy(() => import("./pages/SocialProfileView"));

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
          <NotificationManager />
          <NotificationPermission />
          <AuthRedirectHandler />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/giris" element={<Login />} />
              <Route path="/kayit" element={<Register />} />
              <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
              <Route path="/sifre-sifirla" element={<ResetPassword />} />
              <Route path="/etkinlik/:id" element={<EventDetail />} />
              <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/sosyal" element={<Social />} />
              <Route path="/sosyal/profil/:id" element={<ProtectedRoute><SocialProfileView /></ProtectedRoute>} />
              <Route path="/yonetim" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              <Route path="/raporlar" element={<ProtectedRoute><WeeklyReports /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
