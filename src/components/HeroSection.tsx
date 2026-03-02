import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface HeroSectionProps {
  onViewEvents?: () => void;
}

const HeroSection = ({ onViewEvents }: HeroSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden min-h-[520px] flex items-center justify-center">
      {/* Night Ramazan Background with Hanging Lanterns */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-teal-900/20 to-black">
        {/* Dark base */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Bokeh Light Circles */}
      <motion.div className="absolute inset-0 pointer-events-none">
        {/* Warm gold bokeh lights */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={`bokeh-warm-${i}`}
            className="absolute rounded-full blur-2xl"
            style={{
              width: `${80 + i * 30}px`,
              height: `${80 + i * 30}px`,
              left: `${-10 + i * 20}%`,
              top: `${10 + i * 12}%`,
              background: "radial-gradient(circle, hsl(38 100% 60% / 0.5), hsl(38 100% 45% / 0.15))"
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [0.9, 1.2, 0.9]
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3
            }}
          />
        ))}

        {/* Emerald bokeh lights */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`bokeh-emerald-${i}`}
            className="absolute rounded-full blur-3xl"
            style={{
              width: `${100 + i * 40}px`,
              height: `${100 + i * 40}px`,
              right: `${5 + i * 15}%`,
              top: `${20 + i * 15}%`,
              background: "radial-gradient(circle, hsl(155 70% 50% / 0.45), hsl(155 70% 40% / 0.12))"
            }}
            animate={{
              opacity: [0.4, 0.8, 0.4],
              scale: [0.8, 1.1, 0.8]
            }}
            transition={{
              duration: 5 + i * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4
            }}
          />
        ))}

        {/* Blue bokeh lights */}
        {[0, 1].map((i) => (
          <motion.div
            key={`bokeh-blue-${i}`}
            className="absolute rounded-full blur-2xl"
            style={{
              width: `${90 + i * 35}px`,
              height: `${90 + i * 35}px`,
              left: `${50 + i * 25}%`,
              top: `${5 + i * 20}%`,
              background: "radial-gradient(circle, hsl(210 100% 60% / 0.4), hsl(210 100% 50% / 0.1))"
            }}
            animate={{
              opacity: [0.25, 0.6, 0.25],
              scale: [0.9, 1.15, 0.9]
            }}
            transition={{
              duration: 6 + i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          />
        ))}

        {/* Amber-gold bokeh lights */}
        {[0, 1].map((i) => (
          <motion.div
            key={`bokeh-amber-${i}`}
            className="absolute rounded-full blur-2xl"
            style={{
              width: `${70 + i * 25}px`,
              height: `${70 + i * 25}px`,
              left: `${20 + i * 60}%`,
              top: `${40 + i * 25}%`,
              background: "radial-gradient(circle, hsl(45 95% 58% / 0.35), hsl(45 95% 48% / 0.1))"
            }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.85, 1.1, 0.85]
            }}
            transition={{
              duration: 5.5 + i * 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.6
            }}
          />
        ))}

        {/* White bokeh lights */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`bokeh-white-${i}`}
            className="absolute rounded-full blur-3xl"
            style={{
              width: `${60 + i * 20}px`,
              height: `${60 + i * 20}px`,
              left: `${30 + i * 20}%`,
              top: `${55 + i * 18}%`,
              background: "radial-gradient(circle, hsl(0 0% 100% / 0.3), hsl(0 0% 90% / 0.1))"
            }}
            animate={{
              opacity: [0.15, 0.4, 0.15],
              scale: [0.9, 1.2, 0.9]
            }}
            transition={{
              duration: 4.5 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4
            }}
          />
        ))}
      </motion.div>

      {/* Aurora Borealis - Flowing Light Curtain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary aurora wave - gold */}
        <motion.div
          className="absolute -top-1/4 left-0 right-0 h-[70%]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, hsl(42 80% 50% / 0.14) 30%, hsl(42 80% 45% / 0.07) 60%, transparent 100%)",
            filter: "blur(40px)",
          }}
          animate={{
            x: ["-5%", "5%", "-3%", "7%", "-5%"],
            scaleX: [1, 1.05, 0.97, 1.03, 1],
            skewX: [0, 2, -1, 3, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Secondary aurora wave - gold */}
        <motion.div
          className="absolute -top-1/4 left-[10%] right-[5%] h-[65%]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, hsl(42 85% 55% / 0.1) 25%, hsl(42 85% 50% / 0.05) 55%, transparent 100%)",
            filter: "blur(50px)",
          }}
          animate={{
            x: ["3%", "-4%", "6%", "-2%", "3%"],
            scaleX: [1, 0.96, 1.04, 0.98, 1],
            skewX: [0, -2, 1.5, -3, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Tertiary aurora ribbon - bright gold accent */}
        <motion.div
          className="absolute top-[5%] h-[50%]"
          style={{
            left: "15%",
            right: "20%",
            background: "linear-gradient(180deg, transparent 0%, hsl(45 85% 55% / 0.14) 20%, hsl(45 85% 50% / 0.07) 50%, transparent 100%)",
            filter: "blur(35px)",
          }}
          animate={{
            x: ["-8%", "4%", "-3%", "8%", "-8%"],
            scaleY: [1, 1.15, 0.9, 1.1, 1],
            skewX: [1, -3, 2, -1, 1],
            opacity: [0.7, 1, 0.6, 0.9, 0.7],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Thin bright aurora streak - gold */}
        <motion.div
          className="absolute top-[8%] h-[40%]"
          style={{
            left: "30%",
            right: "25%",
            background: "linear-gradient(180deg, transparent 0%, hsl(45 90% 60% / 0.12) 15%, hsl(45 90% 55% / 0.06) 40%, transparent 100%)",
            filter: "blur(25px)",
          }}
          animate={{
            x: ["5%", "-6%", "3%", "-4%", "5%"],
            scaleX: [1, 1.08, 0.94, 1.06, 1],
            opacity: [0.5, 0.9, 0.4, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Vertical aurora shimmer columns */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={`aurora-col-${i}`}
            className="absolute top-0"
            style={{
              left: `${8 + i * 13}%`,
              width: `${40 + (i % 3) * 15}px`,
              height: "75%",
              background: `linear-gradient(180deg, transparent 0%, ${
                i % 3 === 0 
                  ? "hsl(155 60% 45% / 0.07)" 
                  : "hsl(42 85% 55% / 0.09)"
              } ${20 + i * 5}%, transparent 100%)`,
              filter: "blur(20px)",
            }}
            animate={{
              scaleY: [0.8, 1.2, 0.85, 1.15, 0.8],
              opacity: [0.3, 0.7, 0.2, 0.6, 0.3],
              x: [0, (i % 2 === 0 ? 15 : -15), 0],
            }}
            transition={{
              duration: 6 + i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.7,
            }}
          />
        ))}

        {/* Bright aurora hotspot - pulsing glow at center top */}
        <motion.div
          className="absolute top-[2%] left-1/2 -translate-x-1/2"
          style={{
            width: "400px",
            height: "200px",
            background: "radial-gradient(ellipse, hsl(42 85% 55% / 0.15) 0%, hsl(155 60% 45% / 0.06) 40%, transparent 70%)",
            filter: "blur(30px)",
          }}
          animate={{
            scale: [1, 1.2, 0.95, 1.15, 1],
            opacity: [0.4, 0.7, 0.3, 0.6, 0.4],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      <div className="container relative z-10 mx-auto px-4 py-24 text-center md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}>

          <motion.div 
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-black/20 backdrop-blur-md px-4 py-1.5 mb-6 shadow-lg shadow-amber-500/20"
            whileHover={{ scale: 1.05, borderColor: "hsl(42 90% 60% / 1)" }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </motion.div>
            <span className="text-xs font-medium tracking-widest text-amber-200/90 uppercase">Kültür · Sanat · Keşif</span>
          </motion.div>
        </motion.div>

        <div className="overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="flex justify-center">
              <motion.span
                className="font-display text-5xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-emerald-300 bg-clip-text drop-shadow-2xl text-center"
                style={{
                  textShadow: `
                    0 0 10px rgba(218, 165, 32, 0.2),
                    0 0 20px rgba(218, 165, 32, 0.12),
                    0 0 30px rgba(16, 185, 129, 0.06)
                  `
                }}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.2, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.03 }}
              >
                Refik Keşif ve İnşa
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Abone ol özelliği geçici olarak gizlendi */}
        {/* <motion.p
          className="mx-auto mt-6 max-w-xl text-lg text-amber-100/80 leading-relaxed md:text-sm drop-shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}>
          Etkinlik hatırlatıcıları için aşağıdaki butona tıklayarak abone olabilirsiniz
        </motion.p>

        <motion.div
          className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-emerald-500 text-white font-bold hover:shadow-2xl hover:shadow-amber-500/40 px-8 py-6 text-base shadow-xl rounded-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              onClick={() => navigate("/kayit")}>
              <span className="relative z-10">Abone Ol</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-amber-400/50 bg-black/20 text-amber-100 hover:bg-emerald-900/30 px-8 py-6 text-base backdrop-blur-md rounded-xl transition-all duration-300 hover:-translate-y-1 font-semibold hover:border-amber-300/80"
              onClick={() => {
                document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' });
              }}>
              Etkinlikleri Keşfet
            </Button>
          </motion.div>
        </motion.div> */}

        <motion.div
          className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-amber-400/50 bg-black/20 text-amber-100 hover:bg-emerald-900/30 px-8 py-6 text-base backdrop-blur-md rounded-xl transition-all duration-300 hover:-translate-y-1 font-semibold hover:border-amber-300/80"
              onClick={() => {
                if (onViewEvents) onViewEvents();
                else document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' });
              }}>
              Etkinlikleri Gör
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom wave divider with enhanced animation */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="hsl(var(--background))" />
        </svg>
      </motion.div>
    </section>
  );
};

export default HeroSection;