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

const EventCard = ({ id, title, date, time, cityName, venueName, categoryName, attendeeCount, description, index = 0, isPast = false, viewMode = "card", isAdmin = false, onEdit, onDelete, onClick }: EventCardProps) => {
  const navigate = useNavigate();
  const colors = getColorByCategory(categoryName);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(id, e);
    } else {
      navigate(`/etkinlik/${id}`);
    }
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
        className={`${isPast ? "opacity-70" : ""} cursor-pointer`}
        onClick={handleCardClick}
      >
        <Card
          className={`group overflow-hidden border border-border/50 bg-gradient-to-r from-card/95 via-card/90 to-amber-100/25 backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-amber-300/40 rounded-xl ${
            isPast ? "[filter:blur(2.5px)] hover:[filter:blur(0px)] transition-[filter] duration-300" : ""
          }`}
        >
          <CardContent className="py-3 px-4">
            {/* Mobile Layout (<768px) */}
            <div className="md:hidden space-y-2">
              <h3 className="font-display text-base font-bold text-foreground line-clamp-2">
                {title}
              </h3>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold w-fit truncate inline-flex">
                <Sparkles className="h-3 w-3 mr-1" />
                {categoryName}
              </Badge>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-sm text-foreground/90">
                  <Calendar className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-xs truncate">{formatTurkishDate(date)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-foreground/90">
                  <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-xs">{formatTurkishTime(time)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-foreground/90 col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-xs truncate">{venueName}</span>
                  {cityName && <span className="text-muted-foreground/60 text-xs truncate">• {cityName}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-foreground/85">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium"><span className="font-bold text-primary">{attendeeCount}</span> kişi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm border ${
                    getDaysUntilEvent(date) === 0
                      ? "bg-red-500/80 text-white border-red-300/40"
                      : getDaysUntilEvent(date) === 1
                      ? "bg-orange-500/80 text-white border-orange-300/40"
                      : getDaysUntilEvent(date) < 0
                      ? "bg-gray-500/70 text-white border-gray-300/40"
                      : "bg-primary/85 text-primary-foreground border-primary/30"
                  }`}>
                    {formatDaysUntil(date)}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-amber-300/40 hover:bg-amber-500/20" onClick={(e) => { e.stopPropagation(); onEdit?.({ id, title, date, time, categoryName, cityName, venueName }); }}>
                        <Edit2 className="h-3 w-3 text-amber-600" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-300/40 hover:bg-red-500/20" onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}>
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Layout (md+) - two rows for medium, single row for xl+ */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between gap-3 min-w-0">
                {/* Title + Category */}
                <div className="min-w-0 flex-shrink flex-1">
                  <h3 className="font-display text-base lg:text-lg font-bold text-foreground truncate min-w-0">
                    {title}
                  </h3>
                  <Badge className="mt-0.5 bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold w-fit truncate inline-flex">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {categoryName}
                  </Badge>
                </div>

                {/* Info items - wrap on medium screens */}
                <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 flex-wrap justify-end">
                  <div className="flex items-center gap-1.5 text-sm text-foreground/90 shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-semibold whitespace-nowrap">{formatTurkishDate(date)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-foreground/90 shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-semibold whitespace-nowrap">{formatTurkishTime(time)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-foreground/90 shrink-0 max-w-[200px]">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold truncate">{venueName}</span>
                    {cityName && <span className="truncate text-muted-foreground/55 hidden lg:inline">• {cityName}</span>}
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/70 px-2.5 py-1 text-[11px] text-foreground/85 shrink-0">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium whitespace-nowrap">
                      <span className="font-bold text-primary">{attendeeCount}</span> kişi katılıyor
                    </span>
                  </div>

                  <div className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm border shrink-0 ${
                    getDaysUntilEvent(date) === 0
                      ? "bg-red-500/80 text-white border-red-300/40"
                      : getDaysUntilEvent(date) === 1
                      ? "bg-orange-500/80 text-white border-orange-300/40"
                      : getDaysUntilEvent(date) < 0
                      ? "bg-gray-500/70 text-white border-gray-300/40"
                      : "bg-primary/85 text-primary-foreground border-primary/30"
                  }`}>
                    {formatDaysUntil(date)}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-amber-300/40 hover:bg-amber-500/20 hover:border-amber-400/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.({ id, title, date, time, categoryName, cityName, venueName });
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-amber-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-300/40 hover:bg-red-500/20 hover:border-red-400/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className={isPast ? "opacity-50" : ""}
    >
      <motion.div
        whileHover={{ y: -8, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card
          className="group cursor-pointer overflow-hidden border border-border/45 bg-gradient-to-br from-card/95 via-card/88 to-amber-100/35 backdrop-blur-xl transition-all duration-500 hover:shadow-xl hover:border-amber-300/40 relative rounded-2xl hover:scale-[1.01]"
          onClick={handleCardClick}
        >
          {/* Animated gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-30 group-hover:opacity-45 transition-opacity duration-500`} />
          
          {/* Multiple floating orbs */}
          <div className={`absolute -top-10 -right-10 h-40 w-40 bg-gradient-to-br ${colors.gradient} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-all duration-700`} />
          <div className={`absolute -bottom-10 -left-10 h-40 w-40 bg-gradient-to-tr ${colors.gradient} rounded-full blur-3xl opacity-15 group-hover:opacity-25 transition-all duration-700 delay-100`} />
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          {/* Header gradient background */}
          <motion.div 
            className={`relative w-full min-h-[58px] bg-gradient-to-br ${colors.gradient} opacity-70 group-hover:opacity-80 overflow-hidden px-2 py-1.5`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {/* Animated wave pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id={`pattern-${id}`} patternUnits="userSpaceOnUse" width="60" height="60">
                    <circle cx="30" cy="30" r="3" fill="white" opacity="0.6" />
                    <circle cx="0" cy="0" r="2" fill="white" opacity="0.4" />
                    <circle cx="60" cy="60" r="2" fill="white" opacity="0.4" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#pattern-${id})`} />
              </svg>
            </div>
            
            {/* Animated glow line */}
            <motion.div 
              className="absolute top-0 left-0 right-0 h-0.5 bg-white/50 shadow-lg shadow-white/50"
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: index * 0.08 }}
            />

            {/* Category badge in header */}
            <div className="absolute top-1.5 right-2 z-20 flex flex-col items-end gap-1">
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Badge className="bg-white/25 backdrop-blur-md border-2 border-white/40 text-white text-xs font-bold px-2 py-0.5 shadow-lg hover:bg-white/35 transition-all">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {categoryName}
                </Badge>
              </motion.div>
            </div>

            {/* Event Title in Header */}
            <div className="relative z-10 pr-24">
              <motion.h3 
                className="font-display text-base md:text-lg font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] line-clamp-2 leading-tight"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 + 0.1 }}
              >
                {title}
              </motion.h3>
            </div>
          </motion.div>
          
          <CardContent className="p-4 relative z-10">
            {/* Info items with enhanced styling */}
            <div className="space-y-2">{/* Date */}
              <motion.div 
                className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors"
                whileHover={{ x: 6 }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 + 0.15 }}
              >
                <motion.div 
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colors.gradient} text-white shadow-lg ${colors.shadow} group-hover:shadow-xl transition-shadow`}
                  whileHover={{ rotate: 12, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Calendar className="h-4 w-4 drop-shadow-md" />
                </motion.div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-sm">{formatTurkishDate(date)}</span>
                  <span className="text-xs text-muted-foreground">{getDayName(date)}</span>
                </div>
              </motion.div>
              
              {/* Time */}
              <motion.div 
                className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors"
                whileHover={{ x: 6 }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 + 0.2 }}
              >
                <motion.div 
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colors.gradient} text-white shadow-lg ${colors.shadow} group-hover:shadow-xl transition-shadow`}
                  whileHover={{ rotate: -12, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Clock className="h-4 w-4 drop-shadow-md" />
                </motion.div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-sm">{formatTurkishTime(time)}</span>
                </div>
              </motion.div>
              
              {/* Location */}
              {venueName || cityName && (
                <motion.div 
                  className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors min-w-0"
                  whileHover={{ x: 6 }}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 + 0.25 }}
                >
                  <motion.div 
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colors.gradient} text-white shadow-lg ${colors.shadow} group-hover:shadow-xl transition-shadow`}
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <MapPin className="h-4 w-4 drop-shadow-md" />
                  </motion.div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground text-sm truncate">
                      {venueName}
                      {cityName && <span className="ml-1 font-normal text-muted-foreground/60">• {cityName}</span>}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Divider with gradient glow */}
            <motion.div 
              className={`mt-3 h-px bg-gradient-to-r from-transparent via-border to-transparent relative`}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: index * 0.08 + 0.3 }}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-20 blur-sm`} />
            </motion.div>

            {/* Description */}
            {description && description.trim() && (
              <motion.p
                className="mt-3 text-xs text-foreground/70 line-clamp-2 leading-relaxed"
                initial={{ opacity: 0, y: -5 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 + 0.32 }}
              >
                {description}
              </motion.p>
            )}

            {/* Bottom section with CTA and Days Until */}
            <div className="mt-2 flex flex-wrap items-center gap-2 justify-between">
              {/* Attendee info */}
              <motion.div 
                className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 text-xs text-foreground/80 shadow-sm max-w-full"
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 + 0.32 }}
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium whitespace-nowrap">
                  <span className="font-bold text-primary">{attendeeCount}</span> kişi katılıyor
                </span>
              </motion.div>

              {/* Days until event badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 + 0.35 }}
                whileHover={{ scale: 1.15, rotate: [-1, 1, -1, 0] }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-xl backdrop-blur-sm border-2 ${
                  getDaysUntilEvent(date) === 0 
                    ? 'bg-gradient-to-r from-red-600/80 via-orange-500/75 to-amber-700/70 text-white border-red-300/40 shadow-red-600/35' 
                    : getDaysUntilEvent(date) === 1 
                    ? 'bg-gradient-to-r from-orange-600/80 via-amber-500/75 to-yellow-500/70 text-white border-orange-300/40 shadow-orange-600/35'
                    : getDaysUntilEvent(date) < 0
                    ? 'bg-gray-500/70 text-white border-gray-300/40'
                    : `bg-gradient-to-r ${colors.gradient} text-white border-white/30 ${colors.shadow}`
                }`}
              >
                <span className="drop-shadow-md">Kalan Süre: {formatDaysUntil(date)}</span>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default EventCard;
