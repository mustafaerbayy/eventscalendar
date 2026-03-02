import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-4 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-60"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-60"
            style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.15), transparent 70%)" }}
            animate={{ scale: [1.1, 1, 1.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          className="relative text-center max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        >
          <motion.div
            className="mb-6"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 150 }}
          >
            <Link to="/">
              <img src="/images/logo.png" alt="Logo" className="h-28 w-28 mx-auto drop-shadow-xl object-contain opacity-60" />
            </Link>
          </motion.div>

          <motion.h1
            className="text-8xl font-bold font-display bg-gradient-to-br from-primary via-primary/70 to-accent bg-clip-text text-transparent mb-4 leading-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            404
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-2xl font-semibold text-foreground mb-3">Sayfa Bulunamadı</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Aradığınız sayfa mevcut değil veya taşınmış olabilir.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="gap-2 shadow-lg shadow-primary/20 font-semibold px-8"
            >
              <Home className="h-4 w-4" />
              Ana Sayfaya Dön
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
