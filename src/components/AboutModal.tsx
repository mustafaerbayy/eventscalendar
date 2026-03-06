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
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "auto";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const containerVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 200, damping: 25 } as any,
    },
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="about-modal-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Advanced Dynamic Background */}
          <div className="absolute inset-0 bg-[#030303]/80 backdrop-blur-3xl" onClick={onClose}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Islamic Motif Global Pattern */}
              <div className="absolute inset-0 bg-islamic-pattern opacity-40" />

              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                  rotate: [0, 90, 0],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-primary/20 rounded-full blur-[120px]"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, -45, 0],
                  opacity: [0.15, 0.3, 0.15],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-[10%] -right-[5%] w-[50vw] h-[50vw] bg-accent/20 rounded-full blur-[100px]"
              />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>
          </div>

          <motion.div
            className="relative w-full max-w-7xl max-h-[92vh] flex flex-col rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-black/40 shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl ring-1 ring-white/5"
            initial={{ scale: 0.92, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Islamic Pattern Overlay inside Modal */}
            <div className="absolute inset-0 bg-islamic-pattern opacity-10 pointer-events-none" />
            {/* Elegant Header */}
            <div className="flex items-center justify-between px-6 md:px-10 py-6 md:py-8 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-colors duration-500 rounded-full" />
                  <div className="relative p-3 md:p-4 bg-black/50 rounded-xl md:rounded-2xl ring-1 ring-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-110">
                    <Sparkles className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl md:text-4xl font-display font-black tracking-tight text-white mb-0.5 md:mb-1">
                    Refik Keşif ve İnşâ
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Biz Kimiz?</p>
                  </div>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="group relative p-2.5 md:p-4 bg-white/[0.03] hover:bg-white/[0.08] rounded-full text-white/40 hover:text-white transition-all ring-1 ring-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-5 w-5 md:h-6 md:w-6 transition-transform duration-500 group-hover:rotate-180" />
              </motion.button>
            </div>

            {/* Content Body - Refined Bento Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Main Identity Card */}
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-12 xl:col-span-8 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5 md:p-10 xl:p-14 relative overflow-hidden group shadow-2xl"
                >
                  <div className="relative z-10 flex flex-col">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] text-white/70 border border-white/10 mb-6 md:mb-10 font-bold text-[10px] md:text-xs uppercase tracking-widest backdrop-blur-md">
                      <Users className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                      <span>Değer Odaklı Gelişim</span>
                    </div>

                    <h3 className="text-2xl md:text-5xl xl:text-6xl font-display font-bold leading-[1.2] md:leading-[1.1] mb-8 md:mb-12 text-white max-w-3xl">
                      Gelişim;<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent animate-gradient-x">
                        Sadece Beceri Değil, <br className="hidden md:block" />Karakter Kazanmaktır.
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                      <div className="space-y-4 md:space-y-6">
                        <p className="text-base md:text-lg xl:text-xl text-white/60 leading-relaxed font-medium">
                          {mainAboutText.split('\n\n')[0]}
                        </p>
                        <p className="text-white/40 text-sm md:text-base leading-relaxed">
                          {mainAboutText.split('\n\n').slice(1).join('\n\n')}
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                        <div className="relative p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-black/40 border border-white/5 backdrop-blur-2xl shadow-inner">
                          <p className="whitespace-pre-line text-white/80 text-sm md:text-base leading-relaxed font-medium italic">
                            "{secondaryAboutText}"
                          </p>
                          <div className="mt-6 md:mt-8 flex items-center gap-3 md:gap-4">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Info Cards Column */}
                <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-4 md:gap-8">
                  {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        key={card.id}
                        variants={itemVariants}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className={`group relative rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6 md:p-8 xl:p-10 overflow-hidden transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]`}
                      >
                        {/* Interactive Glow Effect */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${card.color} blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-700`} />

                        <div className="relative z-10 flex flex-col">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.25rem] flex items-center justify-center mb-6 md:mb-8 shadow-2xl ${card.iconBg} ring-1 ring-white/10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                            <Icon className={`w-6 h-6 md:w-8 md:h-8 ${card.textColor}`} />
                          </div>

                          <h4 className="text-xl md:text-3xl font-display font-bold mb-4 md:mb-6 text-white group-hover:text-primary transition-colors duration-300">
                            {card.title}
                          </h4>

                          <p className="text-white/50 group-hover:text-white/70 leading-relaxed font-medium text-sm md:text-base xl:text-lg transition-colors duration-300">
                            {card.description}
                          </p>

                          <div className="mt-8 md:mt-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="h-1 w-6 md:w-8 bg-primary rounded-full" />
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary">Detayları Gör</span>
                          </div>
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
