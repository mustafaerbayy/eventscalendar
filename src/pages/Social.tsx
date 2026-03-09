import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import SocialProfileForm from "@/components/SocialProfileForm";
import SocialFeed from "@/components/SocialFeed";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
    Rss,
    UserCircle,
    Settings,
    Loader2,
    MoreHorizontal,
    Pencil,
    Trash2,
    Check,
    ImageIcon,
    Calendar,
    FileText,
    BarChart2,
    Sparkles,
    TrendingUp,
    Heart,
} from "lucide-react";

const Social = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"feed" | "profile">("feed");
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    // Fetch current user's social profile
    const { data: myProfile, isLoading: profileLoading } = useQuery({
        queryKey: ["my_social_profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from("social_profiles")
                .select("*")
                .eq("user_id", user.id as string)
                .single();
            if (error && error.code !== "PGRST116") throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    // Fetch current user's posts
    const { data: myPosts, isLoading: postsLoading } = useQuery({
        queryKey: ["my_posts", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from("posts")
                .select("*")
                .eq("user_id", user.id as string)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    // Edit post mutation
    const editPostMutation = useMutation({
        mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
            const { error } = await supabase
                .from("posts")
                .update({ content })
                .eq("id", postId);
            if (error) throw error;
        },
        onSuccess: () => {
            setEditingPostId(null);
            setEditContent("");
            toast.success("Gönderi düzenlendi.");
            queryClient.invalidateQueries({ queryKey: ["my_posts"] });
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
        },
        onError: (error) => {
            toast.error("Düzenleme başarısız: " + error.message);
        },
    });

    // Delete post mutation
    const deletePostMutation = useMutation({
        mutationFn: async (postId: string) => {
            const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", postId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Gönderi silindi.");
            queryClient.invalidateQueries({ queryKey: ["my_posts"] });
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
        },
        onError: (error) => {
            toast.error("Silme başarısız: " + error.message);
        },
    });

    const handleDeletePost = (postId: string) => {
        if (window.confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) {
            deletePostMutation.mutate(postId);
        }
    };

    const handleSaveEdit = (postId: string) => {
        if (!editContent.trim()) {
            toast.error("Gönderi içeriği boş olamaz.");
            return;
        }
        editPostMutation.mutate({ postId, content: editContent.trim() });
    };

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    const calculateAge = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const timeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "az önce";
        if (diffMins < 60) return `${diffMins}dk`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}sa`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}g`;
        return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 flex flex-col">
            <Navbar />
            <main className="flex-1 container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 mt-20">

                {/* Premium Tab Navigation */}
                <div className="relative mb-5 sm:mb-6">
                    <div className="flex bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] p-1.5 gap-1">
                        <button
                            onClick={() => setActiveTab("feed")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "feed"
                                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <Rss className="w-4 h-4" />
                            <span>Akış</span>
                            {activeTab === "feed" && <Sparkles className="w-3 h-3 opacity-70" />}
                        </button>
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "profile"
                                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <UserCircle className="w-4 h-4" />
                            <span>Profilim</span>
                        </button>
                    </div>
                </div>

                {/* ══════ FEED TAB ══════ */}
                {activeTab === "feed" && <SocialFeed />}

                {/* ══════ PROFILE TAB ══════ */}
                {activeTab === "profile" && (
                    <div className="space-y-5">
                        {/* Profile Card — Premium Glass Design */}
                        <div className="relative rounded-3xl overflow-hidden bg-white border border-white/60 shadow-[0_4px_30px_-6px_rgba(0,0,0,0.08)]">
                            {/* Gradient Banner */}
                            <div className="h-28 sm:h-32 bg-gradient-to-br from-primary/30 via-primary/15 to-emerald-200/40 relative">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
                            </div>

                            {/* Profile Info */}
                            <div className="px-5 sm:px-6 pb-6 -mt-12 relative z-10">
                                <div className="flex items-end justify-between mb-4">
                                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white shadow-xl ring-2 ring-primary/10">
                                        <AvatarImage src={myProfile?.profile_photo || ""} alt={myProfile?.social_name} />
                                        <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold">
                                            {getInitials(myProfile?.social_name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl gap-1.5 text-xs font-semibold border-gray-200 hover:border-primary/30 hover:text-primary bg-white/80 backdrop-blur-sm shadow-sm"
                                            >
                                                <Settings className="w-3.5 h-3.5" />
                                                Profili Düzenle
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Sosyal Profili Düzenle</DialogTitle>
                                            </DialogHeader>
                                            <SocialProfileForm />
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                                    {myProfile?.social_name || "İsimsiz Kullanıcı"}
                                </h2>

                                {myProfile?.job_title && (
                                    <p className="text-sm text-primary/70 font-medium mt-0.5">{myProfile.job_title}</p>
                                )}


                                {myProfile?.bio && (
                                    <p className="text-sm text-gray-600 mt-3 leading-relaxed">{myProfile.bio}</p>
                                )}

                                <div className="flex items-center gap-3 mt-4 flex-wrap">
                                    {calculateAge(myProfile?.birth_date) !== null && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-xs text-gray-500 font-medium">
                                            <Heart className="w-3 h-3 text-red-400" />
                                            {calculateAge(myProfile?.birth_date)} yaşında
                                        </span>
                                    )}
                                    {myProfile?.created_at && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-xs text-gray-500 font-medium">
                                            <Calendar className="w-3 h-3 text-primary/60" />
                                            {new Date(myProfile.created_at).toLocaleDateString("tr-TR", {
                                                month: "long",
                                                year: "numeric",
                                            })}{" "}tarihinden beri üye
                                        </span>
                                    )}
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 leading-none">{myPosts?.length || 0}</p>
                                            <p className="text-[11px] text-gray-400 font-medium">Gönderi</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* My Posts Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Paylaşımlarım
                                </h3>
                                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">{myPosts?.length || 0} gönderi</span>
                            </div>

                            {postsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : myPosts?.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm bg-white/60 backdrop-blur-sm rounded-2xl border border-dashed border-gray-200">
                                    <Rss className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Henüz paylaşım yapmadınız.</p>
                                    <p className="text-xs mt-1 text-gray-300">Akış sekmesinden ilk gönderinizi paylaşın!</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {myPosts?.map((post) => (
                                        <div
                                            key={post.id}
                                            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-3.5 sm:p-4 hover:shadow-md hover:border-gray-200/80 transition-all duration-200 group"
                                        >
                                            {/* Post Header */}
                                            <div className="flex items-center justify-between mb-2.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {timeAgo(post.created_at)}
                                                    </span>
                                                    {post.image_url && (
                                                        <span className="inline-flex items-center text-[10px] text-blue-500 gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium">
                                                            <ImageIcon className="w-2.5 h-2.5" /> Görsel
                                                        </span>
                                                    )}
                                                    {post.poll_data && (
                                                        <span className="inline-flex items-center text-[10px] text-purple-500 gap-0.5 bg-purple-50 px-1.5 py-0.5 rounded-md font-medium">
                                                            <BarChart2 className="w-2.5 h-2.5" /> Anket
                                                        </span>
                                                    )}
                                                    {post.linked_event_id && (
                                                        <span className="inline-flex items-center text-[10px] text-orange-500 gap-0.5 bg-orange-50 px-1.5 py-0.5 rounded-md font-medium">
                                                            <Calendar className="w-2.5 h-2.5" /> Etkinlik
                                                        </span>
                                                    )}
                                                    {post.linked_report_id && (
                                                        <span className="inline-flex items-center text-[10px] text-emerald-500 gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium">
                                                            <FileText className="w-2.5 h-2.5" /> Rapor
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-36 rounded-xl">
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingPostId(post.id);
                                                                setEditContent(post.content);
                                                            }}
                                                            className="gap-2 text-sm cursor-pointer rounded-lg"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeletePost(post.id)}
                                                            className="gap-2 text-sm text-red-500 focus:text-red-500 cursor-pointer rounded-lg"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Sil
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Post Content - inline edit or display */}
                                            {editingPostId === post.id ? (
                                                <div className="space-y-2.5">
                                                    <Textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="resize-none min-h-[60px] text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-gray-500 rounded-lg"
                                                            onClick={() => {
                                                                setEditingPostId(null);
                                                                setEditContent("");
                                                            }}
                                                        >
                                                            İptal
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs gap-1 rounded-lg shadow-sm"
                                                            onClick={() => handleSaveEdit(post.id)}
                                                            disabled={editPostMutation.isPending}
                                                        >
                                                            {editPostMutation.isPending ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Check className="w-3 h-3" />
                                                            )}
                                                            Kaydet
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                                                    {post.content}
                                                </p>
                                            )}

                                            {/* Image thumbnail */}
                                            {post.image_url && editingPostId !== post.id && (
                                                <div className="mt-2.5 rounded-xl overflow-hidden max-h-32 border border-gray-100">
                                                    <img
                                                        src={post.image_url}
                                                        alt=""
                                                        className="w-full h-full object-cover max-h-32"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Social;
