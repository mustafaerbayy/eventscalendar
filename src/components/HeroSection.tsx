import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, CalendarDays, MapPin, Navigation, FileText } from "lucide-react";

interface HeroSectionProps {
  onViewEvents?: () => void;
}

const HeroSection = ({ onViewEvents }: HeroSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden min-h-[100vh] flex items-center justify-center bg-black">

      {/* Static Background — Replaces 6 animated orbs with performant static gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black" />
        {/* Core Glow — static */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw] max-w-[1000px] max-h-[1000px] bg-gradient-to-tr from-emerald-600/30 via-primary/30 to-amber-500/30 rounded-full blur-[60px] md:blur-[80px] mix-blend-screen transform-gpu" />

        {/* Static orbs (previously animated with infinite x/y/scale transitions) */}
        <div className="hidden md:block absolute top-[15%] left-[15%] w-[40vw] h-[40vw] bg-emerald-500/25 rounded-full blur-[80px] mix-blend-screen transform-gpu" />
        <div className="hidden md:block absolute bottom-[15%] right-[15%] w-[45vw] h-[45vw] bg-amber-500/15 rounded-full blur-[80px] mix-blend-screen transform-gpu" />
        <div className="hidden md:block absolute top-[35%] left-[55%] w-[30vw] h-[30vw] bg-blue-500/15 rounded-full blur-[60px] mix-blend-screen transform-gpu" />

        {/* Grain Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.04] z-20 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Floating glassmorphism elements (desktop only, CSS animation instead of framer-motion) */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Left Floating Card — CSS animation instead of framer-motion */}
        <div
          className="absolute left-[10%] top-[30%] w-64 h-80 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 hidden lg:flex flex-col gap-4 transform-gpu animate-float"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-transparent flex items-center justify-center mb-4">
            <CalendarDays className="text-emerald-400 w-6 h-6" />
          </div>
          <div className="h-4 w-3/4 bg-white/10 rounded-full" />
          <div className="h-4 w-1/2 bg-white/10 rounded-full" />
          <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-tr from-white/20 to-white/5 backdrop-blur-sm" />
              ))}
            </div>
            <span className="text-emerald-400/80 text-xs font-bold">+24 Kayıt</span>
          </div>
        </div>

        {/* Right Floating Card — CSS animation instead of framer-motion */}
        <div
          className="absolute right-[12%] bottom-[25%] w-72 h-64 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 hidden lg:flex flex-col gap-4 transform-gpu animate-float"
          style={{ animationDelay: "2s", animationDirection: "reverse" }}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400/20 to-transparent flex items-center justify-center">
              <MapPin className="text-amber-400 w-6 h-6" />
            </div>
            <div>
              <div className="h-3 w-20 bg-white/20 rounded-full mb-2" />
              <div className="h-3 w-12 bg-white/10 rounded-full" />
            </div>
          </div>
          <div className="h-24 w-full rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 flex items-center justify-center mt-auto">
            <Navigation className="text-white/20 w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Hero Content — simple entry animations only (no parallax) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="container relative z-20 mx-auto px-4 text-center pt-32 md:pt-0 pb-20"
      >
        <div className="flex flex-col items-center">
          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl mb-16 group cursor-pointer hover:bg-white/10 transition-all hover:scale-105"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200 uppercase">
              Kültür · Sanat · Keşif
            </span>
          </motion.div>

          {/* Action Buttons Container */}
          <div className="flex flex-col gap-6 items-center">
            {/* Explore Events Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative p-[2px] rounded-full overflow-hidden group/btn bg-gradient-to-r from-amber-600/50 via-amber-400/30 to-amber-600/50 hover:scale-105 active:scale-95 transition-transform">
                <Button
                  onClick={() => {
                    if (onViewEvents) onViewEvents();
                    else {
                      document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="relative z-10 h-14 px-10 rounded-full bg-black/80 backdrop-blur-lg border-none text-amber-500/90 font-black text-xs tracking-[0.2em] overflow-hidden group hover:text-amber-400 transition-all duration-500 w-64"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3 w-full">
                    ETKİNLİKLERİ KEŞFET
                    <Navigation className="w-4 h-4 fill-current group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </span>
                </Button>
              </div>
            </motion.div>

            {/* Review Reports Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="relative p-[2px] rounded-full overflow-hidden group/btn bg-gradient-to-r from-emerald-600/50 via-emerald-400/30 to-emerald-600/50 hover:scale-105 active:scale-95 transition-transform">
                <Button
                  onClick={() => navigate('/raporlar')}
                  className="relative z-10 h-14 px-10 rounded-full bg-black/80 backdrop-blur-lg border-none text-emerald-500/90 font-black text-xs tracking-[0.2em] overflow-hidden group hover:text-emerald-400 transition-all duration-500 w-64"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3 w-full">
                    RAPORLARI İNCELE
                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </span>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
        <div className="absolute -bottom-20 -left-20 w-full h-full bg-emerald-500/5 blur-[80px] opacity-40" />
        <div className="absolute -bottom-20 -right-20 w-full h-full bg-amber-500/5 blur-[80px] opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background/40 to-transparent" />
      </div>
    </section>
  );
};

export default HeroSection;