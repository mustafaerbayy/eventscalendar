import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";

// Supabase recovery token root'a düşerse /sifre-sifirla'ya yönlendir
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery") && hash.includes("access_token")) {
      navigate("/sifre-sifirla" + hash, { replace: true });
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
