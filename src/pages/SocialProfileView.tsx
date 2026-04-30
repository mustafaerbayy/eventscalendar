import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Briefcase, Calendar, User, ArrowLeft, GraduationCap, Linkedin } from "lucide-react";

export default function SocialProfileView() {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const isOwnProfile = currentUser?.id === id;

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ["social_profile_public", id],
        queryFn: async () => {
            if (!id) throw new Error("ID eksik");

            const { data: socialData, error: socialError } = await supabase
                .from("social_profiles")
                .select("*")
                .eq("user_id", id)
                .single();

            if (socialError) throw socialError;

            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", id)
                .single();

            if (profileError) throw profileError;

            return {
                ...socialData,
                full_name: `${profileData?.first_name || ""} ${profileData?.last_name || ""}`.trim() || "Gizli Kullanıcı"
            };
        },
        enabled: !!id,
    });

    const calculateAge = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background dark:bg-[#050505] selection:bg-primary/30 flex flex-col">
                <Navbar />
                <main className="flex-1 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-background dark:bg-[#050505] selection:bg-primary/30 flex flex-col">
                <Navbar />
                <main className="flex-1 container max-w-4xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Profil Bulunamadı</h2>
                        <p className="text-muted-foreground mb-6">Aradığınız kullanıcı profili mevcut değil veya silinmiş olabilir.</p>
                        <Button onClick={() => navigate("/sosyal")} variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Fikir Meydanı'na Dön
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    const age = calculateAge(profile.birth_date);

    return (
        <div className="min-h-screen bg-background dark:bg-[#050505] selection:bg-primary/30 flex flex-col overflow-x-hidden">
            <Navbar />

            {/* Profil Header / Banner Alanı */}
            <div className="bg-primary/5 border-b border-primary/10 mt-16 pt-12 pb-24">
                {/* Opsiyonel: Cover fotoğrafı eklenebilir. Şu an sadece renkli bir arka plan. */}
            </div>

            <main className="flex-1 container max-w-4xl mx-auto px-4 pb-12 -mt-20">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/sosyal")}
                    className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Geri
                </Button>

                <Card className="w-full shadow-md border-border overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                            {/* Sol Kolon: Fotoğraf & Temel Bilgiler */}
                            <div className="bg-card/90 dark:bg-card/60 backdrop-blur-md p-8 md:w-1/3 flex flex-col items-center text-center border-r border-border">
                                <Avatar className="h-32 w-32 mb-4 border-4 border-background shadow-lg ring-1 ring-gray-100">
                                    <AvatarImage src={profile.profile_photo || ""} alt={profile.full_name} />
                                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                        {getInitials(profile.full_name)}
                                    </AvatarFallback>
                                </Avatar>

                                <h1 className="text-2xl font-bold text-foreground mb-1">{profile.full_name}</h1>

                                {profile.job_title && (
                                    <p className="flex items-center text-muted-foreground mb-4 justify-center">
                                        <Briefcase className="h-4 w-4 mr-2" />
                                        {profile.job_title}
                                    </p>
                                )}

                                <div className="flex gap-4 mt-2 w-full">
                                    {!isOwnProfile ? (
                                        <Button className="w-full">Takip Et</Button>
                                    ) : (
                                        <Button variant="outline" className="w-full" onClick={() => navigate("/profil?tab=social")}>Profili Düzenle</Button>
                                    )}
                                </div>
                            </div>

                            {/* Sağ Kolon: İletişim, Hakkında vs. */}
                            <div className="bg-background dark:bg-[#050505] selection:bg-primary/30/50 p-8 md:w-2/3">
                                <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
                                    Hakkında
                                </h3>

                                <div className="space-y-6">
                                    {profile.bio ? (
                                        <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                            {profile.bio}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground/70 italic">Kullanıcı henüz bir biyografi eklemedi.</p>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-6 border-t border-border">
                                        {age !== null && (
                                            <div className="flex items-center text-muted-foreground">
                                                <Calendar className="h-5 w-5 mr-3 text-primary/60" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Yaş</p>
                                                    <p>{age}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center text-muted-foreground">
                                            <User className="h-5 w-5 mr-3 text-primary/60" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Katılım Tarihi</p>
                                                <p>{new Date(profile.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</p>
                                            </div>
                                        </div>

                                        {profile.university && (
                                            <div className="flex items-center text-muted-foreground">
                                                <GraduationCap className="h-5 w-5 mr-3 text-primary/60" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Üniversite</p>
                                                    <p>{profile.university}</p>
                                                </div>
                                            </div>
                                        )}
                                        {profile.linkedin_url && (
                                            <div className="flex items-center gap-3 p-4 bg-card/90 dark:bg-card/60 backdrop-blur-md rounded-[1.25rem] border border-border shadow-sm hover:border-blue-200 transition-colors group">
                                                <div className="bg-blue-50 p-2 rounded-xl group-hover:bg-blue-100 transition-colors">
                                                    <Linkedin className="h-5 w-5 text-[#0077B5]" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-bold mb-0.5">Linkedin</p>
                                                    <a
                                                        href={profile.linkedin_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-[#0077B5] hover:underline flex items-center gap-1"
                                                    >
                                                        Profilime Git
                                                        <span className="text-xs">↗</span>
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
