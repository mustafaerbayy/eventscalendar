import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Sparkles, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTurkishDate, formatTurkishTime, getDayName, formatDaysUntil, getDaysUntilEvent } from "@/lib/date-utils";
import { motion } from "framer-motion";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  cityName: string;
  venueName?: string;
  categoryName: string;
  attendeeCount: number;
  description?: string | null;
  index?: number;
  isPast?: boolean;
  viewMode?: "card" | "list";
  isAdmin?: boolean;
  onEdit?: (event: any) => void;
  onDelete?: (id: string) => void;
  onClick?: (eventId: string, e?: React.MouseEvent) => void;
  isAuthenticated?: boolean;
}

// Category color mapping - Modern vibrant theme
const categoryColors: Record<string, { gradient: string; bg: string; shadow: string }> = {
  "Konferans": {
    gradient: "from-emerald-500/75 via-amber-500/55 to-emerald-800/60",
    bg: "bg-emerald-500/15",
    shadow: "shadow-emerald-700/30"
  },
  "Seminer": {
    gradient: "from-amber-500/75 via-yellow-400/65 to-amber-800/55",
    bg: "bg-amber-500/15",
    shadow: "shadow-amber-700/30"
  },
  "Workshop": {
    gradient: "from-amber-500/75 via-teal-400/55 to-amber-700/60",
    bg: "bg-amber-500/15",
    shadow: "shadow-amber-700/30"
  },
  "Networking": {
    gradient: "from-yellow-500/75 via-amber-400/65 to-yellow-800/55",
    bg: "bg-yellow-500/15",
    shadow: "shadow-yellow-800/30"
  },
  "Panel": {
    gradient: "from-amber-600/75 via-emerald-400/55 to-amber-800/60",
    bg: "bg-amber-500/15",
    shadow: "shadow-amber-700/30"
  },
  "Eğitim": {
    gradient: "from-amber-400/75 via-emerald-400/60 to-amber-800/55",
    bg: "bg-amber-400/15",
    shadow: "shadow-amber-800/30"
  },
};

const getColorByCategory = (category: string) => {
  return categoryColors[category] || {
    gradient: "from-amber-500/75 via-emerald-400/55 to-amber-800/60",
    bg: "bg-amber-500/15",
    shadow: "shadow-amber-700/30"
  };
};

const EventCard = ({ id, title, date, time, cityName, venueName, categoryName, attendeeCount, description, index = 0, isPast = false, viewMode = "card", isAdmin = false, onEdit, onDelete, onClick, isAuthenticated = true }: EventCardProps) => {
  const navigate = useNavigate();
  const colors = getColorByCategory(categoryName);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(id, e);
    } else {
      if (!isAuthenticated) {
        navigate("/giris");
      } else {
        navigate(`/etkinlik/${id}`);
      }
    }
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
        className={`${isPast ? "opacity-60" : ""} cursor-pointer group`}
        onClick={handleCardClick}
      >
        <Card
          className="relative overflow-hidden border border-white/20 bg-white/10 backdrop-blur-3xl transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl rounded-2xl"
        >
          {/* Subtle Glow */}
          <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

          <CardContent className="py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isAuthenticated && (
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                    {categoryName}
                  </Badge>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${getDaysUntilEvent(date) <= 1 ? "text-amber-500" : "text-muted-foreground/60"
                    }`}>
                    {formatDaysUntil(date)}
                  </div>
                </div>
              )}
              <h3 className="font-display text-lg md:text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {title}
              </h3>
            </div>

            {isAuthenticated ? (
              <div className="flex flex-wrap items-center gap-4 lg:gap-8 shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary/60" />
                  <span className="font-medium">{formatTurkishDate(date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary/60" />
                  <span className="font-medium">{formatTurkishTime(time)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-[150px] lg:max-w-[200px]">
                  <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
                  <span className="font-medium truncate">{venueName || cityName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary/60" />
                  <span className="font-bold text-foreground">{attendeeCount}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 pl-4 border-l border-white/10" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-amber-500/20 text-amber-500" onClick={(e) => { e.stopPropagation(); onEdit?.({ id, title, date, time, categoryName, cityName, venueName }); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-red-500/20 text-red-500" onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-primary/60 italic">
                Detaylar için giriş yapın
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
      className={isPast ? "opacity-50" : ""}
    >
      <motion.div
        whileHover={{ y: -10, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card
          className="group cursor-pointer overflow-hidden border border-white/20 bg-white/10 backdrop-blur-3xl transition-all duration-500 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)] hover:border-white/30 relative rounded-[2.5rem] h-full"
          onClick={handleCardClick}
        >
          {/* Animated Background Orbs */}
          <div className={`absolute -top-24 -right-24 h-64 w-64 bg-gradient-to-br ${colors.gradient} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-all duration-700`} />
          <div className={`absolute -bottom-24 -left-24 h-64 w-64 bg-gradient-to-tr ${colors.gradient} rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-all duration-700 delay-100`} />

          <CardContent className="p-8 flex flex-col h-full relative z-10">
            {/* Header: Date + Status */}
            {isAuthenticated && (
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col items-center min-w-[60px] shadow-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">{formatTurkishDate(date).split(' ')[1]}</span>
                  <span className="text-2xl font-black text-foreground leading-none mt-1">{formatTurkishDate(date).split(' ')[0]}</span>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border-2 text-[10px] font-black uppercase tracking-widest shadow-lg ${getDaysUntilEvent(date) <= 1
                  ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                  : "bg-primary/20 text-primary border-primary/30"
                  }`}>
                  <Sparkles className="h-3 w-3" />
                  {formatDaysUntil(date)}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1">
              {isAuthenticated && (
                <Badge className="mb-4 bg-white/10 text-foreground border-white/10 font-bold px-3 py-1 uppercase tracking-wider text-[10px]">
                  {categoryName}
                </Badge>
              )}

              <h3 className={`font-display font-black text-foreground mb-4 leading-[1.1] tracking-tight group-hover:text-primary transition-colors duration-300 ${isAuthenticated ? "text-2xl md:text-3xl" : "text-xl md:text-2xl mt-4"}`}>
                {title}
              </h3>

              {isAuthenticated && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground/80 transition-colors">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{formatTurkishTime(time)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground/80 transition-colors">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold truncate">{venueName || cityName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {isAuthenticated ? (
              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                        <Users className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    ))}
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground">
                      +{attendeeCount}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground pl-1">Katılımcı</span>
                </div>

                {isAdmin && (
                  <motion.div
                    whileHover={{ scale: 1.1, x: 5 }}
                    className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-xl"
                  >
                    <Edit2 className="h-4 w-4" />
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="pt-4 border-t border-white/5">
                <span className="text-xs font-bold text-primary italic">Detaylar için giriş yapın →</span>
              </div>
            )}
          </CardContent>

          {/* Shimmer on Hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default EventCard;
