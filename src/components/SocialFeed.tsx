import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Search, Loader2, Send, Image as ImageIcon, X, FileText, Calendar, Link as LinkIcon, BarChart2, Plus, Trash2, MoreHorizontal, Pencil, Check, MessageCircle, ChevronDown, ChevronUp, Heart, Smile, Reply } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MentionTextarea } from "./MentionTextarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function PollVotersList({ voterIds }: { voterIds: string[] }) {
    const navigate = useNavigate();

    const { data: voters, isLoading } = useQuery({
        queryKey: ["poll_voters", voterIds],
        queryFn: async () => {
            if (!voterIds || voterIds.length === 0) return [];

            const [
                { data: mainProfiles, error: mainProfileError },
                { data: socialProfiles, error: socialProfileError }
            ] = await Promise.all([
                supabase.from("profiles").select("id, first_name, last_name").in("id", voterIds),
                supabase.from("social_profiles").select("user_id, profile_photo").in("user_id", voterIds)
            ]);

            if (mainProfileError) throw mainProfileError;

            // Merge
            const profileMap = new Map();
            (mainProfiles || []).forEach(p => {
                profileMap.set(p.id, {
                    social_name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Gizli Kullanıcı",
                });
            });
            (socialProfiles || []).forEach(sp => {
                const existing = profileMap.get(sp.user_id) || {};
                profileMap.set(sp.user_id, { ...existing, profile_photo: sp.profile_photo });
            });

            return Array.from(profileMap.values());
        },
        enabled: voterIds.length > 0
    });

    if (voterIds.length === 0) {
        return <div className="text-center py-4 text-sm text-gray-500">Henüz kimse oy kullanmadı.</div>;
    }

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex flex-col gap-3 py-2">
            {voters?.map((voter) => (
                <div key={voter.user_id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                    <Avatar
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => navigate(`/sosyal/profil/${voter.user_id}`)}
                    >
                        <AvatarImage src={voter.profile_photo || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {voter.social_name?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span
                        className="text-sm font-medium text-gray-800 cursor-pointer hover:underline"
                        onClick={() => navigate(`/sosyal/profil/${voter.user_id}`)}
                    >
                        {voter.social_name || "Gizli Kullanıcı"}
                    </span>
                </div>
            ))}
        </div>
    );
}

import { compressImage } from "@/lib/image-utils";
import { generateUUID } from "@/lib/uuid";

// --- Reaction & Like Sub-Components ---

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '🔥', '😮', '👏'];

// Helper: shows a list of reactor names fetched from social_profiles
function ReactorsList({ userIds }: { userIds: string[] }) {
    const { data: profiles } = useQuery({
        queryKey: ["reactor_profiles", ...userIds],
        queryFn: async () => {
            if (userIds.length === 0) return [];

            const [
                { data: mainProfiles, error: mainProfileError },
                { data: socialProfiles, error: socialProfileError }
            ] = await Promise.all([
                supabase.from("profiles").select("id, first_name, last_name").in("id", userIds),
                supabase.from("social_profiles").select("user_id, profile_photo").in("user_id", userIds)
            ]);

            if (mainProfileError) throw mainProfileError;

            // Merge
            const profileMap = new Map();
            (mainProfiles || []).forEach(p => {
                profileMap.set(p.id, {
                    user_id: p.id,
                    social_name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Gizli Kullanıcı",
                });
            });
            (socialProfiles || []).forEach(sp => {
                const existing = profileMap.get(sp.user_id) || {};
                profileMap.set(sp.user_id, { ...existing, profile_photo: sp.profile_photo });
            });

            return Array.from(profileMap.values());
        },
        enabled: userIds.length > 0,
    });

    if (!profiles || profiles.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {profiles.map(p => (
                <div key={p.user_id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                    <Avatar className="h-4 w-4">
                        <AvatarImage src={p.profile_photo || undefined} />
                        <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                            {(p.social_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-gray-600 font-medium">{p.social_name || "Anonim"}</span>
                </div>
            ))}
        </div>
    );
}

function PostReactions({ postId }: { postId: string }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showPicker, setShowPicker] = useState(false);
    const [showReactors, setShowReactors] = useState(false);

    const { data: reactions } = useQuery({
        queryKey: ["post_reactions", postId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("post_reactions")
                .select("*")
                .eq("post_id", postId);
            if (error) throw error;
            return data || [];
        },
    });

    const toggleReaction = useMutation({
        mutationFn: async (emoji: string) => {
            if (!user) throw new Error("Giriş yapmalısınız");
            // Find user's existing reaction (any emoji)
            const existingAny = reactions?.find(r => r.user_id === user.id);

            if (existingAny && existingAny.emoji === emoji) {
                // Same emoji → remove (toggle off)
                const { error } = await supabase.from("post_reactions").delete().eq("id", existingAny.id);
                if (error) throw error;
            } else if (existingAny) {
                // Different emoji → replace
                await supabase.from("post_reactions").delete().eq("id", existingAny.id);
                const { error } = await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, emoji });
                if (error) throw error;
            } else {
                // No reaction yet → insert
                const { error } = await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, emoji });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["post_reactions", postId] });
        },
    });

    // Group reactions by emoji
    const grouped = (reactions || []).reduce((acc: Record<string, string[]>, r) => {
        if (!acc[r.emoji]) acc[r.emoji] = [];
        acc[r.emoji].push(r.user_id);
        return acc;
    }, {});

    const totalReactions = reactions?.length || 0;
    const userReaction = user ? reactions?.find(r => r.user_id === user.id)?.emoji : null;

    return (
        <div className="px-4 py-1.5 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
                {/* Existing reactions */}
                {Object.entries(grouped).map(([emoji, userIds]) => {
                    const hasReacted = emoji === userReaction;
                    return (
                        <button
                            key={emoji}
                            onClick={() => toggleReaction.mutate(emoji)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${hasReacted
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-sm scale-105'
                                : 'bg-gray-50 border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                        >
                            <span className="text-sm leading-none">{emoji}</span>
                            <span className="tabular-nums">{userIds.length}</span>
                        </button>
                    );
                })}

                {/* Add reaction button */}
                {user && (
                    <div className="relative">
                        <button
                            onClick={() => setShowPicker(p => !p)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-all shadow-sm group ${userReaction
                                ? 'bg-primary/5 border-primary/20 text-primary/60 hover:text-primary hover:border-primary/40'
                                : 'bg-white border-gray-100 text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5'
                                }`}
                            title="Emoji Ekle"
                        >
                            <Smile className="w-4 h-4 transition-transform group-hover:scale-110" />
                        </button>
                        {showPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                                <div className="absolute bottom-full left-0 mb-1.5 flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 z-50">
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                toggleReaction.mutate(emoji);
                                                setShowPicker(false);
                                            }}
                                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all text-lg ${emoji === userReaction
                                                ? 'bg-primary/10 ring-2 ring-primary/30 scale-110'
                                                : 'hover:bg-gray-100 hover:scale-110'
                                                }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Show reactors toggle */}
                {totalReactions > 0 && (
                    <button
                        onClick={() => setShowReactors(p => !p)}
                        className="text-[10px] text-gray-400 hover:text-primary font-medium ml-1 transition-colors"
                    >
                        {showReactors ? 'Gizle' : `${totalReactions} kişi`}
                        {showReactors ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />}
                    </button>
                )}
            </div>

            {/* Collapsible reactors list */}
            {showReactors && totalReactions > 0 && (
                <div className="bg-gray-50/60 rounded-xl border border-gray-100 p-2.5 space-y-2">
                    {Object.entries(grouped).map(([emoji, userIds]) => (
                        <div key={emoji}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-sm">{emoji}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{userIds.length} kişi</span>
                            </div>
                            <ReactorsList userIds={userIds} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CommentLikeButton({ commentId }: { commentId: string }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showPicker, setShowPicker] = useState(false);
    const [showLikers, setShowLikers] = useState(false);

    const { data } = useQuery({
        queryKey: ["comment_likes", commentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("comment_likes")
                .select("*")
                .eq("comment_id", commentId);
            if (error) throw error;
            return data || [];
        },
    });

    const toggleReaction = useMutation({
        mutationFn: async (emoji: string) => {
            if (!user) return;
            const existingAny = data?.find(l => l.user_id === user.id);

            if (existingAny && existingAny.emoji === emoji) {
                // Same emoji → toggle off
                const { error } = await supabase.from("comment_likes").delete().eq("id", existingAny.id);
                if (error) throw error;
            } else if (existingAny) {
                // Different emoji → replace
                await supabase.from("comment_likes").delete().eq("id", existingAny.id);
                const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id, emoji });
                if (error) throw error;
            } else {
                // No reaction → insert
                const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id, emoji });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comment_likes", commentId] });
        },
    });

    const count = data?.length || 0;
    const userReaction = user ? data?.find(l => l.user_id === user.id)?.emoji : null;

    // Group by emoji
    const grouped = (data || []).reduce((acc: Record<string, string[]>, r) => {
        const emoji = r.emoji || '❤️';
        if (!acc[emoji]) acc[emoji] = [];
        acc[emoji].push(r.user_id);
        return acc;
    }, {});

    return (
        <div className="relative">
            <div className="flex items-center gap-1.5 flex-wrap">
                {/* Show existing grouped emojis */}
                {Object.entries(grouped).map(([emoji, userIds]) => (
                    <button
                        key={emoji}
                        onClick={() => toggleReaction.mutate(emoji)}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-all ${emoji === userReaction
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-xs leading-none">{emoji}</span>
                        <span className="tabular-nums">{(userIds as string[]).length}</span>
                    </button>
                ))}

                {/* Add emoji button */}
                {user && (
                    <div className="relative inline-block">
                        <button
                            onClick={() => setShowPicker(p => !p)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-primary font-medium transition-colors"
                        >
                            <Smile className="w-3 h-3" />
                        </button>
                        {showPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                                <div className="absolute bottom-full left-0 mb-1 flex items-center gap-px bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-50">
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                toggleReaction.mutate(emoji);
                                                setShowPicker(false);
                                            }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all text-sm ${emoji === userReaction ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* View who reacted */}
                {count > 0 && (
                    <button
                        onClick={() => setShowLikers(p => !p)}
                        className="text-[9px] text-gray-400 hover:text-primary font-medium ml-0.5 transition-colors"
                    >
                        {showLikers ? 'Gizle' : `${count}`}
                    </button>
                )}
            </div>

            {/* Collapsible likers */}
            {showLikers && count > 0 && (
                <div className="mt-1.5 bg-gray-50/60 rounded-lg border border-gray-100 p-2 space-y-1">
                    {Object.entries(grouped).map(([emoji, userIds]) => (
                        <div key={emoji} className="flex items-start gap-1.5">
                            <span className="text-xs mt-0.5">{emoji}</span>
                            <ReactorsList userIds={userIds as string[]} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


const renderContent = (content: string, navigate: (path: string) => void) => {
    if (!content) return null;

    // Regex to match @[Name](uuid)
    const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
        // Text before the match
        if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
        }

        const name = match[1];
        const id = match[2];

        parts.push(
            <span
                key={`${id}-${match.index}`}
                className="text-primary font-bold cursor-pointer hover:underline"
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sosyal/profil/${id}`);
                }}
            >
                @{name}
            </span>
        );

        lastIndex = mentionRegex.lastIndex;
    }

    // Remaining text
    if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
};


// --- Comment Sub-Components ---

function CommentsCount({ postId }: { postId: string }) {
    const { data: count } = useQuery({
        queryKey: ["comment_count", postId],
        queryFn: async () => {
            const { count, error } = await supabase
                .from("post_comments")
                .select("*", { count: "exact", head: true })
                .eq("post_id", postId);
            if (error) throw error;
            return count || 0;
        },
    });
    return <span>{count ?? 0} Yorum</span>;
}

function CommentsSection({ postId, onReplyClick }: { postId: string, onReplyClick?: (commentId: string, authorName: string, content: string) => void }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = user?.email === "admin@admin.com";
    const queryClient = useQueryClient();
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState("");
    const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<string | null>(null);

    const { data: comments, isLoading } = useQuery({
        queryKey: ["post_comments", postId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("post_comments")
                .select("*")
                .eq("post_id", postId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            if (!data || data.length === 0) return [];

            // Fetch profiles and social profiles for comment authors
            const uniqueUserIds = [...new Set(data.map(c => c.user_id))];

            const [
                { data: mainProfiles, error: mainProfileError },
                { data: socialProfiles, error: socialProfileError }
            ] = await Promise.all([
                supabase.from("profiles").select("id, first_name, last_name").in("id", uniqueUserIds),
                supabase.from("social_profiles").select("user_id, profile_photo").in("user_id", uniqueUserIds)
            ]);

            if (mainProfileError) console.error("Error fetching main profiles:", mainProfileError);

            // Merge
            const profileMap = new Map();
            (mainProfiles || []).forEach(p => {
                profileMap.set(p.id, {
                    social_name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Gizli Kullanıcı",
                });
            });
            (socialProfiles || []).forEach(sp => {
                const existing = profileMap.get(sp.user_id) || {};
                profileMap.set(sp.user_id, { ...existing, profile_photo: sp.profile_photo });
            });

            return data.map(comment => ({
                ...comment,
                profile: profileMap.get(comment.user_id) || null,
            }));
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            const { error } = await supabase
                .from("post_comments")
                .delete()
                .eq("id", commentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["post_comments", postId] });
            queryClient.invalidateQueries({ queryKey: ["comment_count", postId] });
        },
    });

    const updateCommentMutation = useMutation({
        mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
            const { error } = await supabase
                .from("post_comments")
                .update({ content })
                .eq("id", commentId);
            if (error) throw error;
        },
        onSuccess: () => {
            setEditingCommentId(null);
            setEditCommentText("");
            queryClient.invalidateQueries({ queryKey: ["post_comments", postId] });
        },
    });

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

    const getInitials = (name?: string) => {
        if (!name) return "?";
        return name.slice(0, 2).toUpperCase();
    };


    if (isLoading) {
        return (
            <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!comments || comments.length === 0) {
        return (
            <div className="text-center py-3 text-xs text-gray-400">
                Henüz yorum yok. İlk yorumu sen yaz!
            </div>
        );
    }

    return (
        <>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {comments.map((comment: any) => {
                    const isEditing = editingCommentId === comment.id;
                    const isOwner = user?.id === comment.user_id;

                    return (
                        <div key={comment.id} className="flex gap-2 group/comment">
                            <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                                <AvatarImage src={comment.profile?.profile_photo || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] font-bold">
                                    {getInitials(comment.profile?.social_name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="bg-gray-50/80 rounded-xl px-3 py-2 border border-gray-100/60">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-bold text-gray-700 truncate">
                                            {comment.profile?.social_name || 'Anonim'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 shrink-0">
                                            {timeAgo(comment.created_at)}
                                        </span>
                                    </div>

                                    {/* Quoted Comment Preview */}
                                    {comment.reply_to_comment_id && comments.find((c: any) => c.id === comment.reply_to_comment_id) && (() => {
                                        const quoted = comments.find((c: any) => c.id === comment.reply_to_comment_id);
                                        return (
                                            <div className="bg-white/60 border border-gray-100 rounded-lg p-2 mt-1 mb-2 text-[11px] text-gray-500 border-l-2 border-l-primary/40">
                                                <div className="font-semibold text-gray-600 flex items-center gap-1 mb-0.5">
                                                    <MessageCircle className="w-3 h-3 text-primary/40" />
                                                    {quoted?.profile?.social_name || 'Anonim'}
                                                </div>
                                                <div className="line-clamp-2">
                                                    {renderContent(quoted?.content, navigate)}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {isEditing ? (
                                        <div className="flex flex-col gap-1.5 mt-1">
                                            <MentionTextarea
                                                value={editCommentText}
                                                onChange={(val) => setEditCommentText(val)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey && editCommentText.trim()) {
                                                        updateCommentMutation.mutate({ commentId: comment.id, content: editCommentText.trim() });
                                                    } else if (e.key === 'Escape') {
                                                        setEditingCommentId(null);
                                                        setEditCommentText("");
                                                    }
                                                }}
                                                className="flex-1 bg-white border border-primary/30 rounded-lg px-2 py-1 text-[13px] text-gray-700 outline-none focus:border-primary/50 min-h-[40px]"
                                            />
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        if (editCommentText.trim()) {
                                                            updateCommentMutation.mutate({ commentId: comment.id, content: editCommentText.trim() });
                                                        }
                                                    }}
                                                    disabled={!editCommentText.trim() || updateCommentMutation.isPending}
                                                    className="text-primary hover:text-primary/80 disabled:text-gray-300 p-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingCommentId(null); setEditCommentText(""); }}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[13px] text-gray-600 leading-relaxed break-words">
                                            {renderContent(comment.content, navigate)}
                                        </p>
                                    )}
                                </div>
                                {!isEditing && (
                                    <div className="flex items-center gap-3 mt-1 ml-3">
                                        <CommentLikeButton commentId={comment.id} />
                                        <button
                                            onClick={() => onReplyClick && onReplyClick(comment.id, comment.profile?.social_name || 'Anonim', comment.content)}
                                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition-colors py-0.5 px-1 -mx-1 rounded"
                                        >
                                            <Reply className="w-3.5 h-3.5" />
                                            Cevapla
                                        </button>
                                        {isOwner && (
                                            <button
                                                onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}
                                                className="text-[11px] text-gray-400 hover:text-primary transition-colors py-0.5 px-1 -mx-1 rounded"
                                            >
                                                Düzenle
                                            </button>
                                        )}
                                        {(isOwner || isSuperAdmin) && (
                                            <button
                                                onClick={() => setDeleteConfirmCommentId(comment.id)}
                                                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors py-0.5 px-1 -mx-1 rounded"
                                            >
                                                Sil
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Comment Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmCommentId} onOpenChange={(open) => { if (!open) setDeleteConfirmCommentId(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Yorumu Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu yorumu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600 rounded-xl"
                            onClick={() => {
                                if (deleteConfirmCommentId) {
                                    deleteCommentMutation.mutate(deleteConfirmCommentId);
                                    setDeleteConfirmCommentId(null);
                                }
                            }}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function SocialFeed() {
    const { user, profile } = useAuth();
    const isSuperAdmin = user?.email === "admin@admin.com";
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newPostContent, setNewPostContent] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showPostForm, setShowPostForm] = useState(false);
    const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
    const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
    const [expandedPolls, setExpandedPolls] = useState<Set<string>>(new Set());

    // Quoting state
    const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
    const [quoteType, setQuoteType] = useState<"event" | "report" | "post" | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedQuoteTitle, setSelectedQuoteTitle] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Record<string, { commentId: string, authorName: string, content: string }>>({});

    // Poll state
    const [isPollMode, setIsPollMode] = useState(false);
    const [pollTitle, setPollTitle] = useState("");
    const [pollOptions, setPollOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
    const [pollEndDate, setPollEndDate] = useState<string>('');
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

    // Edit/Delete state
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    // Comments state
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

    const navigate = useNavigate();

    // Fetch posts with linked content (without social_profiles join to avoid FK ambiguity)
    const { data: posts, isLoading } = useQuery({
        queryKey: ["social_posts"],
        queryFn: async () => {
            // Step 1: Fetch posts with event/report joins
            const { data: rawPosts, error } = await supabase
                .from("posts")
                .select(`
          id,
          user_id,
          content,
          image_url,
          created_at,
          linked_event_id,
          linked_report_id,
          linked_post_id,
          poll_data,
          linked_event:linked_event_id(
            id,
            title,
            date
          ),
          linked_report:linked_report_id(
            id,
            title,
            week_end
          ),
          linked_post:linked_post_id(
            id,
            content,
            created_at,
            user_id
          )
        `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching posts:", error);
                throw error;
            }

            if (!rawPosts || rawPosts.length === 0) return [];

            // Step 2: Batch-fetch profiles and social profiles for all unique user IDs
            const uniqueUserIds = [...new Set([
                ...rawPosts.map(p => (p as any).user_id),
                ...rawPosts.filter(p => (p as any).linked_post?.user_id).map(p => (p as any).linked_post?.user_id)
            ])];

            const [
                { data: mainProfiles, error: mainProfileError },
                { data: socialProfiles, error: socialProfileError }
            ] = await Promise.all([
                supabase.from("profiles").select("id, first_name, last_name").in("id", uniqueUserIds),
                supabase.from("social_profiles").select("user_id, profile_photo").in("user_id", uniqueUserIds)
            ]);

            if (mainProfileError) console.error("Error fetching main profiles:", mainProfileError);
            if (socialProfileError) console.error("Error fetching social profiles:", socialProfileError);

            // Step 3: Merge profiles into posts
            const profileMap = new Map();

            // Map main profiles first
            (mainProfiles || []).forEach(p => {
                profileMap.set(p.id, {
                    social_name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Gizli Kullanıcı",
                });
            });

            // Merge social profile photos
            (socialProfiles || []).forEach(sp => {
                const existing = profileMap.get(sp.user_id) || {};
                profileMap.set(sp.user_id, {
                    ...existing,
                    profile_photo: sp.profile_photo
                });
            });

            return rawPosts.map(post => ({
                ...post,
                social_profiles: profileMap.get((post as any).user_id) || null,
                linked_post_profile: (post as any).linked_post ? profileMap.get((post as any).linked_post.user_id) : null,
            }));
        },
    });

    // Fetch current user's social profile for the post creation avatar
    const { data: currentUserProfile } = useQuery({
        queryKey: ["current_social_profile", user?.id, profile?.first_name, profile?.last_name],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data: socialData, error: socialError } = await supabase
                .from("social_profiles")
                .select("profile_photo")
                .eq("user_id", user.id)
                .single();

            if (socialError && socialError.code !== 'PGRST116') throw socialError;

            return {
                social_name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Profilim",
                profile_photo: socialData?.profile_photo
            };
        },
        enabled: !!user?.id
    });

    // Fetch user's recent events for quoting
    const { data: recentEvents } = useQuery({
        queryKey: ["recent_events_for_quote"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select("id, title, date")
                .order("created_at", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data;
        },
        enabled: quoteType === "event" && isQuoteDialogOpen
    });

    // Fetch user's recent reports for quoting
    const { data: recentReports } = useQuery({
        queryKey: ["recent_reports_for_quote"],
        queryFn: async () => {
            // Assuming weekly_reports can be linked for now
            const { data, error } = await supabase
                .from("weekly_reports")
                .select("id, title, week_end")
                .order("created_at", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data;
        },
        enabled: quoteType === "report" && isQuoteDialogOpen
    });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            toast.error("En fazla 50 MB fotoğraf yüklenebilir.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Lütfen sadece geçerli bir resim formatı yükleyin.");
            return;
        }

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeQuote = () => {
        setSelectedEventId(null);
        setSelectedReportId(null);
        setSelectedPostId(null);
        setSelectedQuoteTitle(null);
        setQuoteType(null);
    };

    const handleAddPollOption = () => {
        if (pollOptions.length >= 10) return;
        setPollOptions([...pollOptions, { id: generateUUID(), text: '' }]);
    };

    const handleRemovePollOption = (id: string) => {
        if (pollOptions.length <= 2) return;
        setPollOptions(pollOptions.filter(opt => opt.id !== id));
    };

    const handlePollOptionChange = (id: string, text: string) => {
        setPollOptions(pollOptions.map(opt => opt.id === id ? { ...opt, text } : opt));
    };

    const removePoll = () => {
        setIsPollMode(false);
        setPollTitle("");
        setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
        setPollEndDate('');
        setPollAllowMultiple(false);
    };

    const handleSelectQuote = (type: "event" | "report", id: string, title: string) => {
        setQuoteType(type);
        if (type === "event") {
            setSelectedEventId(id);
            setSelectedReportId(null);
            setSelectedPostId(null);
        } else {
            setSelectedReportId(id);
            setSelectedEventId(null);
            setSelectedPostId(null);
        }
        setSelectedQuoteTitle(title);
        setIsQuoteDialogOpen(false);
    };

    const handleQuotePost = (post: any) => {
        setQuoteType("post");
        setSelectedPostId(post.id);
        setSelectedEventId(null);
        setSelectedReportId(null);
        const authorName = post.social_profiles?.social_name || "Gizli Kullanıcı";
        setSelectedQuoteTitle(`@${authorName} gönderisi: ${post.content ? post.content.substring(0, 30) + "..." : "Görsel içeriği"}`);
        setShowPostForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const createPostMutation = useMutation({
        mutationFn: async ({
            content,
            imageUrl,
            eventId,
            reportId,
            postId,
            pollData
        }: {
            content: string;
            imageUrl: string | null;
            eventId: string | null;
            reportId: string | null;
            postId: string | null;
            pollData: any | null;
        }) => {
            if (!user) throw new Error("Giriş yapmalısınız");

            if (editingPostId) {
                // UPDATE existing post
                const { error } = await supabase
                    .from("posts")
                    .update({
                        content: content,
                        image_url: imageUrl,
                        linked_event_id: eventId,
                        linked_report_id: reportId,
                        linked_post_id: postId,
                        poll_data: pollData
                    })
                    .eq("id", editingPostId);
                if (error) throw error;
            } else {
                // INSERT new post
                const { error } = await supabase
                    .from("posts")
                    .insert({
                        user_id: user.id,
                        content: content,
                        image_url: imageUrl,
                        linked_event_id: eventId,
                        linked_report_id: reportId,
                        linked_post_id: postId,
                        poll_data: pollData
                    });
                if (error) throw error;
            }
        },
        onSuccess: async () => {
            const wasEditing = !!editingPostId;

            // Create mention notifications for new posts (not edits)
            if (!wasEditing && newPostContent) {
                try {
                    const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;
                    let mentionMatch;
                    const mentionedUserIds: { id: string; name: string }[] = [];
                    while ((mentionMatch = mentionRegex.exec(newPostContent)) !== null) {
                        const mentionedName = mentionMatch[1];
                        const mentionedId = mentionMatch[2];
                        if (mentionedId !== user?.id) {
                            mentionedUserIds.push({ id: mentionedId, name: mentionedName });
                        }
                    }

                    if (mentionedUserIds.length > 0) {
                        const authorName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Biri";

                        // Get the ID of the just-created post
                        const { data: latestPost } = await supabase
                            .from("posts")
                            .select("id")
                            .eq("user_id", user!.id)
                            .order("created_at", { ascending: false })
                            .limit(1);

                        const postDbId = latestPost?.[0]?.id;

                        const mentionNotifs = mentionedUserIds.map((m) => ({
                            user_id: m.id,
                            type: "mention",
                            title: "Sizden Bahsedildi",
                            description: `${authorName} bir gönderide sizden bahsetti!`,
                            link: "/sosyal",
                            post_id: postDbId || null,
                        }));

                        await (supabase.from("notifications" as any).insert(mentionNotifs as any) as any);
                    }
                } catch (e) {
                    console.error("Mention notification error:", e);
                }
            }

            setNewPostContent("");
            removeImage();
            removeQuote();
            removePoll();
            setEditingPostId(null);
            setEditContent("");
            setShowPostForm(false);
            toast.success(wasEditing ? "Gönderi güncellendi!" : "Gönderi paylaşıldı!");
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
            queryClient.invalidateQueries({ queryKey: ["my_posts"] });
        },
        onError: (error) => {
            toast.error("Paylaşım yapılamadı: " + error.message);
        },
    });

    const votePollMutation = useMutation({
        mutationFn: async ({ postId, optionId, currentPollData, isUnvote }: { postId: string, optionId: string, currentPollData: any, isUnvote?: boolean }) => {
            if (!user) throw new Error("Giriş yapmalısınız");

            const newPollData = { ...currentPollData };
            if (!newPollData.votersByOption) {
                newPollData.votersByOption = {};
            }

            if (isUnvote) {
                // UNVOTE: remove user from this option
                newPollData.votersByOption[optionId] = (newPollData.votersByOption[optionId] || []).filter((id: string) => id !== user.id);
                // Decrement option vote count
                newPollData.options = newPollData.options.map((opt: any) =>
                    opt.id === optionId ? { ...opt, votes: Math.max((opt.votes || 0) - 1, 0) } : opt
                );
                // For multi-select: only remove from flat voters if user has no other option votes
                const allowMultiple = currentPollData.allowMultiple || false;
                if (allowMultiple) {
                    const hasOtherVotes = Object.entries(newPollData.votersByOption).some(
                        ([key, voters]: [string, any]) => key !== optionId && voters.includes(user.id)
                    );
                    if (!hasOtherVotes) {
                        newPollData.voters = (newPollData.voters || []).filter((id: string) => id !== user.id);
                    }
                } else {
                    newPollData.voters = (newPollData.voters || []).filter((id: string) => id !== user.id);
                }
            } else {
                // VOTE: add user to this option
                const allowMultiple = currentPollData.allowMultiple || false;
                newPollData.votersByOption[optionId] = [...(newPollData.votersByOption[optionId] || []), user.id];
                // Increment option vote count
                newPollData.options = newPollData.options.map((opt: any) =>
                    opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
                );
                // Add to flat voters
                if (!newPollData.voters?.includes(user.id)) {
                    newPollData.voters = [...(newPollData.voters || []), user.id];
                }
                // For single-select: if user had voted for another option, remove that vote
                if (!allowMultiple) {
                    for (const [key, voters] of Object.entries(newPollData.votersByOption)) {
                        if (key !== optionId && (voters as string[]).includes(user.id)) {
                            newPollData.votersByOption[key] = (voters as string[]).filter((id: string) => id !== user.id);
                            newPollData.options = newPollData.options.map((opt: any) =>
                                opt.id === key ? { ...opt, votes: Math.max((opt.votes || 0) - 1, 0) } : opt
                            );
                        }
                    }
                }
            }

            const { error } = await supabase
                .from("posts")
                .update({ poll_data: newPollData })
                .eq("id", postId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
        },
        onError: (error) => {
            toast.error("Oy kaydedilemedi: " + error.message);
        }
    });

    const endPollMutation = useMutation({
        mutationFn: async ({ postId, currentPollData }: { postId: string, currentPollData: any }) => {
            if (!user) throw new Error("Giriş yapmalısınız");

            const newPollData = { ...currentPollData, isEnded: true };

            const { error } = await supabase
                .from("posts")
                .update({ poll_data: newPollData })
                .eq("id", postId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
            toast.success("Anket sonlandırıldı.");
        },
        onError: (error) => {
            toast.error("Anket sonlandırılamadı: " + error.message);
        }
    });

    // Edit post mutation
    const editPostMutation = useMutation({
        mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
            if (!user) throw new Error("Giriş yapmalısınız");
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
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
        },
        onError: (error) => {
            toast.error("Düzenleme başarısız: " + error.message);
        }
    });

    // Delete post mutation
    const deletePostMutation = useMutation({
        mutationFn: async (postId: string) => {
            if (!user) throw new Error("Giriş yapmalısınız");
            const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", postId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Gönderi silindi.");
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
        },
        onError: (error) => {
            toast.error("Silme başarısız: " + error.message);
        }
    });

    // Add comment mutation
    const addCommentMutation = useMutation({
        mutationFn: async ({ postId, content, replyToCommentId }: { postId: string; content: string; replyToCommentId?: string }) => {
            if (!user) throw new Error("Giriş yapmalısınız");
            const { error } = await supabase
                .from("post_comments")
                .insert({ post_id: postId, user_id: user.id, content, reply_to_comment_id: replyToCommentId || null });
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["post_comments", variables.postId] });
            queryClient.invalidateQueries({ queryKey: ["comment_count", variables.postId] });
        },
        onError: (error) => {
            toast.error("Yorum eklenemedi: " + error.message);
        },
    });

    const handleStartEdit = (postId: string, post: any) => {
        // Pre-fill the top form with existing post data
        setEditingPostId(postId);
        setNewPostContent(post.content || "");

        // Pre-fill image (existing URL, no File object)
        if (post.image_url) {
            setImagePreview(post.image_url);
            setSelectedImage(null); // No File object for existing image
        } else {
            setImagePreview(null);
            setSelectedImage(null);
        }

        // Pre-fill linked content
        if (post.linked_event_id) {
            setSelectedEventId(post.linked_event_id);
            setSelectedReportId(null);
            setQuoteType("event");
            setSelectedQuoteTitle(post.linked_event?.title || "Etkinlik");
        } else if (post.linked_report_id) {
            setSelectedReportId(post.linked_report_id);
            setSelectedEventId(null);
            setQuoteType("report");
            setSelectedQuoteTitle(post.linked_report?.title || "Rapor");
        } else {
            setSelectedEventId(null);
            setSelectedReportId(null);
            setSelectedQuoteTitle(null);
            setQuoteType(null);
        }

        // Pre-fill poll
        if (post.poll_data && post.poll_data.options) {
            setIsPollMode(true);
            setPollTitle(post.poll_data.title || "");
            setPollOptions(post.poll_data.options.map((opt: any) => ({ id: opt.id, text: opt.text })));
            setPollEndDate(post.poll_data.endDate || "");
            setPollAllowMultiple(post.poll_data.allowMultiple || false);
        } else {
            setIsPollMode(false);
            setPollTitle("");
            setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
            setPollEndDate("");
            setPollAllowMultiple(false);
        }

        setShowPostForm(true);
        // Scroll to top so the user sees the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingPostId(null);
        setEditContent("");
        setNewPostContent("");
        removeImage();
        removeQuote();
        removePoll();
        setShowPostForm(false);
    };

    const [deleteConfirmPostId, setDeleteConfirmPostId] = useState<string | null>(null);

    const handleDeletePost = (postId: string) => {
        setDeleteConfirmPostId(postId);
    };

    const confirmDeletePost = () => {
        if (deleteConfirmPostId) {
            deletePostMutation.mutate(deleteConfirmPostId);
            setDeleteConfirmPostId(null);
        }
    };

    const handleVote = (postId: string, optionId: string, currentPollData: any) => {
        // Prevent voting if poll ended
        const isEnded = currentPollData.isEnded || (currentPollData.endDate && new Date(currentPollData.endDate) < new Date());
        if (isEnded) return;
        if (!user) return;

        // Check if user already voted for this option -> toggle (unvote)
        const optionVoters = currentPollData.votersByOption?.[optionId] || [];
        const alreadyVotedThisOption = optionVoters.includes(user.id);

        if (alreadyVotedThisOption) {
            // Unvote
            votePollMutation.mutate({ postId, optionId, currentPollData, isUnvote: true });
            return;
        }

        const allowMultiple = currentPollData.allowMultiple || false;
        if (!allowMultiple) {
            // Single select: always allow (will replace previous vote in mutation)
        }

        votePollMutation.mutate({ postId, optionId, currentPollData, isUnvote: false });
    };

    const handleCreatePost = async () => {
        const hasPollContent = isPollMode && pollOptions.some(opt => opt.text.trim() !== '');
        if (!newPostContent.trim() && !selectedImage && !imagePreview && !selectedEventId && !selectedReportId && !hasPollContent) return;

        let uploadedImageUrl: string | null = null;

        // If editing and there's an existing image preview but no new file, keep it
        if (editingPostId && imagePreview && !selectedImage) {
            uploadedImageUrl = imagePreview;
        }

        if (selectedImage) {
            setIsUploading(true);
            try {
                // Compress image before upload (converts all formats to WebP)
                const compressedFile = await compressImage(selectedImage);
                const filePath = `${user?.id}/${generateUUID()}.webp`;

                const { error: uploadError, data } = await supabase.storage
                    .from("social_posts")
                    .upload(filePath, compressedFile, {
                        contentType: 'image/webp'
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from("social_posts")
                    .getPublicUrl(filePath);

                uploadedImageUrl = publicUrlData.publicUrl;
            } catch (error: any) {
                toast.error("Görsel yüklenirken hata oluştu: " + error.message);
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        let pollDataToSave = null;
        if (isPollMode && hasPollContent) {
            const validOptions = pollOptions.filter(opt => opt.text.trim() !== '');
            if (validOptions.length < 2) {
                toast.error("Anket için en az 2 geçerli seçenek girmelisiniz.");
                return;
            }
            pollDataToSave = {
                title: pollTitle.trim() || null,
                options: validOptions.map(opt => ({ id: opt.id, text: opt.text.trim(), votes: (opt as any).votes || 0 })),
                endDate: pollEndDate || null,
                allowMultiple: pollAllowMultiple,
                voters: editingPostId ? (undefined as any) : [],
                votersByOption: editingPostId ? (undefined as any) : {}
            };
            // If editing, preserve existing voters
            if (editingPostId) {
                const existingPost = posts?.find((p: any) => p.id === editingPostId);
                if (existingPost?.poll_data?.voters) {
                    pollDataToSave.voters = existingPost.poll_data.voters;
                } else {
                    pollDataToSave.voters = [];
                }
                if (existingPost?.poll_data?.votersByOption) {
                    pollDataToSave.votersByOption = existingPost.poll_data.votersByOption;
                } else {
                    pollDataToSave.votersByOption = {};
                }
            }
        }

        createPostMutation.mutate({
            content: newPostContent,
            imageUrl: uploadedImageUrl,
            eventId: selectedEventId,
            reportId: selectedReportId,
            postId: selectedPostId,
            pollData: pollDataToSave
        });
    };

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <>
            <div className="space-y-3 sm:space-y-4">
                {/* Gönderi Ekle toggle button */}
                {!showPostForm ? (
                    <button
                        onClick={() => setShowPostForm(true)}
                        className="w-full flex items-center gap-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] px-4 py-3.5 text-left hover:shadow-[0_4px_25px_-4px_rgba(0,0,0,0.1)] hover:border-primary/20 transition-all duration-300 group"
                    >
                        <Avatar className="h-9 w-9 border-2 border-primary/10 shrink-0 ring-2 ring-primary/5">
                            <AvatarImage src={currentUserProfile?.profile_photo || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                                {getInitials(currentUserProfile?.social_name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-400 group-hover:text-gray-500 transition-colors flex-1">
                            Aklından ne geçiyor?
                        </span>
                        <span className="text-xs font-semibold text-white bg-gradient-to-r from-primary to-primary/90 px-4 py-2 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/30 group-hover:scale-[1.02] transition-all duration-300">
                            + Gönderi Ekle
                        </span>
                    </button>
                ) : (
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_4px_30px_-6px_rgba(0,0,0,0.08)] overflow-hidden">
                        <div className="p-4 sm:p-5">
                            <div className="flex justify-end mb-1">
                                {editingPostId ? (
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Güncellemeden Çık
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowPostForm(false)}
                                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <Avatar
                                        className="h-10 w-10 mt-1 cursor-pointer border border-gray-100 shrink-0"
                                        onClick={() => navigate(`/sosyal/profil/${user?.id}`)}
                                    >
                                        <AvatarImage src={currentUserProfile?.profile_photo || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {getInitials(currentUserProfile?.social_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <MentionTextarea
                                        placeholder="Aklından ne geçiyor?"
                                        className="resize-none min-h-[180px] sm:min-h-[200px] flex-1 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-300 rounded-xl p-4 text-sm sm:text-base border-none shadow-inner focus:ring-1 focus:ring-primary/20"
                                        value={newPostContent}
                                        onChange={(val) => setNewPostContent(val)}
                                    />
                                </div>

                                {/* Quote Preview Area */}
                                {selectedQuoteTitle && (
                                    <div className="relative inline-flex items-center p-3 pr-10 bg-primary/5 border border-primary/20 rounded-md text-sm text-primary">
                                        {quoteType === "event" ? <Calendar className="w-4 h-4 mr-2" /> : quoteType === "report" ? <FileText className="w-4 h-4 mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                                        <span className="font-medium truncate max-w-[250px]">Alıntı: {selectedQuoteTitle}</span>
                                        <button
                                            type="button"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[11px] font-medium hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                            onClick={removeQuote}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Sil
                                        </button>
                                    </div>
                                )}

                                {/* Poll Preview Area */}
                                {isPollMode && (
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 relative">
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[11px] font-medium hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                            onClick={removePoll}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Sil
                                        </button>
                                        <div className="space-y-3 mt-2 pr-8">
                                            <div className="flex items-center gap-2 mb-2 text-primary font-medium">
                                                <BarChart2 className="w-4 h-4" />
                                                <span>Anket Oluştur</span>
                                            </div>

                                            {/* Poll Title */}
                                            <div>
                                                <Label className="text-xs text-primary/70 font-semibold mb-1 block">Anket Başlığı / Sorusu</Label>
                                                <Input
                                                    placeholder="Ör: En sevdiğiniz programlama dili hangisi?"
                                                    value={pollTitle}
                                                    onChange={(e) => setPollTitle(e.target.value)}
                                                    className="bg-white"
                                                    maxLength={120}
                                                />
                                            </div>

                                            {/* Options */}
                                            <div>
                                                <Label className="text-xs text-primary/70 font-semibold mb-1 block">Şıklar</Label>
                                                <div className="space-y-2">
                                                    {pollOptions.map((option, index) => (
                                                        <div key={option.id} className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-primary/50 w-5 shrink-0 text-center">{String.fromCharCode(65 + index)}</span>
                                                            <Input
                                                                placeholder={`Seçenek ${index + 1}`}
                                                                value={option.text}
                                                                onChange={(e) => handlePollOptionChange(option.id, e.target.value)}
                                                                className="bg-white"
                                                                maxLength={50}
                                                            />
                                                            {pollOptions.length > 2 && (
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemovePollOption(option.id)} className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {pollOptions.length < 10 && (
                                                        <Button type="button" variant="ghost" size="sm" onClick={handleAddPollOption} className="text-primary hover:text-primary hover:bg-primary/10 mt-1">
                                                            <Plus className="w-4 h-4 mr-2" />
                                                            Seçenek Ekle
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Allow Multiple Toggle */}
                                            <div className="flex items-center gap-3 pt-2 border-t border-primary/10">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={pollAllowMultiple}
                                                        onChange={(e) => setPollAllowMultiple(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-xs text-gray-600 font-medium">Birden fazla seçeneği işaretlemeye izin ver</span>
                                                </label>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-primary/10 space-y-2">
                                                <Label htmlFor="poll-end-date" className="text-xs text-primary font-medium">Bitiş Tarihi (Opsiyonel)</Label>
                                                <div className="flex">
                                                    <Input
                                                        id="poll-end-date"
                                                        type="datetime-local"
                                                        className="bg-white max-w-[250px]"
                                                        value={pollEndDate}
                                                        onChange={(e) => setPollEndDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Image Preview Area */}
                                {imagePreview && (
                                    <div className="relative inline-block w-full max-w-sm rounded-md overflow-hidden border border-gray-200">
                                        <img
                                            src={imagePreview}
                                            alt="Yükleme önizlemesi"
                                            className="w-full h-auto max-h-64 object-cover"
                                        />
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 text-red-400 text-[11px] font-medium hover:bg-red-500/25 hover:text-red-500 transition-colors backdrop-blur-sm"
                                            onClick={removeImage}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between items-center border-t border-gray-100 mt-2 pt-4 flex-wrap gap-2">
                                    <div className="flex gap-2 flex-wrap items-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleImageSelect}
                                        />

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-10 h-10 rounded-full hover:bg-primary/10 hover:text-primary text-gray-400 transition-all duration-300"
                                                    disabled={isUploading || createPostMutation.isPending}
                                                >
                                                    <Paperclip className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-xl border-gray-100/50 backdrop-blur-xl bg-white/90">
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ekle</div>
                                                <DropdownMenuItem
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-700">Fotoğraf</span>
                                                        <span className="text-[10px] text-gray-400">Görsel veya GIF paylaş</span>
                                                    </div>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => setIsPollMode(!isPollMode)}
                                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                        <BarChart2 className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-700">Anket</span>
                                                        <span className="text-[10px] text-gray-400">Topluluğa soru sor</span>
                                                    </div>
                                                </DropdownMenuItem>

                                                <div className="h-px bg-gray-50 my-1 mx-2" />
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Alıntıla</div>

                                                <DropdownMenuItem
                                                    onClick={() => { setQuoteType("event"); setIsQuoteDialogOpen(true); }}
                                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-700">Etkinlik</span>
                                                        <span className="text-[10px] text-gray-400">Geçmiş bir etkinliği paylaş</span>
                                                    </div>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => { setQuoteType("report"); setIsQuoteDialogOpen(true); }}
                                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-700">Rapor</span>
                                                        <span className="text-[10px] text-gray-400">Haftalık bir raporu paylaş</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Status Indicators */}
                                        <div className="flex items-center gap-1.5 ml-2">
                                            {selectedImage && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100 animate-in fade-in zoom-in-95">
                                                    <ImageIcon className="w-3 h-3" />
                                                    Görsel Eklendi
                                                </div>
                                            )}
                                            {isPollMode && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 animate-in fade-in zoom-in-95">
                                                    <BarChart2 className="w-3 h-3" />
                                                    Anket Aktif
                                                </div>
                                            )}
                                            {(selectedEventId || selectedReportId) && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100 animate-in fade-in zoom-in-95">
                                                    <LinkIcon className="w-3 h-3" />
                                                    Alıntı Eklendi
                                                </div>
                                            )}
                                        </div>

                                        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                                            <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl max-w-md">
                                                <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 via-transparent to-transparent flex flex-row items-center justify-between space-y-0">
                                                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${quoteType === "event" ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                                                            {quoteType === "event" ? <Calendar className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                        </div>
                                                        {quoteType === "event" ? "Etkinlik Alıntıla" : "Rapor Alıntıla"}
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="p-4 flex flex-col gap-2 max-h-[400px] overflow-y-auto px-6 pb-8">
                                                    <p className="text-gray-500 text-xs mb-2">Paylaşmak istediğiniz içeriği seçin:</p>
                                                    {quoteType === "event" && recentEvents && recentEvents.length > 0 ? (
                                                        recentEvents.map(event => (
                                                            <button
                                                                key={event.id}
                                                                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 text-left group"
                                                                onClick={() => handleSelectQuote("event", event.id, event.title)}
                                                            >
                                                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 shrink-0">
                                                                    <Calendar className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-bold text-gray-800 truncate">{event.title}</span>
                                                                    <span className="text-[11px] text-gray-400">
                                                                        {new Date(event.date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : quoteType === "report" && recentReports && recentReports.length > 0 ? (
                                                        recentReports.map(report => (
                                                            <button
                                                                key={report.id}
                                                                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 text-left group"
                                                                onClick={() => handleSelectQuote("report", report.id, report.title)}
                                                            >
                                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 shrink-0">
                                                                    <FileText className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-bold text-gray-800 truncate">{report.title}</span>
                                                                    <span className="text-[11px] text-gray-400">
                                                                        {new Date(report.week_end).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                                <Search className="w-6 h-6 text-gray-300" />
                                                            </div>
                                                            <h3 className="font-bold text-gray-900 mb-1">İçerik Bulunamadı</h3>
                                                            <p className="text-gray-500 text-xs px-8 leading-relaxed">
                                                                {quoteType === "event" ? "Henüz katıldığınız veya oluşturduğunuz bir etkinlik bulunmuyor." : "Henüz oluşturulmuş bir raporunuz bulunmuyor."}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <Button
                                        onClick={handleCreatePost}
                                        className="px-6"
                                        disabled={(!newPostContent.trim() && !selectedImage && !selectedEventId && !selectedReportId && !selectedPostId) || createPostMutation.isPending || isUploading}
                                    >
                                        {createPostMutation.isPending || isUploading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : editingPostId ? (
                                            <Check className="mr-2 h-4 w-4" />
                                        ) : (
                                            <Send className="mr-2 h-4 w-4" />
                                        )}
                                        {editingPostId ? 'Güncelle' : 'Paylaş'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feed Area - Hidden when editing */}
                {!editingPostId && <div className="space-y-5">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                                <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
                            </div>
                        </div>
                    ) : posts?.length === 0 ? (
                        <div className="text-center py-16 px-8 bg-gradient-to-br from-white to-gray-50/80 rounded-[20px] border border-dashed border-gray-200 shadow-sm">
                            <div className="w-14 h-14 mx-auto mb-4 bg-primary/5 rounded-2xl flex items-center justify-center">
                                <MessageCircle className="w-7 h-7 text-primary/40" />
                            </div>
                            <p className="text-gray-500 text-sm font-medium">Henüz hiç paylaşım yapılmamış</p>
                            <p className="text-gray-400 text-xs mt-1">İlk paylaşan siz olun!</p>
                        </div>
                    ) : (
                        posts?.map((post: any) => {
                            const profile = post.social_profiles;
                            const authorName = profile?.social_name || "Gizli Kullanıcı";
                            const authorPhoto = profile?.profile_photo;

                            const linkedEvent = post.linked_event;
                            const linkedReport = post.linked_report;
                            const linkedPost = post.linked_post;
                            const linkedPostAuthor = post.linked_post_profile;

                            // Time ago helper
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

                            const canManage = user?.id === post.user_id || isSuperAdmin;

                            return (
                                <div key={post.id} id={`post-${post.id}`} className="group/card relative overflow-hidden rounded-[20px] transition-all duration-500 hover:translate-y-[-2px]">
                                    {/* Layered background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50/80 rounded-[20px]" />
                                    <div className="absolute inset-0 border border-gray-200/40 rounded-[20px] group-hover/card:border-primary/20 transition-colors duration-500" />
                                    <div className="absolute inset-0 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.06)] group-hover/card:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] transition-shadow duration-500 rounded-[20px]" />

                                    {/* Top accent gradient line */}
                                    <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                                    <div className="relative">
                                        {/* Author Header */}
                                        <div className="flex items-center gap-3.5 px-5 pt-5 pb-2">
                                            <div className="relative shrink-0" onClick={() => navigate(`/sosyal/profil/${post.user_id}`)}>
                                                <div className="absolute -inset-[3px] bg-gradient-to-br from-primary/40 via-purple-400/30 to-pink-400/20 rounded-full opacity-60 group-hover/card:opacity-100 transition-opacity duration-300" />
                                                <Avatar className="h-10 w-10 cursor-pointer border-2 border-white relative">
                                                    <AvatarImage src={authorPhoto} alt={authorName} />
                                                    <AvatarFallback className="bg-gradient-to-br from-primary via-purple-500 to-pink-500 text-white text-xs font-bold">
                                                        {getInitials(authorName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="font-bold text-sm text-gray-900 cursor-pointer hover:text-primary transition-colors truncate"
                                                        onClick={() => navigate(`/sosyal/profil/${post.user_id}`)}
                                                    >
                                                        {authorName}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-gray-400 font-medium tracking-wide">{timeAgo(post.created_at)}</span>
                                            </div>

                                            {/* 3-dot menu */}
                                            {canManage && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-200 text-gray-300 hover:text-gray-600 opacity-0 group-hover/card:opacity-100">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44 rounded-2xl border-gray-100 shadow-xl p-1">
                                                        <DropdownMenuItem
                                                            onClick={() => handleStartEdit(post.id, post)}
                                                            className="gap-2.5 text-sm cursor-pointer rounded-xl py-2.5"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeletePost(post.id)}
                                                            className="gap-2.5 text-sm text-red-500 focus:text-red-500 cursor-pointer rounded-xl py-2.5"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Sil
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>

                                        {/* Linked Post Feature - Mini Version Under Profile */}
                                        {linkedPost && (
                                            <div
                                                className="mx-5 mb-2 mt-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 hover:to-primary/5 border border-primary/10 transition-colors cursor-pointer group/quoted shadow-sm relative z-20"
                                                onClick={() => {
                                                    const el = document.getElementById(`post-${linkedPost.id}`);
                                                    if (el) {
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-500');
                                                        setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-500'), 2500);
                                                    } else {
                                                        navigate(`/sosyal/profil/${linkedPost.user_id}`);
                                                    }
                                                }}
                                            >
                                                <div className="w-7 h-7 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm border border-primary/10 group-hover/quoted:bg-primary/5 transition-colors">
                                                    <MessageCircle className="w-3.5 h-3.5 text-primary/70" />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none flex items-center gap-1.5 opacity-80 mb-1">
                                                        {linkedPostAuthor?.social_name || "Gizli Kullanıcı"} alıntılandı
                                                    </span>
                                                    <p className="text-xs text-gray-500 truncate group-hover/quoted:text-gray-700 transition-colors font-medium">
                                                        {linkedPost.content ? renderContent(linkedPost.content, navigate) : "Bir görsel içeren gönderiyi alıntıladı."}
                                                    </p>
                                                </div>
                                                <Reply className="w-4 h-4 text-primary/30 group-hover/quoted:text-primary/60 transition-colors shrink-0" />
                                            </div>
                                        )}

                                        {/* Text Content */}
                                        {post.content ? (
                                            <div className="px-5 py-2">
                                                <p className={`text-[15px] text-gray-700 leading-[1.7] whitespace-pre-wrap break-words font-[400] tracking-[-0.01em] ${!expandedPosts.has(post.id) ? 'line-clamp-4' : ''}`}>
                                                    {renderContent(post.content, navigate)}
                                                </p>
                                                {(post.content.length > 200 || post.content.split('\n').length > 4) && (
                                                    <button
                                                        onClick={() => {
                                                            setExpandedPosts(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(post.id)) next.delete(post.id);
                                                                else next.add(post.id);
                                                                return next;
                                                            });
                                                        }}
                                                        className="text-xs font-semibold text-primary/80 hover:text-primary mt-1.5 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        {expandedPosts.has(post.id) ? (
                                                            <>Daha az <ChevronUp className="w-3 h-3" /></>
                                                        ) : (
                                                            <>Devamını gör <ChevronDown className="w-3 h-3" /></>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Image - Full width with elegant display */}
                                        {post.image_url && expandedImages.has(post.id) && (
                                            <div className="relative mx-5 my-2 rounded-2xl overflow-hidden bg-gray-100">
                                                <img
                                                    src={post.image_url}
                                                    alt="Gönderi görseli"
                                                    className="w-full object-cover max-h-[500px]"
                                                    loading="lazy"
                                                />
                                                {/* Gradient overlay at bottom */}
                                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
                                                <button
                                                    onClick={() => setExpandedImages(prev => { const next = new Set(prev); next.delete(post.id); return next; })}
                                                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 text-white text-[11px] font-medium hover:bg-black/60 transition-colors backdrop-blur-sm"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Kapat
                                                </button>
                                            </div>
                                        )}

                                        {/* Collapsible indicators for image and poll */}
                                        {(post.image_url || post.poll_data) && (
                                            <div className="flex items-center gap-2.5 px-5 pb-2 pt-1">
                                                {post.image_url && !expandedImages.has(post.id) && (
                                                    <button
                                                        onClick={() => setExpandedImages(prev => { const next = new Set(prev); next.add(post.id); return next; })}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200/40 text-xs font-semibold text-sky-600 hover:from-sky-100 hover:to-blue-100 hover:border-sky-300/60 hover:shadow-md transition-all duration-300 group/btn"
                                                    >
                                                        <div className="w-6 h-6 bg-sky-100 rounded-lg flex items-center justify-center group-hover/btn:bg-sky-200 transition-colors">
                                                            <ImageIcon className="w-3.5 h-3.5" />
                                                        </div>
                                                        Görseli Göster
                                                    </button>
                                                )}
                                                {post.poll_data && !expandedPolls.has(post.id) && (
                                                    <button
                                                        onClick={() => setExpandedPolls(prev => { const next = new Set(prev); next.add(post.id); return next; })}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/40 text-xs font-semibold text-violet-600 hover:from-violet-100 hover:to-purple-100 hover:border-violet-300/60 hover:shadow-md transition-all duration-300 group/btn"
                                                    >
                                                        <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center group-hover/btn:bg-violet-200 transition-colors">
                                                            <BarChart2 className="w-3.5 h-3.5" />
                                                        </div>
                                                        Anketi Göster
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Linked Content Preview */}
                                        {(linkedEvent || linkedReport) && (
                                            <div className="px-5 py-2">
                                                <div
                                                    className="group/link flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50/60 to-white hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 cursor-pointer transition-all duration-300"
                                                    onClick={() => navigate(linkedEvent ? `/etkinlik/${linkedEvent.id}` : `/raporlar`)}
                                                >
                                                    <div className="h-10 w-10 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 rounded-xl flex items-center justify-center text-primary group-hover/link:from-primary group-hover/link:to-primary/80 group-hover/link:text-white group-hover/link:border-transparent transition-all duration-300 shadow-sm">
                                                        {linkedEvent ? <Calendar className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                                        <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-primary/50">
                                                            {linkedEvent ? "Etkinlik" : "Rapor"}
                                                        </span>
                                                        <span className="text-sm font-semibold text-gray-800 truncate group-hover/link:text-primary transition-colors">
                                                            {linkedEvent ? linkedEvent.title : linkedReport.title}
                                                        </span>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover/link:bg-primary/10 group-hover/link:border-primary/20 transition-all shrink-0">
                                                        <LinkIcon className="w-3.5 h-3.5 text-gray-300 group-hover/link:text-primary transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}



                                        {/* Poll Render Area */}
                                        {post.poll_data && expandedPolls.has(post.id) && (
                                            <div className="px-5 py-2">
                                                <div className="p-4 rounded-2xl border border-violet-100/60 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/20 space-y-3 relative">
                                                    <button
                                                        onClick={() => setExpandedPolls(prev => { const next = new Set(prev); next.delete(post.id); return next; })}
                                                        className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <div className="flex items-center justify-between text-gray-700 pb-2 border-b border-violet-100/60">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                                                                <BarChart2 className="w-3.5 h-3.5 text-violet-600" />
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-700">
                                                                {post.poll_data.title || 'Anket'}
                                                            </span>
                                                            {post.poll_data.allowMultiple && (
                                                                <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-semibold">
                                                                    Çoklu seçim
                                                                </span>
                                                            )}
                                                        </div>
                                                        {user?.id === post.user_id && !post.poll_data.isEnded && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-[10px] text-red-400 hover:text-red-500 hover:bg-red-50 px-2 rounded-lg"
                                                                onClick={() => endPollMutation.mutate({ postId: post.id, currentPollData: post.poll_data })}
                                                                disabled={endPollMutation.isPending}
                                                            >
                                                                Anketi Kapat
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(() => {
                                                            const totalVotes = post.poll_data.voters?.length || 0;
                                                            const allowMultiple = post.poll_data.allowMultiple || false;
                                                            const hasVotedAny = post.poll_data.voters?.includes(user?.id);
                                                            const hasVoted = allowMultiple ? false : hasVotedAny;
                                                            const isEnded = post.poll_data.isEnded || (post.poll_data.endDate && new Date(post.poll_data.endDate) < new Date());
                                                            const showResults = hasVoted || isEnded || hasVotedAny;

                                                            return post.poll_data.options.map((opt: any) => {
                                                                const voteCount = opt.votes || 0;
                                                                const totalOptionVotes = post.poll_data.options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
                                                                const percentage = totalOptionVotes > 0 ? Math.round((voteCount / totalOptionVotes) * 100) : 0;
                                                                const votedThisOption = post.poll_data.votersByOption?.[opt.id]?.includes(user?.id);

                                                                return (
                                                                    <div
                                                                        key={opt.id}
                                                                        className={`relative overflow-hidden rounded-xl border ${votedThisOption
                                                                            ? 'border-primary/30 bg-primary/[0.06] shadow-[0_2px_12px_-3px_rgba(99,102,241,0.15)]'
                                                                            : isEnded
                                                                                ? 'border-gray-100 bg-white/60'
                                                                                : 'border-gray-200/60 bg-white hover:border-primary/25 hover:bg-primary/[0.02] hover:shadow-sm cursor-pointer'
                                                                            } transition-all duration-300 py-3 px-4 flex justify-between items-center group`}
                                                                        onClick={() => {
                                                                            if (!isEnded) handleVote(post.id, opt.id, post.poll_data);
                                                                        }}
                                                                    >
                                                                        {showResults && (
                                                                            <div
                                                                                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary/10 to-primary/5 transition-all duration-1000 ease-out rounded-xl"
                                                                                style={{ width: `${percentage}%` }}
                                                                            />
                                                                        )}
                                                                        <div className="relative z-10 flex items-center gap-2">
                                                                            {votedThisOption && <Check className="w-3.5 h-3.5 text-primary" />}
                                                                            <span className="text-sm text-gray-700">{opt.text}</span>
                                                                        </div>
                                                                        <div className="relative z-10 flex items-center gap-2">
                                                                            {showResults ? (
                                                                                <>
                                                                                    <span className="text-[11px] text-gray-400 tabular-nums">{voteCount} oy</span>
                                                                                    <span className="text-xs font-bold text-primary/70 tabular-nums">{percentage}%</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-400 group-hover:text-primary transition-colors">Oy Ver</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                    <div className="flex justify-between items-center pt-1.5 text-[11px] text-gray-400">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <span className="hover:underline cursor-pointer hover:text-primary transition-colors">
                                                                    {post.poll_data.voters?.length || 0} oy · Oyları Görüntüle
                                                                </span>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                                                                <DialogHeader>
                                                                    <DialogTitle className="flex items-center gap-2">
                                                                        <BarChart2 className="w-4 h-4 text-primary" />
                                                                        <span>{post.poll_data.title || 'Anket'} — Oylar</span>
                                                                    </DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4 mt-2">
                                                                    {post.poll_data.options.map((opt: any) => {
                                                                        const optVoterIds: string[] = post.poll_data.votersByOption?.[opt.id] || [];
                                                                        const optVoteCount = opt.votes || 0;
                                                                        return (
                                                                            <div key={opt.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                                                                <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                                                                                    <span className="text-sm font-semibold text-gray-700">{opt.text}</span>
                                                                                    <span className="text-xs font-medium text-primary tabular-nums">{optVoteCount} oy</span>
                                                                                </div>
                                                                                <div className="px-3 py-1">
                                                                                    <PollVotersList voterIds={optVoterIds} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        {post.poll_data.isEnded ? (
                                                            <span className="text-red-400 font-medium">Sona Erdi</span>
                                                        ) : post.poll_data.endDate ? (
                                                            <span>{new Date(post.poll_data.endDate).toLocaleString("tr-TR", { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                        ) : (
                                                            <span>Süresiz</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Reactions & Quote Button */}
                                        <div className="flex items-start justify-between">
                                            <PostReactions postId={post.id} />
                                            {user && (
                                                <button
                                                    onClick={() => handleQuotePost(post)}
                                                    className="mr-5 mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-[11px] font-medium border border-primary/10 hover:bg-primary hover:text-white transition-colors"
                                                >
                                                    <Reply className="w-3.5 h-3.5" />
                                                    Alıntıla
                                                </button>
                                            )}
                                        </div>

                                        {/* Separator */}
                                        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-200/60 to-transparent" />

                                        {/* Comments Section */}
                                        <div>
                                            {/* Toggle Comments Button */}
                                            <button
                                                onClick={() => setExpandedComments(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(post.id)) next.delete(post.id);
                                                    else next.add(post.id);
                                                    return next;
                                                })}
                                                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-gray-400 hover:text-primary transition-all duration-300 group/comments"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5 group-hover/comments:scale-110 transition-transform" />
                                                <CommentsCount postId={post.id} />
                                                {expandedComments.has(post.id)
                                                    ? <ChevronUp className="w-3.5 h-3.5 transition-transform" />
                                                    : <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                                                }
                                            </button>

                                            {/* Expanded Comments */}
                                            {expandedComments.has(post.id) && (
                                                <div className="px-5 pb-4 space-y-3">
                                                    <CommentsSection
                                                        postId={post.id}
                                                        onReplyClick={(commentId, authorName, content) => {
                                                            setReplyingTo(prev => ({
                                                                ...prev,
                                                                [post.id]: { commentId, authorName, content }
                                                            }));
                                                        }}
                                                    />

                                                    {/* Add Comment Input */}
                                                    {user && (
                                                        <div className="flex flex-col gap-1 pt-1">
                                                            {replyingTo[post.id] && (
                                                                <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 ml-9">
                                                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                                                        <span className="text-[10px] font-medium text-primary flex items-center gap-1">
                                                                            <MessageCircle className="w-3 h-3" />
                                                                            {replyingTo[post.id].authorName} yanıtlanıyor
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 truncate">{replyingTo[post.id].content}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newReplyingTo = { ...replyingTo };
                                                                            delete newReplyingTo[post.id];
                                                                            setReplyingTo(newReplyingTo);
                                                                        }}
                                                                        className="p-1 hover:bg-black/5 rounded-full text-gray-400 hover:text-gray-600 ml-2"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <div className="flex items-start gap-2.5">
                                                                <Avatar className="h-7 w-7 mt-1 shrink-0 border border-primary/10">
                                                                    <AvatarImage src={currentUserProfile?.profile_photo || undefined} />
                                                                    <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-[10px] font-bold">
                                                                        {getInitials(currentUserProfile?.social_name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 flex items-center bg-gray-50/80 rounded-2xl border border-gray-100 focus-within:border-primary/30 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.06)] transition-all duration-300">
                                                                    <MentionTextarea
                                                                        placeholder={replyingTo[post.id] ? "Yanıt yaz..." : "Yorum yaz..."}
                                                                        value={commentTexts[post.id] || ''}
                                                                        onChange={(val) => setCommentTexts(prev => ({ ...prev, [post.id]: val }))}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && !e.shiftKey && commentTexts[post.id]?.trim()) {
                                                                                e.preventDefault();
                                                                                addCommentMutation.mutate({
                                                                                    postId: post.id,
                                                                                    content: commentTexts[post.id].trim(),
                                                                                    replyToCommentId: replyingTo[post.id]?.commentId
                                                                                });
                                                                                setCommentTexts(prev => ({ ...prev, [post.id]: '' }));
                                                                                const newReplyingTo = { ...replyingTo };
                                                                                delete newReplyingTo[post.id];
                                                                                setReplyingTo(newReplyingTo);
                                                                            }
                                                                        }}
                                                                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 px-4 py-2 min-h-[40px]"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            if (commentTexts[post.id]?.trim()) {
                                                                                addCommentMutation.mutate({
                                                                                    postId: post.id,
                                                                                    content: commentTexts[post.id].trim(),
                                                                                    replyToCommentId: replyingTo[post.id]?.commentId
                                                                                });
                                                                                setCommentTexts(prev => ({ ...prev, [post.id]: '' }));
                                                                                const newReplyingTo = { ...replyingTo };
                                                                                delete newReplyingTo[post.id];
                                                                                setReplyingTo(newReplyingTo);
                                                                            }
                                                                        }}
                                                                        disabled={!commentTexts[post.id]?.trim() || addCommentMutation.isPending}
                                                                        className="p-2.5 mr-0.5 rounded-xl text-primary hover:text-white hover:bg-primary disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200"
                                                                    >
                                                                        <Send className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Yorumları Kapat Butonu */}
                                                    <button
                                                        onClick={() => setExpandedComments(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(post.id);
                                                            return next;
                                                        })}
                                                        className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-xs font-semibold text-gray-400 hover:text-primary transition-all duration-300 group/close-comments"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5 group-hover/close-comments:-translate-y-0.5 transition-transform" />
                                                        Yorumları Kapat
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>}
            </div>

            {/* Post Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmPostId} onOpenChange={(open) => { if (!open) setDeleteConfirmPostId(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Gönderiyi Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu gönderiyi silmek istediğinize emin misiniz? Gönderi ve tüm yorumları kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600 rounded-xl"
                            onClick={confirmDeletePost}
                        >
                            Gönderiyi Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
