import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Clock, MapPin, Users, UserCheck, UserX, Info, AlertCircle, ExternalLink, FileText, Video, Music, File as FileIcon, Download, Minus, Plus, ChevronDown, Sparkles } from "lucide-react";
import { formatTurkishDate, formatTurkishTime } from "@/lib/date-utils";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { EventMemories } from "@/components/EventMemories";
import { motion, AnimatePresence } from "framer-motion";


interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue_name: string;
  location_url: string | null;
  cities: { name: string } | null;
  categories: { name: string } | null;
  venues: { name: string } | null;
}

interface EventContent {
  id: string;
  content_type: string;
  title: string;
  file_url: string;
  file_format: string | null;
}

interface RsvpWithProfile {
  id: string;
  user_id: string;
  status: string;
  guest_count: number;
  profiles: { first_name: string; last_name: string } | null;
}

const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [eventContents, setEventContents] = useState<EventContent[]>([]);
  const [rsvps, setRsvps] = useState<RsvpWithProfile[]>([]);
  const [myRsvp, setMyRsvp] = useState<{ status: string; guest_count: number } | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const [eventRes, rsvpRes, eventContentsRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, cities(name), categories(name), venues(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("rsvps")
        .select("*, profiles(first_name, last_name)")
        .eq("event_id", id),
      supabase
        .from("event_contents")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setEvent(eventRes.data as unknown as EventDetail);
    setEventContents(eventContentsRes.data as unknown as EventContent[] || []);
    const rsvpData = (rsvpRes.data as unknown as RsvpWithProfile[]) || [];
    setRsvps(rsvpData);

    if (user) {
      const mine = rsvpData.find((r) => r.user_id === user.id);
      if (mine) {
        setMyRsvp({ status: mine.status, guest_count: mine.guest_count });
        setGuestCount(mine.guest_count);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleRsvp = async (status: "attending" | "not_attending") => {
    if (!user) {
      navigate("/giris", { state: { from: location.pathname } });
      return;
    }
    if (!id) return;

    const gc = status === "attending" ? guestCount : 0;
    const existing = rsvps.find((r) => r.user_id === user.id);

    if (existing) {
      await supabase
        .from("rsvps")
        .update({ status, guest_count: gc })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("rsvps")
        .insert({ user_id: user.id, event_id: id, status, guest_count: gc });
    }

    setMyRsvp({ status, guest_count: gc });
    if (status === "not_attending") setGuestCount(0);
    toast.success(status === "attending" ? "Katılım kaydedildi!" : "Katılmama kaydedildi.");
    fetchData();
  };

  const updateGuestCount = async (count: number) => {
    setGuestCount(count);
    if (myRsvp?.status === "attending" && user) {
      const existing = rsvps.find((r) => r.user_id === user.id);
      if (existing) {
        await supabase.from("rsvps").update({ guest_count: count }).eq("id", existing.id);
        fetchData();
      }
    }
  };

  const attendingRsvps = rsvps.filter((r) => r.status === "attending");
  const notAttendingRsvps = rsvps.filter((r) => r.status === "not_attending");
  const totalAttendees = attendingRsvps.reduce((s, r) => s + 1 + r.guest_count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Etkinlik bulunamadı.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 md:pt-40 overflow-x-hidden">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          
          {/* Event Info */}
          <Badge variant="secondary" className="mb-3">{event.categories?.name}</Badge>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{event.title}</h1>

          <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatTurkishDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>{formatTurkishTime(event.time)}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground/80">{[event.venue_name || event.venues?.name, event.cities?.name].filter(Boolean).join(", ")}</span>
              {event.location_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                  asChild
                >
                  <a href={event.location_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Haritalar'da Aç
                  </a>
                </Button>
              )}
            </div>
          </div>

          {event.description && (
            <p className="mt-6 text-foreground/80 leading-relaxed text-lg">{event.description}</p>
          )}

          {/* Event Contents Section */}
          {(isAdmin || myRsvp?.status === "attending") && eventContents.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Etkinlik İçerikleri
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {eventContents.map((content) => (
                  <a
                    key={content.id}
                    href={content.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-2xl bg-foreground/5 hover:bg-foreground/10 border border-border/20 transition-all duration-300 p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative p-3 bg-background/50 rounded-xl text-primary shrink-0 shadow-sm border border-border/10 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                      {content.content_type === "Video" ? (
                        <Video className="h-6 w-6" />
                      ) : content.content_type === "Müzik" ? (
                        <Music className="h-6 w-6" />
                      ) : content.content_type === "Sunum" ? (
                        <FileText className="h-6 w-6" />
                      ) : (
                        <FileIcon className="h-6 w-6" />
                      )}
                    </div>
                    
                    <div className="relative flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-base mb-1 truncate group-hover:text-primary transition-colors">
                        {content.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        {content.file_format && (
                          <span className="truncate opacity-70 uppercase tracking-wider">{content.file_format}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 border border-border/10">
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* RSVP Section (Enhanced Glass Design) */}
          <div className="relative mt-8 rounded-3xl overflow-hidden border border-border/20 bg-foreground/5 backdrop-blur-2xl shadow-2xl">
            <div className="px-6 py-5 bg-foreground/5 border-b border-border/20 flex items-center justify-between">
              <h4 className="font-display text-lg font-black text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Katılım Durumu
              </h4>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {attendingRsvps.reduce((s: number, r) => s + 1 + r.guest_count, 0)} Toplam
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
                    : "bg-foreground/5 border-border/20 hover:bg-foreground/5 hover:border-border/20 text-muted-foreground"
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
                    : "bg-foreground/5 border-border/20 hover:bg-foreground/5 hover:border-border/20 text-muted-foreground"
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
                  className="space-y-4 pt-4 border-t border-border/20"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Misafir Ekle</p>
                      <p className="text-xs text-muted-foreground italic">
                        Lütfen sizinle birlikte katılacak misafir sayısını belirtiniz
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-foreground/5 p-2 rounded-2xl border border-border/20">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={guestCount <= 0}
                        onClick={() => updateGuestCount(Math.max(0, guestCount - 1))}
                        className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-primary transition-all active:scale-95"
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
                        className="h-10 w-10 rounded-xl hover:bg-foreground/5 text-primary transition-all active:scale-95"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Attendees List (Compact Glass Design) */}
              {attendingRsvps.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/20">
                  <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Katılımcı Listesi
                  </h5>
                  <div className="flex flex-wrap gap-2 pr-2 custom-scrollbar">
                    {attendingRsvps.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="px-3 py-1.5 rounded-full bg-foreground/5 border border-border/20 text-xs font-semibold text-foreground/80 flex items-center gap-2 whitespace-nowrap"
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

          {/* Media Archive Section (Collapsible) */}
          <div className="mt-12 pt-8 border-t border-border/10 mb-10">
            <button 
              onClick={() => setIsMemoriesOpen(!isMemoriesOpen)}
              className="group flex items-center justify-between w-full p-5 bg-foreground/5 hover:bg-foreground/10 rounded-3xl transition-all duration-300 border border-border/5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-display font-bold text-xl text-foreground">Etkinlik Anıları</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-0.5">Medya arşivi ve fotoğraflar</p>
                </div>
              </div>
              <div className={`p-2 rounded-full bg-background/50 transition-transform duration-500 ${isMemoriesOpen ? "rotate-180" : ""}`}>
                <ChevronDown className="w-5 h-5 text-foreground/60" />
              </div>
            </button>
            
            <AnimatePresence>
              {isMemoriesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="pt-6">
                    <EventMemories 
                      eventId={event.id} 
                      isAttendee={myRsvp?.status === "attending"} 
                      eventDate={event.date}
                      eventTitle={event.title}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
};

export default EventDetailPage;
