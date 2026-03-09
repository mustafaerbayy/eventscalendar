import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Image as ImageIcon, X, FileText, Calendar, Link as LinkIcon, BarChart2, Plus, Trash2, MoreHorizontal, Pencil, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function PollVotersList({ voterIds }: { voterIds: string[] }) {
    const navigate = useNavigate();

    const { data: voters, isLoading } = useQuery({
        queryKey: ["poll_voters", voterIds],
        queryFn: async () => {
            if (!voterIds || voterIds.length === 0) return [];

            const { data, error } = await supabase
                .from("social_profiles")
                .select("user_id, social_name, profile_photo")
                .in("user_id", voterIds);

            if (error) throw error;
            return data;
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

// Client-side image compression utility
const compressImage = (file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // Scale down if needed, maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context oluşturulamadı'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Görsel sıkıştırılamadı'));
                        return;
                    }
                    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                },
                'image/webp',
                quality
            );
        };
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        img.src = URL.createObjectURL(file);
    });
};

export default function SocialFeed() {
    const { user, isAdmin } = useAuth();
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
    const [quoteType, setQuoteType] = useState<"event" | "report" | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [selectedQuoteTitle, setSelectedQuoteTitle] = useState<string | null>(null);

    // Poll state
    const [isPollMode, setIsPollMode] = useState(false);
    const [pollTitle, setPollTitle] = useState("");
    const [pollOptions, setPollOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
    const [pollEndDate, setPollEndDate] = useState<string>('');
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

    // Edit/Delete state
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const navigate = useNavigate();

    // Fetch posts with linked content (without social_profiles join to avoid FK ambiguity)
    const { data: posts, isLoading } = useQuery({
        queryKey: ["social_posts"],
        queryFn: async () => {
            // Step 1: Fetch posts with event/report joins
            const { data: rawPosts, error } = await supabase
                .from("posts")
                .select(`
          *,
          linked_event:linked_event_id(
            id,
            title,
            date
          ),
          linked_report:linked_report_id(
            id,
            title,
            week_end
          )
        `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching posts:", error);
                throw error;
            }

            if (!rawPosts || rawPosts.length === 0) return [];

            // Step 2: Batch-fetch social profiles for all unique post authors
            const uniqueUserIds = [...new Set(rawPosts.map(p => p.user_id))];
            const { data: profiles, error: profileError } = await supabase
                .from("social_profiles")
                .select("user_id, social_name, profile_photo")
                .in("user_id", uniqueUserIds);

            if (profileError) {
                console.error("Error fetching social profiles:", profileError);
            }

            // Step 3: Merge profiles into posts
            const profileMap = new Map(
                (profiles || []).map(p => [p.user_id, p])
            );

            return rawPosts.map(post => ({
                ...post,
                social_profiles: profileMap.get(post.user_id) || null,
            }));
        },
    });

    // Fetch current user's social profile for the post creation avatar
    const { data: currentUserProfile } = useQuery({
        queryKey: ["current_social_profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from("social_profiles")
                .select("social_name, profile_photo")
                .eq("user_id", user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
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

        if (file.size > 20 * 1024 * 1024) {
            toast.error("Görsel boyutu 20MB'dan küçük olmalıdır.");
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
        setSelectedQuoteTitle(null);
        setQuoteType(null);
    };

    const handleAddPollOption = () => {
        if (pollOptions.length >= 10) return;
        setPollOptions([...pollOptions, { id: crypto.randomUUID(), text: '' }]);
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
        } else {
            setSelectedReportId(id);
            setSelectedEventId(null);
        }
        setSelectedQuoteTitle(title);
        setIsQuoteDialogOpen(false);
    };

    const createPostMutation = useMutation({
        mutationFn: async ({
            content,
            imageUrl,
            eventId,
            reportId,
            pollData
        }: {
            content: string;
            imageUrl: string | null;
            eventId: string | null;
            reportId: string | null;
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
                        poll_data: pollData
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            const wasEditing = !!editingPostId;
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

    const handleDeletePost = (postId: string) => {
        if (window.confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) {
            deletePostMutation.mutate(postId);
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
                const filePath = `${user?.id}/${crypto.randomUUID()}.webp`;

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
            pollData: pollDataToSave
        });
    };

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    };

    return (
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
                                <Textarea
                                    placeholder="Aklından ne geçiyor?"
                                    className="resize-none min-h-[100px] flex-1 bg-gray-50 hover:bg-white focus:bg-white transition-colors"
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                />
                            </div>

                            {/* Quote Preview Area */}
                            {selectedQuoteTitle && (
                                <div className="relative inline-flex items-center p-3 pr-10 bg-primary/5 border border-primary/20 rounded-md text-sm text-primary">
                                    {quoteType === "event" ? <Calendar className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
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
                                        Sil
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center border-t border-gray-100 mt-2 pt-4 flex-wrap gap-2">
                                <div className="flex gap-2 flex-wrap">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={`text-gray-600 ${selectedImage ? 'border-primary text-primary bg-primary/5' : ''}`}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || createPostMutation.isPending}
                                    >
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        <span className="text-xs">Fotoğraf</span>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={`text-gray-600 ${isPollMode ? 'border-primary text-primary bg-primary/5' : ''}`}
                                        onClick={() => setIsPollMode(!isPollMode)}
                                    >
                                        <BarChart2 className="mr-2 h-4 w-4" />
                                        <span className="text-xs">Anket</span>
                                    </Button>

                                    <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-gray-600"
                                                onClick={() => setQuoteType("event")}
                                                disabled={!!selectedEventId || !!selectedReportId}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                <span className="text-xs">Etkinlik Alıntıla</span>
                                            </Button>
                                        </DialogTrigger>

                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-gray-600"
                                                onClick={() => setQuoteType("report")}
                                                disabled={!!selectedEventId || !!selectedReportId}
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span className="text-xs">Rapor Alıntıla</span>
                                            </Button>
                                        </DialogTrigger>

                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    {quoteType === "event" ? "Son Etkinliklerinden Alıntıla" : "Son Raporlarından Alıntıla"}
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-4">
                                                {quoteType === "event" && recentEvents && recentEvents.length > 0 ? (
                                                    recentEvents.map(event => (
                                                        <Button
                                                            key={event.id}
                                                            variant="ghost"
                                                            className="justify-start text-left h-auto py-3"
                                                            onClick={() => handleSelectQuote("event", event.id, event.title)}
                                                        >
                                                            <Calendar className="mr-3 h-4 w-4 shrink-0" />
                                                            <div className="flex flex-col truncate">
                                                                <span className="font-medium truncate">{event.title}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(event.date).toLocaleDateString("tr-TR")}
                                                                </span>
                                                            </div>
                                                        </Button>
                                                    ))
                                                ) : quoteType === "report" && recentReports && recentReports.length > 0 ? (
                                                    recentReports.map(report => (
                                                        <Button
                                                            key={report.id}
                                                            variant="ghost"
                                                            className="justify-start text-left h-auto py-3"
                                                            onClick={() => handleSelectQuote("report", report.id, report.title)}
                                                        >
                                                            <FileText className="mr-3 h-4 w-4 shrink-0" />
                                                            <div className="flex flex-col truncate">
                                                                <span className="font-medium truncate">{report.title}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(report.week_end).toLocaleDateString("tr-TR")}
                                                                </span>
                                                            </div>
                                                        </Button>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-6 text-gray-500 text-sm">
                                                        {quoteType === "event" ? "Yakın zamanda eklenmiş etkinlik bulunamadı." : "Yakın zamanda eklenmiş rapor bulunamadı."}
                                                    </div>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <Button
                                    onClick={handleCreatePost}
                                    className="px-6"
                                    disabled={(!newPostContent.trim() && !selectedImage && !selectedEventId && !selectedReportId) || createPostMutation.isPending || isUploading}
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
            {!editingPostId && <div className="space-y-3">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : posts?.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                        Henüz hiç paylaşım yapılmamış. İlk paylaşan siz olun!
                    </div>
                ) : (
                    posts?.map((post: any) => {
                        const profile = post.social_profiles;
                        const authorName = profile?.social_name || "Gizli Kullanıcı";
                        const authorPhoto = profile?.profile_photo;

                        const linkedEvent = post.linked_event;
                        const linkedReport = post.linked_report;

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

                        const canManage = user?.id === post.user_id || isAdmin;

                        return (
                            <div key={post.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.1)] transition-all duration-300">
                                {/* Author Header */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <Avatar
                                        className="h-9 w-9 cursor-pointer ring-2 ring-primary/10 hover:ring-primary/30 transition-all duration-200 shadow-sm"
                                        onClick={() => navigate(`/sosyal/profil/${post.user_id}`)}
                                    >
                                        <AvatarImage src={authorPhoto} alt={authorName} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                                            {getInitials(authorName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span
                                            className="font-semibold text-sm text-gray-900 cursor-pointer hover:text-primary transition-colors truncate"
                                            onClick={() => navigate(`/sosyal/profil/${post.user_id}`)}
                                        >
                                            {authorName}
                                        </span>
                                        <span className="text-gray-200">·</span>
                                        <span className="text-[11px] text-gray-400 shrink-0 font-medium">{timeAgo(post.created_at)}</span>
                                    </div>

                                    {/* 3-dot menu */}
                                    {canManage && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-300 hover:text-gray-500">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                <DropdownMenuItem
                                                    onClick={() => handleStartEdit(post.id, post)}
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
                                    )}
                                </div>

                                {/* Image - Shown only when expanded */}
                                {post.image_url && expandedImages.has(post.id) && (
                                    <div className="relative w-full bg-gray-50 overflow-hidden">
                                        <img
                                            src={post.image_url}
                                            alt="Gönderi görseli"
                                            className="w-full object-cover"
                                            loading="lazy"
                                        />
                                        <button
                                            onClick={() => setExpandedImages(prev => { const next = new Set(prev); next.delete(post.id); return next; })}
                                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-[11px] font-medium hover:bg-red-500/30 transition-colors backdrop-blur-sm"
                                        >
                                            <X className="w-3 h-3" />
                                            Kapat
                                        </button>
                                    </div>
                                )}

                                {/* Text Content */}
                                {post.content ? (
                                    <div className="px-4 pt-2 pb-1">
                                        <p className={`text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words ${!expandedPosts.has(post.id) ? 'line-clamp-4' : ''}`}>
                                            {post.content}
                                        </p>
                                        {(post.content.length > 200 || post.content.split('\n').length > 4) && (
                                            <button
                                                onClick={() => {
                                                    setExpandedPosts(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(post.id)) {
                                                            next.delete(post.id);
                                                        } else {
                                                            next.add(post.id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className="text-xs font-medium text-primary hover:text-primary/80 mt-1 mb-1 transition-colors"
                                            >
                                                {expandedPosts.has(post.id) ? 'daha az göster' : 'devamını gör...'}
                                            </button>
                                        )}
                                    </div>
                                ) : null}

                                {/* Collapsible indicators for image and poll */}
                                {(post.image_url || post.poll_data) && (
                                    <div className="flex items-center gap-2 px-4 pb-2.5 pt-1">
                                        {post.image_url && !expandedImages.has(post.id) && (
                                            <button
                                                onClick={() => setExpandedImages(prev => { const next = new Set(prev); next.add(post.id); return next; })}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/60 text-xs font-semibold text-blue-600 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-200 transition-all duration-200 shadow-sm"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                Görseli Göster
                                            </button>
                                        )}
                                        {post.poll_data && !expandedPolls.has(post.id) && (
                                            <button
                                                onClick={() => setExpandedPolls(prev => { const next = new Set(prev); next.add(post.id); return next; })}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-100/60 text-xs font-semibold text-purple-600 hover:from-purple-100 hover:to-fuchsia-100 hover:border-purple-200 transition-all duration-200 shadow-sm"
                                            >
                                                <BarChart2 className="w-3.5 h-3.5" />
                                                Anketi Göster
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Linked Content Preview - Compact Card */}
                                {(linkedEvent || linkedReport) && (
                                    <div className="px-4 py-2">
                                        <div
                                            className="group flex items-center gap-3 p-3 border border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-white rounded-xl hover:from-white hover:to-white hover:border-primary/20 hover:shadow-md cursor-pointer transition-all duration-200"
                                            onClick={() => navigate(linkedEvent ? `/etkinlik/${linkedEvent.id}` : `/raporlar`)}
                                        >
                                            <div className="h-9 w-9 shrink-0 bg-white border border-gray-100 shadow-sm rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                {linkedEvent ? <Calendar className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col overflow-hidden min-w-0">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">
                                                    {linkedEvent ? "Etkinlik" : "Rapor"}
                                                </span>
                                                <span className="text-sm font-medium text-gray-800 truncate group-hover:text-primary transition-colors">
                                                    {linkedEvent ? linkedEvent.title : linkedReport.title}
                                                </span>
                                            </div>
                                            <LinkIcon className="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                                        </div>
                                    </div>
                                )}

                                {/* Poll Render Area - Shown only when expanded */}
                                {post.poll_data && expandedPolls.has(post.id) && (
                                    <div className="px-4 py-2">
                                        <div className="p-3.5 rounded-2xl border border-purple-100/60 bg-gradient-to-br from-purple-50/30 to-fuchsia-50/20 space-y-2.5 relative">
                                            <button
                                                onClick={() => setExpandedPolls(prev => { const next = new Set(prev); next.delete(post.id); return next; })}
                                                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 text-red-400 text-[11px] font-medium hover:bg-red-500/25 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                            <div className="flex items-center justify-between text-gray-700 pb-1.5 border-b border-gray-100">
                                                <div className="flex items-center gap-1.5">
                                                    <BarChart2 className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-xs font-bold text-gray-600">
                                                        {post.poll_data.title || 'Anket'}
                                                    </span>
                                                    {post.poll_data.allowMultiple && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                                            Çoklu seçim
                                                        </span>
                                                    )}
                                                </div>
                                                {user?.id === post.user_id && !post.poll_data.isEnded && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[10px] text-red-400 hover:text-red-500 hover:bg-red-50 px-1.5 rounded-md"
                                                        onClick={() => endPollMutation.mutate({ postId: post.id, currentPollData: post.poll_data })}
                                                        disabled={endPollMutation.isPending}
                                                    >
                                                        Anketi Kapat
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                {(() => {
                                                    const totalVotes = post.poll_data.voters?.length || 0;
                                                    const allowMultiple = post.poll_data.allowMultiple || false;

                                                    // For multi-select, check per-option voting
                                                    const hasVotedAny = post.poll_data.voters?.includes(user?.id);
                                                    // For single-select, once voted = show results
                                                    // For multi-select, always show vote buttons until poll ends, but show percentages too
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
                                                                    ? 'border-primary/40 bg-primary/[0.08] shadow-[0_2px_10px_-2px_rgba(99,102,241,0.1)]'
                                                                    : isEnded
                                                                        ? 'border-gray-100 bg-white/60'
                                                                        : 'border-gray-200/80 bg-white hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm cursor-pointer'
                                                                    } transition-all duration-300 py-2.5 px-3.5 flex justify-between items-center group`}
                                                                onClick={() => {
                                                                    if (!isEnded) {
                                                                        handleVote(post.id, opt.id, post.poll_data);
                                                                    }
                                                                }}
                                                            >
                                                                {showResults && (
                                                                    <div
                                                                        className="absolute top-0 left-0 bottom-0 bg-primary/10 transition-all duration-1000 ease-out rounded-xl"
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                )}
                                                                <div className="relative z-10 flex items-center gap-2">
                                                                    {votedThisOption && (
                                                                        <Check className="w-3.5 h-3.5 text-primary" />
                                                                    )}
                                                                    <span className="text-sm text-gray-700">{opt.text}</span>
                                                                </div>

                                                                <div className="relative z-10 flex items-center gap-2">
                                                                    {showResults ? (
                                                                        <>
                                                                            <span className="text-[11px] text-gray-400 tabular-nums">
                                                                                {voteCount} oy
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-primary/70 tabular-nums">
                                                                                {percentage}%
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-[11px] text-gray-400 group-hover:text-primary transition-colors">
                                                                            Oy Ver
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                            <div className="flex justify-between items-center pt-1 text-[11px] text-gray-400">
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
                                                                    <div key={opt.id} className="border border-gray-100 rounded-lg overflow-hidden">
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

                                {/* Bottom spacer */}
                                <div className="h-1" />
                            </div>
                        );
                    })
                )}
            </div>}
        </div>
    );
}
