import { motion, AnimatePresence } from "framer-motion";
import { Eye, Target, Users, X, Heart, Sparkles, Compass } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const mainAboutText = `İnsanı yalnızca bilgiyle değil; değerle, bilinçle ve sorumlulukla ele alıyoruz.

Bu program, bireyin kendini tanıma sürecini ciddiye alır. Her insanın içinde bir istidat, bir yön ve bir anlam arayışı olduğuna inanırız. Amacımız; katılımcıların kendi kabiliyetlerini fark etmelerine, hayatlarını rastlantılarla değil bilinçli tercihlerle şekillendirmelerine zemin hazırlamaktır.

Bizim için gelişim; sadece beceri kazanmak değildir.
Karakter kazanmaktır. Yük taşımayı öğrenmektir. Doğru yerde durabilmektir.

Hakikati eğip bükmeden konuşabilen, gücü ilkelere tabi kılan, sorumluluğu yük değil onur bilen, zor zamanlarda istikametini kaybetmeyen insanlar yetiştirmeyi hedefliyoruz.`;

const secondaryAboutText = `Bu program;
• Tarihî ve medeniyet birikimini tanıyan,
• Duygularını yönetebilen,
• Eleştirel düşünebilen,
• Disiplinli ve üretken,
• Değerleriyle uyumlu yaşayan bireylerin oluşumuna katkı sunar.

Biz; popüler söylemlerin değil, köklü ilkelerin yanındayız.
Kısa vadeli motivasyon değil, uzun vadeli inşa peşindeyiz.

Çünkü inanıyoruz ki güçlü toplumlar; güçlü karakterlerden doğar. Ve karakter, bilinçli bir eğitim ve istikrarlı bir emekle şekillenir.`;

const cards = [
  {
    id: "vizyon",
    icon: Eye,
    title: "Vizyon",
    description: "Programın temel değerleri olan hak, adalet, emanete sadakat, merhamet, ihsan ve azim doğrultusunda; aklî selim, kalbî selim ve zevk-i selim sahibi bireylerin yetişmesine katkı sunan, kendi potansiyelini keşfetmiş, değer merkezli düşünen, adalet ve sorumluluk bilinciyle hareket eden, toplumuna ve insanlığa fayda üreten öncü ve model şahsiyetlerin oluşumuna rehberlik eden bir eğitim ve gelişim platformu olmak.",
    color: "from-blue-500/20 to-cyan-500/20",
    textColor: "text-blue-500",
    borderColor: "group-hover:border-blue-500/50",
    shadowColor: "group-hover:shadow-blue-500/20",
    iconBg: "bg-blue-500/10"
  },
  {
    id: "misyon",
    icon: Target,
    title: "Misyon",
    description: "Katılımcıların zihinsel altyapılarını hakikat, doğru bilgi ve değerler ekseninde güçlendirmek, kendi varoluş amaçlarını keşfetmelerine rehberlik etmek, tarihî ve medeniyet birikimini tanıyarak içselleştirmelerine imkân sağlamak, güvenli duruş, çalışma disiplini, duygusal zekâ ve biz ruhu gibi temel becerileri geliştirmelerine destek olmak, hayatı bir emanet bilinciyle ele alan, adaletli, merhametli ve sorumluluk sahibi bireyler olarak yetişmelerini sağlamak amacıyla değer temelli, sistemli ve bütüncül bir gelişim süreci sunmak.",
    color: "from-orange-500/20 to-amber-500/20",
    textColor: "text-orange-500",
    borderColor: "group-hover:border-orange-500/50",
    shadowColor: "group-hover:shadow-orange-500/20",
    iconBg: "bg-orange-500/10"
  },
  {
    id: "degerlerimiz",
    icon: Heart,
    title: "Değerlerimiz",
    description: "Hak, Eminlik, Emanet, Adalet, Merhamet, Sabır, İhsan, Azim, Tevazu, İzzet, Sevgi, Özveri, Paylaşım",
    color: "from-purple-500/20 to-pink-500/20",
    textColor: "text-purple-500",
    borderColor: "group-hover:border-purple-500/50",
    shadowColor: "group-hover:shadow-purple-500/20",
    iconBg: "bg-purple-500/10"
  },
];

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const AboutModal = ({ open, onClose }: AboutModalProps) => {
  useEffect(() => {
    if (open) {
      const originalOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 350, damping: 25 }
    }
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="about-modal-backdrop"
          className="fixed inset-0 z-[100] grid place-items-center p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Enhanced Backdrop with Animated Mesh Gradient */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" onClick={onClose}>
            <div className="absolute inset-0 opacity-30">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  x: [0, 50, 0],
                  y: [0, -50, 0],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 15, repeat: Infinity, repeatType: "mirror" }}
                className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-primary/30 rounded-full blur-[100px] mix-blend-screen"
              />
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  x: [0, -60, 0],
                  y: [0, 80, 0],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
                className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-accent/30 rounded-full blur-[100px] mix-blend-screen"
              />
            </div>
          </div>

          <motion.div
            className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-[2rem] border border-white/10 bg-card/40 shadow-2xl overflow-hidden backdrop-blur-2xl ring-1 ring-white/5"
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl ring-1 ring-primary/30 shadow-inner">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-black bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                    Refik Keşif ve İnşâ
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">Biz Kimiz?</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-muted-foreground hover:text-foreground transition-all ring-1 ring-white/10"
                whileHover={{ scale: 1.05, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>

            {/* Content Body - Scrollable Bento Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >

                {/* Main Hero Card (Spans 8 cols on large screens) */}
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 md:p-10 relative overflow-hidden group hover:border-primary/30 transition-colors duration-500"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                    <Compass className="w-48 h-48 text-primary" />
                  </div>

                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-8 font-semibold text-sm">
                      <Users className="h-4 w-4" />
                      <span>Hakkımızda</span>
                    </div>

                    <h3 className="text-3xl md:text-5xl font-display font-bold leading-tight mb-8 text-foreground group-hover:text-primary transition-colors duration-500">
                      Gelişim;<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Sadece Beceri Değil, <br className="hidden md:block" />Karakter Kazanmaktır.</span>
                    </h3>

                    <div className="space-y-6 text-base md:text-lg text-foreground/80 leading-relaxed font-medium">
                      <p className="whitespace-pre-line">{mainAboutText}</p>

                      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <p className="whitespace-pre-line text-foreground/90">{secondaryAboutText}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Side Cards (Spans 4 cols on large screens, stacked vertically) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        key={card.id}
                        variants={itemVariants}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={`flex-1 rounded-[2rem] border border-white/10 bg-gradient-to-br ${card.color} p-6 md:p-8 relative overflow-hidden group transition-all duration-300 ${card.borderColor} ${card.shadowColor} hover:shadow-2xl backdrop-blur-sm`}
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                        <div className="relative z-10 flex flex-col h-full">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${card.iconBg} ring-1 ring-white/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                            <Icon className={`w-7 h-7 ${card.textColor}`} />
                          </div>

                          <h4 className={`text-2xl font-display font-bold mb-4 ${card.textColor}`}>
                            {card.title}
                          </h4>

                          <p className="text-foreground/80 leading-relaxed font-medium text-sm md:text-base mt-auto">
                            {card.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AboutModal;
