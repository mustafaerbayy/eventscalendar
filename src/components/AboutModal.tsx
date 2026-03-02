import { motion, AnimatePresence } from "framer-motion";
import { Eye, Target, Users, X, Heart } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const cards = [
  {
    icon: Users,
    title: "Hakkımızda",
    description:
      "İnsanı yalnızca bilgiyle değil; değerle, bilinçle ve sorumlulukla ele alıyoruz.\n\nBu program, bireyin kendini tanıma sürecini ciddiye alır. Her insanın içinde bir istidat, bir yön ve bir anlam arayışı olduğuna inanırız. Amacımız; katılımcıların kendi kabiliyetlerini fark etmelerine, hayatlarını rastlantılarla değil bilinçli tercihlerle şekillendirmelerine zemin hazırlamaktır.\n\nBizim için gelişim; sadece beceri kazanmak değildir.\nKarakter kazanmaktır.\nYük taşımayı öğrenmektir.\nDoğru yerde durabilmektir.\n\nHakikati eğip bükmeden konuşabilen,\nGücü ilkelere tabi kılan,\nSorumluluğu yük değil onur bilen,\nZor zamanlarda istikametini kaybetmeyen insanlar yetiştirmeyi hedefliyoruz.\n\nBu program;\n• Tarihî ve medeniyet birikimini tanıyan,\n• Duygularını yönetebilen,\n• Eleştirel düşünebilen,\n• Disiplinli ve üretken,\n• Değerleriyle uyumlu yaşayan bireylerin oluşumuna katkı sunar.\n\nBiz; popüler söylemlerin değil, köklü ilkelerin yanındayız.\nKısa vadeli motivasyon değil, uzun vadeli inşa peşindeyiz.\n\nÇünkü inanıyoruz ki güçlü toplumlar; güçlü karakterlerden doğar.\nVe karakter, bilinçli bir eğitim ve istikrarlı bir emekle şekillenir.",
  },
  {
    icon: Eye,
    title: "Vizyon",
    description:
      "Programın temel değerleri olan hak, adalet, emanete sadakat, merhamet, ihsan ve azim doğrultusunda; aklî selim, kalbî selim ve zevk-i selim sahibi bireylerin yetişmesine katkı sunan, kendi potansiyelini keşfetmiş, değer merkezli düşünen, adalet ve sorumluluk bilinciyle hareket eden, toplumuna ve insanlığa fayda üreten öncü ve model şahsiyetlerin oluşumuna rehberlik eden bir eğitim ve gelişim platformu olmak.",
  },
  {
    icon: Target,
    title: "Misyon",
    description:
      "Katılımcıların zihinsel altyapılarını hakikat, doğru bilgi ve değerler ekseninde güçlendirmek, kendi varoluş amaçlarını keşfetmelerine rehberlik etmek, tarihî ve medeniyet birikimini tanıyarak içselleştirmelerine imkân sağlamak, güvenli duruş, çalışma disiplini, duygusal zekâ ve biz ruhu gibi temel becerileri geliştirmelerine destek olmak, hayatı bir emanet bilinciyle ele alan, adaletli, merhametli ve sorumluluk sahibi bireyler olarak yetişmelerini sağlamak amacıyla değer temelli, sistemli ve bütüncül bir gelişim süreci sunmak.",
  },
  {
    icon: Heart,
    title: "Değerlerimiz",
    description:
      "Hak, Eminlik, Emanet, Adalet, Merhamet, Sabır, İhsan, Azim, Tevazu, İzzet, Sevgi, Özveri, Paylaşım",
  },
];

// Color scheme for each card matching homepage colors
const cardColors = [
  { 
    bgColor: "rgba(249, 115, 22, 0.2)", 
    borderColor: "rgba(249, 115, 22, 0.4)", 
    textColor: "rgb(249, 115, 22)",
    hoverBgColor: "rgba(249, 115, 22, 0.3)",
    shadowColor: "rgba(249, 115, 22, 0.3)"
  },
  { 
    bgColor: "rgba(59, 130, 246, 0.2)", 
    borderColor: "rgba(59, 130, 246, 0.4)", 
    textColor: "rgb(59, 130, 246)",
    hoverBgColor: "rgba(59, 130, 246, 0.3)",
    shadowColor: "rgba(59, 130, 246, 0.3)"
  },
  { 
    bgColor: "rgba(234, 179, 8, 0.2)", 
    borderColor: "rgba(234, 179, 8, 0.4)", 
    textColor: "rgb(234, 179, 8)",
    hoverBgColor: "rgba(234, 179, 8, 0.3)",
    shadowColor: "rgba(234, 179, 8, 0.3)"
  },
  { 
    bgColor: "rgba(168, 85, 247, 0.2)", 
    borderColor: "rgba(168, 85, 247, 0.4)", 
    textColor: "rgb(168, 85, 247)",
    hoverBgColor: "rgba(168, 85, 247, 0.3)",
    shadowColor: "rgba(168, 85, 247, 0.3)"
  },
];

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const AboutModal = ({ open, onClose }: AboutModalProps) => {
  // Simple scroll lock: just hide overflow, no position changes
  useEffect(() => {
    if (open) {
      const originalOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="about-wrapper"
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/50 backdrop-blur-md"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            className="fixed inset-4 z-[9999] m-auto max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-border/50 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl p-6 md:p-10 shadow-2xl shadow-primary/20"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ duration: 0.25, type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-5 w-5" />
            </motion.button>

            <motion.h2 
              className="font-display text-4xl font-bold text-foreground mb-10"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Bizi Tanıyın
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-1 mb-8">
              {cards.slice(0, 1).map((card, i) => (
                <motion.div
                  key={card.title}
                  className="group relative rounded-2xl border-2 border-border/40 bg-gradient-to-br from-background/80 to-background/40 p-6 transition-all hover:shadow-xl hover:border-primary/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.4, type: "spring" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                  <motion.div 
                    style={{
                      backgroundColor: cardColors[i].bgColor,
                      color: cardColors[i].textColor,
                    }}
                    whileHover={{ 
                      rotate: 10, 
                      scale: 1.1,
                      backgroundColor: cardColors[i].hoverBgColor,
                      boxShadow: `0 20px 25px -5px ${cardColors[i].shadowColor}`,
                    }}
                    className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all"
                  >
                    <card.icon className="h-6 w-6" />
                  </motion.div>
                  
                  <h3 className="relative font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed text-muted-foreground group-hover:text-muted-foreground/90 transition-colors whitespace-pre-line">
                    {card.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {cards.slice(1).map((card, i) => (
                <motion.div
                  key={card.title}
                  className="group relative rounded-2xl border-2 border-border/40 bg-gradient-to-br from-background/80 to-background/40 p-6 transition-all hover:shadow-xl hover:border-primary/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i + 1) * 0.15, duration: 0.4, type: "spring" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                  <motion.div 
                    style={{
                      backgroundColor: cardColors[i + 1].bgColor,
                      color: cardColors[i + 1].textColor,
                    }}
                    whileHover={{ 
                      rotate: 10, 
                      scale: 1.1,
                      backgroundColor: cardColors[i + 1].hoverBgColor,
                      boxShadow: `0 20px 25px -5px ${cardColors[i + 1].shadowColor}`,
                    }}
                    className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all"
                  >
                    <card.icon className="h-6 w-6" />
                  </motion.div>
                  
                  <h3 className="relative font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed text-muted-foreground group-hover:text-muted-foreground/90 transition-colors whitespace-pre-line">
                    {card.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AboutModal;
