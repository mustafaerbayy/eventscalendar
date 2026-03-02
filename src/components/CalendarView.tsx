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

const CalendarView = ({ events, onEventClick }: CalendarViewProps) => {
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
    <div className="mt-12 space-y-6">
      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border border-border/50 bg-gradient-to-br from-card/95 via-card/90 to-amber-50/15 backdrop-blur-md shadow-xl rounded-2xl">
          <CardContent className="p-0">
            {/* Calendar Header - Month Navigation */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-amber-100/15 border-b border-border/30">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <motion.h3
                key={format(currentMonth, "yyyy-MM")}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-xl md:text-2xl font-bold text-foreground capitalize"
              >
                {format(currentMonth, "MMMM yyyy", { locale: tr })}
              </motion.h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border/30">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <motion.button
                    key={idx}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative min-h-[70px] md:min-h-[90px] p-1.5 md:p-2 border-b border-r border-border/20 
                      transition-all duration-200 text-left flex flex-col
                      ${!isCurrentMonth ? "bg-muted/20 text-muted-foreground/40" : "hover:bg-primary/5"}
                      ${isSelected ? "bg-primary/10 ring-2 ring-primary/30 ring-inset z-10" : ""}
                      ${isTodayDate && !isSelected ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}
                    `}
                  >
                    {/* Day Number */}
                    <span
                      className={`
                        inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium
                        ${isTodayDate ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30" : ""}
                        ${isSelected && !isTodayDate ? "bg-primary/20 text-primary font-bold" : ""}
                        ${!isCurrentMonth ? "text-muted-foreground/30" : ""}
                      `}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Event Dots/Labels */}
                    {hasEvents && isCurrentMonth && (
                      <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden flex-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`
                              hidden md:flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium
                              ${event.isPast 
                                ? "bg-muted/40 text-muted-foreground/60" 
                                : "bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                              }
                              truncate cursor-pointer
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(event.id);
                            }}
                            title={event.title}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getCategoryDotColor(event.categoryName)}`} />
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="hidden md:block text-[10px] text-muted-foreground font-medium pl-1">
                            +{dayEvents.length - 2} daha
                          </span>
                        )}
                        {/* Mobile: just dots */}
                        <div className="flex md:hidden gap-1 mt-0.5 flex-wrap">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={`h-2 w-2 rounded-full ${event.isPast ? "bg-muted-foreground/30" : getCategoryDotColor(event.categoryName)}`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.button>
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
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden border border-border/50 bg-gradient-to-r from-card/95 via-card/90 to-amber-50/10 backdrop-blur-md shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 shadow-md">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground capitalize">
                      {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedDateEvents.length > 0
                        ? `${selectedDateEvents.length} etkinlik`
                        : "Bu tarihte etkinlik yok"}
                    </p>
                  </div>
                </div>

                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onEventClick?.(event.id)}
                        className={`
                          group flex items-start gap-4 p-4 rounded-xl border border-border/40 
                          bg-gradient-to-r from-card/80 to-amber-50/8 cursor-pointer
                          hover:shadow-md hover:border-amber-300/30 transition-all duration-200
                          ${event.isPast ? "opacity-60" : ""}
                        `}
                      >
                        {/* Time Column */}
                        <div className="flex flex-col items-center min-w-[52px]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <span className="mt-1 text-sm font-bold text-foreground">
                            {formatTurkishTime(event.time)}
                          </span>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                            <h4 className="font-display text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors min-w-0 flex-1">
                              {event.title}
                            </h4>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold max-w-full w-fit truncate">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              {event.categoryName}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground min-w-0">
                            {(event.venueName || event.cityName) && (
                              <span className="flex items-center gap-1 min-w-0 max-w-full">
                                <MapPin className="h-3.5 w-3.5 text-primary/70" />
                                <span className="font-medium truncate">{event.venueName}</span>
                                {event.cityName && (
                                  <span className="text-muted-foreground/60">• {event.cityName}</span>
                                )}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-primary/70" />
                              <span>
                                <span className="font-bold text-primary">{event.attendeeCount}</span> kişi
                              </span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Bu tarihte planlanmış etkinlik bulunmuyor.</p>
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
