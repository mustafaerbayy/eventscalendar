// Scroll to nearest upcoming event (list view) or events section (calendar view)
export function scrollToNearestEvent(viewMode: "list" | "calendar", upcomingEvents: any[]) {
  if (viewMode === "calendar") {
    // Takvim görünümündeyse takvim bölümüne kaydır (offset ile)
    const calendarSection = document.querySelector('#calendar-section') || document.querySelector('#events-section');
    if (calendarSection) {
      const elementTop = calendarSection.getBoundingClientRect().top + window.scrollY;
      const offset = 120; // Navbar yüksekliği
      window.scrollTo({ top: elementTop - offset, behavior: "smooth" });
    }
    return;
  }
  const nearestUpcoming = upcomingEvents[0];
  if (nearestUpcoming) {
    const element = document.querySelector(`[data-event-id="${nearestUpcoming.id}"]`);
    if (element) {
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const offset = 120;
      window.scrollTo({ top: elementTop - offset, behavior: "smooth" });
    }
    return;
  }
  document.querySelector("#events-section")?.scrollIntoView({ behavior: "smooth" });
}

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CalendarDays, Loader, Clock, Plus, Minus, Calendar, MapPin, Users, UserCheck, UserX, List, LayoutGrid, Sparkles, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatTurkishDate, formatTurkishTime } from "@/lib/date-utils";
import EventCard from "@/components/EventCard";
import CalendarView from "@/components/CalendarView";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";

interface EventWithRelations {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string | null;
  city_id: string;
  venue_id: string;
  venue_name?: string | null;
  category_id: string;
  cities: { name: string } | null;
  venues: { name: string } | null;
  categories: { name: string } | null;
  rsvps: { id: string; user_id: string; status: string; guest_count: number; profiles: { first_name: string; last_name: string } | null }[];
}

interface RsvpWithProfile {
  id: string;
  user_id: string;
  status: string;
  guest_count: number;
  profiles: { first_name: string; last_name: string } | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewModeState] = useState<"list" | "calendar">(() => {
    const saved = localStorage.getItem("viewMode");
    return saved === "calendar" ? "calendar" : "list";
  });
  const setViewMode = (mode: "list" | "calendar") => {
    setViewModeState(mode);
    localStorage.setItem("viewMode", mode);
  };

  // Event detail dialog
  const [selectedEvent, setSelectedEvent] = useState<EventWithRelations | null>(null);
  const [selectedEventRsvps, setSelectedEventRsvps] = useState<RsvpWithProfile[]>([]);
  const [myRsvp, setMyRsvp] = useState<{ status: string; guest_count: number } | null>(null);
  const [guestCount, setGuestCount] = useState(0);

  // Event management dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithRelations | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    city_id: "",
    venue_name: "",
    category_id: "",
  });
  const [isPastEventsOpen, setIsPastEventsOpen] = useState(false);
  const fetchData = async () => {
    const [eventsRes, citiesRes, categoriesRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, cities(name), venues(name), categories(name), rsvps(*, profiles(first_name, last_name))")
        .order("date", { ascending: true }),
      supabase.from("cities").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);
    setEvents((eventsRes.data as unknown as EventWithRelations[]) || []);
    setCities(citiesRes.data || []);
    setCategories(categoriesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === "all" || e.city_id === cityFilter;
    const matchesCategory = categoryFilter === "all" || e.category_id === categoryFilter;
    return matchesSearch && matchesCity && matchesCategory;
  });

  const upcomingEvents = filteredEvents.filter((e) => e.date >= today);
  const pastEvents = filteredEvents.filter((e) => e.date < today).reverse();

  const handleViewEvents = () => {
    scrollToNearestEvent(viewMode, upcomingEvents);
  };

  const getAttendeeCount = (rsvps: RsvpWithProfile[]) => {
    return rsvps
      .filter((r) => r.status === "attending")
      .reduce((sum, r) => sum + 1 + r.guest_count, 0);
  };

  const handleCardClick = async (eventId: string) => {
    if (!user) {
      toast.info("Detayları görmek için lütfen giriş yapın.");
      navigate("/giris");
      return;
    }
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    setSelectedEvent(event);
    const rsvpData = event.rsvps || [];
    setSelectedEventRsvps(rsvpData);

    if (user) {
      const mine = rsvpData.find((r) => r.user_id === user.id);
      if (mine) {
        setMyRsvp({ status: mine.status, guest_count: mine.guest_count });
        setGuestCount(mine.guest_count);
      } else {
        setMyRsvp(null);
        setGuestCount(0);
      }
    } else {
      setMyRsvp(null);
      setGuestCount(0);
    }
  };

  const handleRsvp = async (status: "attending" | "not_attending") => {
    if (!user) {
      toast.error("Giriş yapmalısınız");
      return;
    }
    if (!selectedEvent) return;

    const gc = status === "attending" ? guestCount : 0;
    const existing = selectedEventRsvps.find((r) => r.user_id === user.id);

    if (existing) {
      await supabase
        .from("rsvps")
        .update({ status, guest_count: gc })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("rsvps")
        .insert({ user_id: user.id, event_id: selectedEvent.id, status, guest_count: gc });
    }

    setMyRsvp({ status, guest_count: gc });
    if (status === "not_attending") setGuestCount(0);
    toast.success(status === "attending" ? "Katılım kaydedildi!" : "Katılmama kaydedildi.");

    // Refresh event data
    const { data } = await supabase
      .from("events")
      .select("*, cities(name), venues(name), categories(name), rsvps(*, profiles(first_name, last_name))")
      .eq("id", selectedEvent.id)
      .single();

    if (data) {
      const updatedEvent = data as unknown as EventWithRelations;
      setSelectedEvent(updatedEvent);
      setSelectedEventRsvps(updatedEvent.rsvps as RsvpWithProfile[]);

      // Efficiently update the background list without a full fetch
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  };

  const updateGuestCount = async (count: number) => {
    setGuestCount(count);
    if (myRsvp?.status === "attending" && user && selectedEvent) {
      const existing = selectedEventRsvps.find((r) => r.user_id === user.id);
      if (existing) {
        await supabase.from("rsvps").update({ guest_count: count }).eq("id", existing.id);

        // Refresh this specific event's data from Supabase
        const { data } = await supabase
          .from("events")
          .select("*, cities(name), venues(name), categories(name), rsvps(*, profiles(first_name, last_name))")
          .eq("id", selectedEvent.id)
          .single();

        if (data) {
          const updatedEvent = data as unknown as EventWithRelations;
          setSelectedEvent(updatedEvent);
          setSelectedEventRsvps(updatedEvent.rsvps as RsvpWithProfile[]);

          // Also update it in the main events list
          setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        }
      }
    }
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      city_id: "",
      venue_name: "",
      category_id: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: EventWithRelations) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      date: event.date,
      time: event.time,
      city_id: event.city_id,
      venue_name: event.venue_name || event.venues?.name || "",
      category_id: event.category_id,
    });
    setDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim() || !formData.date || !formData.time || !formData.city_id || !formData.category_id) {
      toast.error("Lütfen zorunlu alanları doldurunuz.");
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        city_id: formData.city_id,
        venue_name: formData.venue_name,
        category_id: formData.category_id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Etkinlik güncellendi.");
      } else {
        const { error } = await supabase
          .from("events")
          .insert([eventData]);
        if (error) throw error;
        toast.success("Etkinlik oluşturuldu.");
      }
      setDialogOpen(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Bu etkinliği silmek istediğinize emin misiniz?")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Etkinlik silindi.");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Hata oluştu.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onViewEvents={handleViewEvents} />

      {/* Events Section with background decoration */}
      <section id="events-section" className="relative py-20">
        {/* Static Background Glow for Performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 -right-40 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase text-primary/80">Keşfet & Katıl</span>
            </div>

            <h2 className="font-display text-5xl md:text-7xl font-black mb-8 tracking-tighter flex flex-wrap justify-center gap-x-4 md:gap-x-8">
              {["Yaklaşan", "Etkinlikler"].map((word, wordIndex) => (
                <motion.span
                  key={wordIndex}
                  className="relative inline-flex group"
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                >
                  {/* Premium Background Glow */}
                  <span className="absolute -inset-8 blur-[40px] bg-emerald-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                  {word.split("").map((char, charIndex) => (
                    <motion.span
                      key={charIndex}
                      variants={{
                        initial: { opacity: 0, y: 15, rotateX: -90, filter: "blur(12px)" },
                        animate: { opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }
                      }}
                      transition={{
                        duration: 0.8,
                        delay: (wordIndex * 8 + charIndex) * 0.04,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      className="relative inline-block text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-400 to-emerald-700 drop-shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                    >
                      {char}
                      {/* Premium Gold/Light Shimmer Overlay */}
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent bg-clip-text text-transparent"
                        style={{ backgroundSize: '300% auto' }}
                        animate={{
                          backgroundPosition: ['300% center', '-150% center'],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          repeatDelay: 2 + wordIndex
                        }}
                      >
                        {char}
                      </motion.span>
                    </motion.span>
                  ))}

                  {/* Innovative Underline Accent */}
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    whileInView={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 + wordIndex * 0.2 }}
                    className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
                  />
                </motion.span>
              ))}
            </h2>


          </motion.div>

          {/* Enhanced Filters */}
          <motion.div
            className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center p-4 rounded-[2rem] bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden group"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60 group-hover:text-primary transition-colors" />
              <Input
                placeholder="Etkinlik ara"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-14 h-14 bg-white/5 border-white/5 focus:bg-white/10 focus:border-primary/30 rounded-2xl transition-all placeholder:text-muted-foreground/50 text-base shadow-inner"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-14 bg-white/5 border-white/5 focus:bg-white/10 focus:border-primary/30 rounded-2xl transition-all shadow-inner">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary/60" />
                    <SelectValue placeholder="Şehir" />
                  </div>
                </SelectTrigger>
                <SelectContent className="!rounded-2xl border-white/10 !bg-[#0c0c0c]/95 !backdrop-blur-xl !z-[9999] p-2 !opacity-100 !visible">
                  <SelectItem value="all" className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">Tüm Şehirler</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-14 bg-white/5 border-white/5 focus:bg-white/10 focus:border-primary/30 rounded-2xl transition-all shadow-inner">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/60" />
                    <SelectValue placeholder="Kategori" />
                  </div>
                </SelectTrigger>
                <SelectContent className="!rounded-2xl border-white/10 !bg-[#0c0c0c]/95 !backdrop-blur-xl !z-[9999] p-2 !opacity-100 !visible">
                  <SelectItem value="all" className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">Tüm Kategoriler</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* View Mode Toggle */}
          <motion.div
            className="mt-6 flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="inline-flex items-center rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-1 shadow-sm">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`gap-2 rounded-lg px-4 h-9 transition-all ${viewMode === "list"
                  ? "bg-gradient-to-r from-emerald-600/90 to-emerald-500/80 text-white shadow-md shadow-emerald-600/25"
                  : "hover:bg-emerald-500/10 text-muted-foreground"
                  }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Liste</span>
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={`gap-2 rounded-lg px-4 h-9 transition-all ${viewMode === "calendar"
                  ? "bg-gradient-to-r from-emerald-600/90 to-emerald-500/80 text-white shadow-md shadow-emerald-600/25"
                  : "hover:bg-emerald-500/10 text-muted-foreground"
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Takvim</span>
              </Button>
            </div>
            <span className="text-xs text-muted-foreground ml-2">Buradan görünüm seçebilirsiniz</span>
          </motion.div>

          {isAdmin && (
            <motion.div
              className="mt-6 flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Button
                onClick={openCreateDialog}
                className="gap-2 bg-gradient-to-r from-primary/90 to-primary/70 hover:from-primary hover:to-primary/80 text-primary-foreground font-semibold shadow-lg h-11 px-6 rounded-lg"
              >
                <Plus className="h-5 w-5" />
                Yeni Etkinlik Ekle
              </Button>
            </motion.div>
          )}

          <motion.div
            className="mt-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
          >
            <p className="text-sm md:text-base text-foreground/85 font-medium">
              Lütfen katılım durumunuzu aşağıdaki etkinliklere tıklayarak belirtiniz.
            </p>
          </motion.div>

          {/* Event Management Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="w-[95vw] sm:max-w-xl bg-[#050505]/95 backdrop-blur-3xl border-white/10 p-0 rounded-[1.5rem] sm:rounded-[2.5rem] selection:bg-primary/30 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 sm:p-10 pb-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl relative z-10">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display font-black flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      {editingEvent ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black">{editingEvent ? "Etkinliği Düzenle" : "Yeni Etkinlik Ekle"}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Etkinlik Yönetimi</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-6 sm:p-10 pt-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">ETKİNLİK BAŞLIĞI *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Etkinlik adını girin..."
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white placeholder:text-white/40"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">AÇIKLAMA</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Etkinlik detayı..."
                      className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] p-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-medium leading-relaxed resize-none text-white placeholder:text-white/40"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">TARİH *</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">SAAT *</Label>
                      <Input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">ŞEHİR *</Label>
                    <Select value={formData.city_id} onValueChange={(val) => setFormData({ ...formData, city_id: val })}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 transition-all font-bold text-white">
                        <SelectValue placeholder="Şehir seçiniz" />
                      </SelectTrigger>
                      <SelectContent className="!bg-[#0c0c0c] border-white/10 rounded-2xl p-2 !z-[9999] !opacity-100 !visible">
                        {cities.map(c => <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">KATEGORİ *</Label>
                    <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 transition-all font-bold text-white">
                        <SelectValue placeholder="Kategori seçiniz" />
                      </SelectTrigger>
                      <SelectContent className="!bg-[#0c0c0c] border-white/10 rounded-2xl p-2 !z-[9999] !opacity-100 !visible">
                        {categories.map(c => <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">MEKAN</Label>
                    <Input
                      value={formData.venue_name}
                      onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                      placeholder="Mekan adı"
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 focus:border-primary/40 focus:ring-primary/20 transition-all font-bold text-white placeholder:text-white/40"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveEvent}
                    disabled={saving}
                    className="w-full h-16 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_15px_30px_rgba(16,185,129,0.2)] mt-4"
                  >
                    {saving ? "KAYDEDİLİYOR..." : editingEvent ? "DEĞİŞİKLİKLERİ KAYDET" : "ETKİNLİĞİ OLUŞTUR"}
                  </motion.button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Event Grid / Calendar */}
          {loading ? (
            <motion.div
              className="mt-20 flex flex-col items-center justify-center gap-4 py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-10px] rounded-full border-t-2 border-primary/40 border-r-2 border-r-transparent"
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative h-16 w-16"
                >
                  <img src="/images/logo.png" alt="Logo" className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                </motion.div>
              </div>
              <motion.p
                className="text-lg text-muted-foreground font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Etkinlikler yükleniyor...
              </motion.p>
            </motion.div>
          ) : viewMode === "calendar" ? (
            <div id="calendar-section">
              <CalendarView
                events={[
                  ...upcomingEvents.map((event) => ({
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    cityName: event.cities?.name || "",
                    venueName: event.venue_name || event.venues?.name || undefined,
                    categoryName: event.categories?.name || "",
                    attendeeCount: getAttendeeCount(event.rsvps || []),
                    isPast: false,
                  })),
                  ...pastEvents.map((event) => ({
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    cityName: event.cities?.name || "",
                    venueName: event.venue_name || event.venues?.name || undefined,
                    categoryName: event.categories?.name || "",
                    attendeeCount: getAttendeeCount(event.rsvps || []),
                    isPast: true,
                  })),
                ]}
                onEventClick={(eventId) => handleCardClick(eventId)}
                isAuthenticated={!!user}
              />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <motion.div
              className="mt-20 text-center py-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-lg mb-6"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
              </motion.div>
              <p className="text-2xl font-display font-bold text-foreground">Etkinlik bulunamadı</p>
              <p className="mt-2 text-muted-foreground text-lg">Yaklaşan etkinlikler burada görünecek.</p>
            </motion.div>
          ) : (
            <motion.div
              className="mt-12 grid gap-4 grid-cols-1"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ staggerChildren: 0.05 }}
            >
              {upcomingEvents.map((event, i) => (
                <div key={event.id} data-event-id={event.id}>
                  <EventCard
                    id={event.id}
                    title={event.title}
                    date={event.date}
                    time={event.time}
                    cityName={event.cities?.name || ""}
                    venueName={event.venue_name || event.venues?.name || undefined}
                    categoryName={event.categories?.name || ""}
                    attendeeCount={getAttendeeCount(event.rsvps || [])}
                    index={i}
                    viewMode="list"
                    isAdmin={isAdmin}
                    onEdit={(eventData) => openEditDialog(event)}
                    onDelete={handleDeleteEvent}
                    onClick={handleCardClick}
                    isAuthenticated={!!user}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Past Events Section - only show in list view */}
      {viewMode === "list" && pastEvents.length > 0 && (
        <section className="relative py-20 bg-muted/5 border-t border-border/40">
          <div className="container mx-auto px-4 relative z-10">
            <button
              onClick={() => setIsPastEventsOpen(!isPastEventsOpen)}
              className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-card/40 border border-white/10 hover:bg-card/60 transition-all hover:scale-[1.005] active:scale-[0.995] group"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 ${isPastEventsOpen ? 'bg-primary/20 rotate-180' : 'bg-muted/30'}`}>
                  <Clock className={`h-6 w-6 transition-colors ${isPastEventsOpen ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <h2 className="font-display text-2xl font-black text-foreground md:text-3xl leading-none">
                    Geçmiş Etkinlikler
                  </h2>
                  <p className="text-muted-foreground/60 mt-1 text-sm font-medium">Önceki etkinlikleri görüntülemek için tıklayın</p>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center transition-transform duration-500 ${isPastEventsOpen ? 'rotate-180 bg-primary/10 border-primary/20' : 'bg-white/5'}`}>
                <ChevronDown className={`w-6 h-6 transition-colors ${isPastEventsOpen ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </button>

            <AnimatePresence>
              {isPastEventsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-12 grid gap-4 grid-cols-1">
                    {pastEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
                        id={event.id}
                        title={event.title}
                        date={event.date}
                        time={event.time}
                        cityName={event.cities?.name || ""}
                        venueName={event.venue_name || event.venues?.name || undefined}
                        categoryName={event.categories?.name || ""}
                        attendeeCount={getAttendeeCount(event.rsvps || [])}
                        index={i}
                        isPast={true}
                        viewMode="list"
                        isAdmin={isAdmin}
                        onEdit={(eventData) => openEditDialog(event)}
                        onDelete={handleDeleteEvent}
                        onClick={handleCardClick}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <Badge>{selectedEvent.categories?.name}</Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{formatTurkishDate(selectedEvent.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{formatTurkishTime(selectedEvent.time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{[selectedEvent.venue_name || selectedEvent.venues?.name, selectedEvent.cities?.name].filter(Boolean).join(", ")}</span>
                </div>
              </div>

              {selectedEvent.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">{selectedEvent.description}</p>
              )}

              {/* RSVP Section */}
              {/* Enhanced RSVP Section */}
              <div className="relative mt-8 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
                <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <h4 className="font-display text-lg font-black text-foreground flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Katılım Durumu
                  </h4>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {selectedEventRsvps.filter(r => r.status === "attending").reduce((s: number, r) => s + 1 + r.guest_count, 0)} Toplam
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <Button
                      variant="ghost"
                      onClick={() => handleRsvp("attending")}
                      className={`h-16 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-1 ${myRsvp?.status === "attending"
                        ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] text-primary"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground"
                        }`}
                    >
                      <UserCheck className="h-5 w-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Katılıyorum</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleRsvp("not_attending")}
                      className={`h-16 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-1 ${myRsvp?.status === "not_attending"
                        ? "bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] text-red-500"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground"
                        }`}
                    >
                      <UserX className="h-5 w-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Katılmıyorum</span>
                    </Button>
                  </div>

                  {myRsvp?.status === "attending" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 pt-4 border-t border-white/10"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">Misafir Ekle</p>
                          <p className="text-xs text-muted-foreground italic">
                            Lütfen sizinle birlikte katılacak misafir sayısını belirtiniz
                          </p>
                        </div>

                        <div className="flex items-center gap-4 bg-white/10 p-2 rounded-2xl border border-white/10">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={guestCount <= 0}
                            onClick={() => updateGuestCount(Math.max(0, guestCount - 1))}
                            className="h-10 w-10 rounded-xl hover:bg-white/10 text-primary transition-all active:scale-95"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-xl font-black text-foreground min-w-[1.5rem] text-center">
                            {guestCount}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={guestCount >= 10}
                            onClick={() => updateGuestCount(Math.min(10, guestCount + 1))}
                            className="h-10 w-10 rounded-xl hover:bg-white/10 text-primary transition-all active:scale-95"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Attendees List (Compact Glass Design) */}
                  {selectedEventRsvps.filter(r => r.status === "attending").length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                      <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Katılımcı Listesi
                      </h5>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedEventRsvps.filter(r => r.status === "attending").map((rsvp) => (
                          <div
                            key={rsvp.id}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-foreground/80 flex items-center gap-2 whitespace-nowrap"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            {rsvp.profiles?.first_name} {rsvp.profiles?.last_name?.[0]}.
                            {rsvp.guest_count > 0 && <span className="text-primary/70">+{rsvp.guest_count}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="relative border-t border-border/30 bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <img src="/images/logo.png" alt="Refik Keşif ve İnşa" className="h-8 w-8 object-contain opacity-70" />
            <p className="text-xs text-muted-foreground/70">
              © 2026 Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;