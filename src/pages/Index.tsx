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
import { Search, CalendarDays, Loader, Clock, Plus, Calendar, MapPin, Users, UserCheck, UserX, List, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
  useEffect(() => {
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
      setSelectedEvent(data as unknown as EventWithRelations);
      setSelectedEventRsvps(data.rsvps as RsvpWithProfile[]);
    }
  };

  const updateGuestCount = async (count: number) => {
    setGuestCount(count);
    if (myRsvp?.status === "attending" && user && selectedEvent) {
      const existing = selectedEventRsvps.find((r) => r.user_id === user.id);
      if (existing) {
        await supabase.from("rsvps").update({ guest_count: count }).eq("id", existing.id);
        const { data } = await supabase
          .from("events")
          .select("*, cities(name), venues(name), categories(name), rsvps(*, profiles(first_name, last_name))")
          .eq("id", selectedEvent.id)
          .single();
        if (data) {
          setSelectedEvent(data as unknown as EventWithRelations);
          setSelectedEventRsvps(data.rsvps as RsvpWithProfile[]);
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
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl"
            animate={{ y: [0, 50, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 -right-40 w-80 h-80 bg-gradient-to-br from-accent/10 to-primary/5 rounded-full blur-3xl"
            animate={{ y: [0, -50, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <motion.div 
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg shadow-primary/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <CalendarDays className="h-6 w-6 text-primary font-bold" />
              </motion.div>
              <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
                Yaklaşan Etkinlikler
              </h2>
            </div>
            <p className="text-muted-foreground mt-2 text-lg">Katılmak istediğiniz etkinlikleri keşfedin ve hatırlatıcı ekleyin</p>
          </motion.div>

          {/* Enhanced Filters */}
          <motion.div
            className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center p-6 rounded-2xl bg-gradient-to-r from-card/60 to-card/40 backdrop-blur-md border border-border/30 shadow-lg"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Etkinlik ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-11 bg-card/80 backdrop-blur border-border/40 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-11 bg-card/80 backdrop-blur border-border/40 focus:border-primary/50 focus:ring-primary/20 rounded-xl">
                <SelectValue placeholder="Şehir Seç" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Tüm Şehirler</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-11 bg-card/80 backdrop-blur border-border/40 focus:border-primary/50 focus:ring-primary/20 rounded-xl">
                <SelectValue placeholder="Kategori Seç" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                className={`gap-2 rounded-lg px-4 h-9 transition-all ${
                  viewMode === "list"
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
                className={`gap-2 rounded-lg px-4 h-9 transition-all ${
                  viewMode === "calendar"
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
            <DialogContent className="max-w-2xl border-border/50 bg-card/95 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {editingEvent ? "Etkinliği Düzenle" : "Yeni Etkinlik Ekle"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Başlık *</Label>
                  <Input 
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    placeholder="Etkinlik başlığı" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Açıklama</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Etkinlik açıklaması" 
                    rows={3} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tarih *</Label>
                    <Input 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => setFormData({...formData, date: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saat *</Label>
                    <Input 
                      type="time" 
                      value={formData.time} 
                      onChange={(e) => setFormData({...formData, time: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Şehir *</Label>
                  <Select value={formData.city_id} onValueChange={(val) => setFormData({...formData, city_id: val})}>
                    <SelectTrigger><SelectValue placeholder="Şehir seçiniz" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select value={formData.category_id} onValueChange={(val) => setFormData({...formData, category_id: val})}>
                    <SelectTrigger><SelectValue placeholder="Kategori seçiniz" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mekan</Label>
                  <Input 
                    value={formData.venue_name} 
                    onChange={(e) => setFormData({...formData, venue_name: e.target.value})} 
                    placeholder="Mekan adı" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">İptal</Button>
                <Button onClick={handleSaveEvent} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
                  {saving ? "Kaydediliyor..." : editingEvent ? "Güncelle" : "Oluştur"}
                </Button>
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
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader className="h-10 w-10 text-primary" />
              </motion.div>
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
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Past Events Section - only show in list view */}
      {viewMode === "list" && pastEvents.length > 0 && (
        <section className="relative py-20 bg-muted/20">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-muted/10 to-accent/5 rounded-full blur-3xl"
              animate={{ y: [0, 50, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-20 -right-40 w-80 h-80 bg-gradient-to-br from-accent/10 to-muted/5 rounded-full blur-3xl"
              animate={{ y: [0, -50, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <motion.div 
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 shadow-md shadow-muted/20"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Clock className="h-4.5 w-4.5 text-muted-foreground" />
                </motion.div>
                <h2 className="font-display text-2xl font-semibold text-muted-foreground md:text-3xl">
                  Geçmiş Etkinlikler
                </h2>
              </div>
              <p className="text-muted-foreground/70 mt-1 text-sm">Önceki etkinlikleri görüntüleyin</p>
            </motion.div>

            {/* Past Events Grid */}
            <motion.div 
              className="mt-12 grid gap-4 grid-cols-1"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ staggerChildren: 0.05 }}
            >
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
            </motion.div>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Katılım Durumu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{selectedEventRsvps.filter(r => r.status === "attending").reduce((s: number, r) => s + 1 + r.guest_count, 0)}</span> toplam
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{selectedEventRsvps.filter(r => r.status === "attending").length}</span> katılıyor
                    </div>
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-destructive" />
                      <span className="font-semibold">{selectedEventRsvps.filter(r => r.status === "not_attending").length}</span> katılmıyor
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      size="sm"
                      variant={myRsvp?.status === "attending" ? "default" : "outline"}
                      onClick={() => handleRsvp("attending")}
                    >
                      Katılıyorum
                    </Button>
                    <Button
                      size="sm"
                      variant={myRsvp?.status === "not_attending" ? "destructive" : "outline"}
                      onClick={() => handleRsvp("not_attending")}
                    >
                      Katılmıyorum
                    </Button>
                    {myRsvp?.status === "attending" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Misafir:</span>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={guestCount}
                          onChange={(e) => updateGuestCount(parseInt(e.target.value) || 0)}
                          className="w-20 h-9"
                        />
                      </div>
                    )}
                  </div>

                  {/* Attendees List */}
                  {selectedEventRsvps.filter(r => r.status === "attending").length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-xs font-semibold mb-2">Katılımcılar</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedEventRsvps.filter(r => r.status === "attending").map((rsvp) => (
                          <div key={rsvp.id} className="text-xs text-foreground/80">
                            {rsvp.profiles?.first_name} {rsvp.profiles?.last_name}
                            {rsvp.guest_count > 0 && <span className="text-muted-foreground"> (+{rsvp.guest_count})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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