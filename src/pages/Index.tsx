import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <HeroSection />
      </div>
      
      {/* Footer */}
      <footer className="relative border-t border-border/30 bg-card/60 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <img src="/images/logo.png" alt="Refik Keşif ve İnşa" className="h-8 w-8 object-contain opacity-70" />
            <p className="text-xs text-muted-foreground/70">
              © 2026 Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;