import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";

export const formatTurkishDate = (dateStr: string): string => {
  return format(parseISO(dateStr), "d MMMM yyyy", { locale: tr });
};

export const formatTurkishTime = (timeStr: string): string => {
  // timeStr is HH:mm:ss or HH:mm
  return timeStr.substring(0, 5);
};

export const formatTurkishDateTime = (dateStr: string, timeStr: string): string => {
  return `${formatTurkishDate(dateStr)}, ${formatTurkishTime(timeStr)}`;
};

export const getDayName = (dateStr: string): string => {
  return format(parseISO(dateStr), "EEEE", { locale: tr });
};

export const getDaysUntilEvent = (dateStr: string): number => {
  const eventDate = startOfDay(parseISO(dateStr));
  const today = startOfDay(new Date());
  return differenceInDays(eventDate, today);
};

export const formatDaysUntil = (dateStr: string): string => {
  const days = getDaysUntilEvent(dateStr);
  
  if (days === 0) return "Bugün";
  if (days === 1) return "Yarın";
  if (days < 0) return "Geçti";
  
  return `${days} gün`;
};
