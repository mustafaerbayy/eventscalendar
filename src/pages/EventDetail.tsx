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
import { Calendar, Clock, MapPin, Users, UserCheck, UserX, Info, AlertCircle } from "lucide-react";
import { formatTurkishDate, formatTurkishTime } from "@/lib/date-utils";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { EventMemories } from "@/components/EventMemories";

interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue_name: string;
  cities: { name: string } | null;
  categories: { name: string } | null;
  venues: { name: string } | null;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [rsvps, setRsvps] = useState<RsvpWithProfile[]>([]);
  const [myRsvp, setMyRsvp] = useState<{ status: string; guest_count: number } | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    const [eventRes, rsvpRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, cities(name), categories(name), venues(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("rsvps")
        .select("*, profiles(first_name, last_name)")
        .eq("event_id", id),
    ]);
    setEvent(eventRes.data as unknown as EventDetail);
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
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{[event.venue_name || event.venues?.name, event.cities?.name].filter(Boolean).join(", ")}</span>
            </div>
          </div>

          {event.description && (
            <p className="mt-6 text-foreground/80 leading-relaxed">{event.description}</p>
          )}

          {/* RSVP Section */}
          <Card className="mt-8 border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Katılım Durumu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{totalAttendees}</p>
                  <p className="text-xs text-muted-foreground">Toplam Katılımcı</p>
                </div>
                <div className="text-center border-l border-r border-border">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{attendingRsvps.length}</p>
                  <p className="text-xs text-muted-foreground">Katılıyor</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <UserX className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-2xl font-bold text-destructive">{notAttendingRsvps.length}</p>
                  <p className="text-xs text-muted-foreground">Katılmıyor</p>
                </div>
              </div>

              {/* RSVP Actions */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant={myRsvp?.status === "attending" ? "default" : "outline"}
                    onClick={() => handleRsvp("attending")}
                    className="px-6"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Katılıyorum
                  </Button>
                  <Button
                    variant={myRsvp?.status === "not_attending" ? "destructive" : "outline"}
                    onClick={() => handleRsvp("not_attending")}
                    className="px-6"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Katılmıyorum
                  </Button>
                </div>

                {/* Guest Count Section */}
                {myRsvp?.status === "attending" && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3">
                          Misafir Ekleme
                        </p>
                        <div className="flex items-center gap-2">
                          <label htmlFor="guest-count" className="text-sm font-medium text-foreground">
                            Misafir Sayısı:
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Buradan sizinle beraber gelecek misafir sayısını belirtebilirsiniz</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Input
                            id="guest-count"
                            type="number"
                            min={0}
                            value={guestCount}
                            onChange={(e) => updateGuestCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-24 h-9"
                          />
                          <span className="text-sm text-muted-foreground ml-1">kişi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance List */}
          <Card className="mt-6 border-l-4 border-l-green-600">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                Katılımcı Listesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rsvps.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Henüz katılım kaydı yok.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Attending Section */}
                  {attendingRsvps.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Katılıyor ({attendingRsvps.length})
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-50 dark:bg-green-950/30">
                            <TableHead className="text-green-900 dark:text-green-300">Ad Soyad</TableHead>
                            <TableHead className="text-center text-green-900 dark:text-green-300">Durumu</TableHead>
                            <TableHead className="text-right text-green-900 dark:text-green-300">+Misafir</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendingRsvps.map((r) => (
                            <TableRow key={r.id} className="border-b border-green-100 dark:border-green-900/20 hover:bg-green-50/50 dark:hover:bg-green-950/20">
                              <TableCell className="font-medium">{r.profiles?.first_name} {r.profiles?.last_name}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                  Katılıyor
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{r.guest_count > 0 ? `+${r.guest_count}` : "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Not Attending Section */}
                  {notAttendingRsvps.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        Katılmıyor ({notAttendingRsvps.length})
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-red-50 dark:bg-red-950/30">
                            <TableHead className="text-destructive">Ad Soyad</TableHead>
                            <TableHead className="text-center text-destructive">Durumu</TableHead>
                            <TableHead className="text-right text-destructive">Misafir</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notAttendingRsvps.map((r) => (
                            <TableRow key={r.id} className="border-b border-red-100 dark:border-red-900/20 hover:bg-red-50/50 dark:hover:bg-red-950/20 opacity-75">
                              <TableCell className="font-medium">{r.profiles?.first_name} {r.profiles?.last_name}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="bg-red-100 text-destructive hover:bg-red-200">
                                  Katılmıyor
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media Archive Section */}
          <EventMemories 
            eventId={event.id} 
            isAttendee={myRsvp?.status === "attending"} 
            eventDate={event.date}
          />

        </div>

      </div>
    </div>
  );
};

export default EventDetailPage;
