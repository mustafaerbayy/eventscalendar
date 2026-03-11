import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Users, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTurkishDate, formatTurkishTime, getDayName } from "@/lib/date-utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  cityName: string;
  venueName?: string;
  categoryName: string;
  attendeeCount: number;
  isPast?: boolean;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (eventId: string) => void;
  isAuthenticated?: boolean;
}

// Category dot colors for calendar cells
const categoryDotColors: Record<string, string> = {
  "Konferans": "bg-emerald-500",
  "Seminer": "bg-amber-500",
  "Workshop": "bg-amber-600",
  "Networking": "bg-yellow-500",
  "Panel": "bg-amber-400",
  "E\u011fitim": "bg-amber-400",
};

const getCategoryDotColor = (category: string) => {
  return categoryDotColors[category] || "bg-amber-500";
};

const CalendarView = ({ events, onEventClick, isAuthenticated = true }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = event.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    });
    return map;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div className="mt-12 space-y-10">
      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="overflow-hidden border border-white/20 bg-white/10 backdrop-blur-lg shadow-[0_32px_64px_rgba(0,0,0,0.4)] rounded-[2.5rem] relative">
          {/* Background Decorative Blur */}
          <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none transform-gpu" />
          <div className="hidden md:block absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none transform-gpu" />

          <CardContent className="p-0 relative z-10">
            {/* Calendar Header - Month Navigation */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-white/5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-12 w-12 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <div className="text-center">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={format(currentMonth, "yyyy-MM")}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="font-display text-3xl md:text-4xl font-black text-foreground capitalize tracking-tight"
                  >
                    {format(currentMonth, "MMMM", { locale: tr })}
                    <span className="text-primary/60 ml-2">{format(currentMonth, "yyyy")}</span>
                  </motion.h3>
                </AnimatePresence>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-12 w-12 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-white/5 px-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-4 text-center text-[10px] font-black text-primary/80 uppercase tracking-[0.2em]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 p-2 gap-1 md:gap-2">
              {calendarDays.map((day, idx) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`
                      relative min-h-[80px] md:min-h-[120px] p-3 rounded-2xl border text-left flex flex-col overflow-hidden
                      transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                      ${!isCurrentMonth ? "opacity-20 pointer-events-none" : "bg-white/5 hover:bg-white/[0.08]"}
                      ${isSelected ? "bg-primary/20 border-primary/40 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] z-10" : "border-transparent hover:border-white/10"}
                      ${isTodayDate && !isSelected ? "bg-white/10 border-primary/50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" : ""}
                    `}
                  >
                    {/* Today Glow Background */}
                    {isTodayDate && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                    )}

                    {/* Day Number */}
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <span
                        className={`
                          text-lg font-black leading-none
                          ${isTodayDate ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" : "text-foreground/80"}
                          ${isSelected ? "text-primary text-xl" : ""}
                        `}
                      >
                        {format(day, "d")}
                      </span>
                      {hasEvents && isCurrentMonth && (
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary blur-[4px] opacity-60 animate-pulse" />
                          <div className="h-2 w-2 rounded-full bg-primary relative z-10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]" />
                        </div>
                      )}
                    </div>

                    {/* Event Preview (Desktop) */}
                    <div className="hidden md:flex flex-col gap-1.5 overflow-hidden flex-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-[10px] font-bold text-foreground truncate rounded-md px-2 py-1 border-l-2 ${getCategoryDotColor(event.categoryName)} bg-white/10 shadow-sm hover:bg-white/20 transition-all`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] font-black text-primary/80 pl-1 uppercase tracking-tighter">
                          +{dayEvents.length - 2} DAHA
                        </span>
                      )}
                    </div>

                    {/* Mobile Event Count Badge */}
                    {hasEvents && isCurrentMonth && (
                      <div className="md:hidden mt-auto flex justify-end">
                        <div
                          className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] border border-white/20 active:scale-95 transition-transform"
                        >
                          <span className="text-[10px] font-black text-black leading-none">
                            {dayEvents.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Date Events Panel */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={format(selectedDate, "yyyy-MM-dd")}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl rounded-[2.5rem]">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="bg-primary/20 backdrop-blur-xl border border-primary/30 rounded-3xl p-5 shadow-2xl">
                      <Calendar className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-3xl font-black text-foreground capitalize tracking-tight">
                        {format(selectedDate, "d MMMM", { locale: tr })}
                      </h3>
                      <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs">
                        {format(selectedDate, "EEEE", { locale: tr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-black text-foreground uppercase tracking-wider">
                      {selectedDateEvents.length} ETKİNLİK
                    </span>
                  </div>
                </div>

                {selectedDateEvents.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedDateEvents.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => onEventClick?.(event.id)}
                        className={`
                          group flex flex-col md:flex-row md:items-center gap-4 p-6 rounded-[2rem] 
                          border border-white/10 bg-white/10 cursor-pointer
                          hover:bg-white/15 hover:border-primary/30 transition-all duration-300
                          shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden
                          ${event.isPast ? "opacity-50" : ""}
                        `}
                      >
                        {/* Side Glow Effect */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getCategoryDotColor(event.categoryName)} opacity-80`} />
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-white/10 p-3 rounded-2xl">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            {isAuthenticated ? (
                              <>
                                <div className="flex items-center gap-3 mb-1">
                                  <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black uppercase">
                                    {event.categoryName}
                                  </Badge>
                                  <span className="text-sm font-black text-foreground">{formatTurkishTime(event.time)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] font-black text-primary/60 italic mb-1">GİRİŞ YAPIN</div>
                            )}
                            <h4 className="font-display text-xl font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                              {event.title}
                            </h4>
                          </div>
                        </div>

                        {isAuthenticated && (
                          <div className="flex flex-wrap items-center gap-6 pl-12 md:pl-0">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="text-sm font-bold truncate max-w-[150px]">{event.venueName || event.cityName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="text-sm font-black text-foreground">{event.attendeeCount}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                    <Calendar className="h-16 w-16 mb-6 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest opacity-40">Müsait Gün</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarView;
