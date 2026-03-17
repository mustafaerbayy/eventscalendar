import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import SocialFeed from "@/components/SocialFeed";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Rss,
    Sparkles,
    MessageCircle,
    Heart,
    BarChart2,
    AlertCircle,
    ArrowRight,
    Loader2,
    X
} from "lucide-react";

const Social = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const { data: socialProfile, isLoading } = useQuery({
        queryKey: ["social_profile_check", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from("social_profiles")
                .select("job_title, university")
                .eq("user_id", user.id)
                .single();
            if (error) return null;
            return data;
        },
        enabled: !!user?.id,
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl text-center">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                <Rss className="w-8 h-8 text-primary" />
                            </div>
                            <div className="absolute -top-1 -right-1">
                                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Fikir Meydanı'na Hoş Geldiniz</h1>
                        <p className="text-gray-500 mb-8 leading-relaxed text-sm">
                            Paylaşımları görmek, topluluğumuzla etkileşim kurmak ve kendi anılarınızı paylaşmak için giriş yapmanız gerekmektedir.
                        </p>

                        <div className="space-y-3">
                            <Button
                                onClick={() => navigate("/giris", { state: { from: location.pathname } })}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-base shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
                            >
                                Giriş Yap
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate("/kayit", { state: { from: location.pathname } })}
                                className="w-full border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold h-12 rounded-xl"
                            >
                                Yeni Hesap Oluştur
                            </Button>
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-6">
                            <div className="flex flex-col items-center gap-1">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Yorum Yap</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Heart className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Beğen</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <BarChart2 className="w-4 h-4 text-purple-600" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Anketler</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const [isWarningDismissed, setIsWarningDismissed] = React.useState(false);
    const isProfileIncomplete = socialProfile && (!socialProfile.job_title || !socialProfile.university);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 flex flex-col overflow-x-hidden">
            <Navbar />
            <main className="flex-1 container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 mt-20">
                {isProfileIncomplete && !isWarningDismissed && (
                    <div className="mb-6 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-amber-200 shadow-xl relative animate-in fade-in slide-in-from-top-4 duration-500 group">
                        <button 
                            onClick={() => setIsWarningDismissed(true)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 rounded-xl"
                            title="Kapat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                                <AlertCircle className="w-7 h-7 text-amber-500" />
                            </div>
                            
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Profilinizi Tamamlayın</h2>
                            <p className="text-gray-500 mb-6 text-sm leading-relaxed max-w-[280px]">
                                Lütfen Fikir Meydanı profilinizdeki eksik bilgileri doldurunuz.
                            </p>
                            
                            <Button
                                onClick={() => navigate("/profil?tab=social")}
                                className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                            >
                                Fikir Meydanı Profili'ne Git
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
                <SocialFeed />
            </main>
        </div>
    );
};

export default Social;
