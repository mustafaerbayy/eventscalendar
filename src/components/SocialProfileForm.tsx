import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle, Camera, Upload, Trash2, Linkedin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage } from "@/lib/image-utils";

const profileSchema = z.object({
    birth_date: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    university: z.string().optional().nullable(),
    linkedin_url: z.string().url("Geçerli bir URL giriniz").or(z.literal("")).optional().nullable(),
    bio: z.string().max(500, "Biyografi en fazla 500 karakter olabilir").optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface SocialProfileFormProps {
    hideCard?: boolean;
}

export default function SocialProfileForm({ hideCard = false }: SocialProfileFormProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            birth_date: "",
            job_title: "",
            university: "",
            linkedin_url: "",
            bio: "",
        },
    });

    const { data: profile, isLoading } = useQuery({
        queryKey: ["social_profile", user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error("User not found");
            const { data, error } = await supabase
                .from("social_profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching social profile:", error);
                throw error;
            }
            return data;
        },
        enabled: !!user?.id,
    });

    useEffect(() => {
        if (profile) {
            form.reset({
                birth_date: profile.birth_date || "",
                job_title: profile.job_title || "",
                university: profile.university || "",
                linkedin_url: profile.linkedin_url || "",
                bio: profile.bio || "",
            });
        }
    }, [profile, form]);

    const updateMutation = useMutation({
        mutationFn: async (values: ProfileFormValues) => {
            const { error } = await supabase
                .from("social_profiles")
                .update({
                    birth_date: values.birth_date || null,
                    job_title: values.job_title || null,
                    university: values.university || null,
                    linkedin_url: values.linkedin_url || null,
                    bio: values.bio || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user?.id || "");

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Sosyal profiliniz güncellendi!");
            queryClient.invalidateQueries({ queryKey: ["social_profile", user?.id] });
        },
        onError: (error) => {
            toast.error("Profil güncellenirken bir hata oluştu: " + error.message);
        },
    });

    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) return;

        // 50MB limit as requested
        if (file.size > 50 * 1024 * 1024) {
            toast.error("En fazla 50 MB fotoğraf yüklenebilir.");
            return;
        }

        setIsUploadingPhoto(true);
        try {
            // Compress image
            const compressedFile = await compressImage(file, 800, 800, 0.7); // Smaller for profile photo

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
            const bucketName = "social_posts"; // Using existing bucket to be safe, or create new one if you have access

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, compressedFile, {
                    upsert: true,
                    contentType: 'image/webp'
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            const photoUrl = publicUrlData.publicUrl;

            // Update profile
            const { error: updateError } = await supabase
                .from("social_profiles")
                .update({ profile_photo: photoUrl })
                .eq("user_id", user.id);

            if (updateError) throw updateError;

            toast.success("Profil fotoğrafı güncellendi!");
            queryClient.invalidateQueries({ queryKey: ["social_profile", user.id] });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error("Fotoğraf yüklenirken bir hata oluştu: " + error.message);
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemovePhoto = async () => {
        if (!user?.id) return;

        setIsUploadingPhoto(true);
        try {
            const { error } = await supabase
                .from("social_profiles")
                .update({ profile_photo: null })
                .eq("user_id", user.id);

            if (error) throw error;

            toast.success("Profil fotoğrafı kaldırıldı.");
            queryClient.invalidateQueries({ queryKey: ["social_profile", user.id] });
        } catch (error: any) {
            toast.error("Hata oluştu: " + error.message);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const onSubmit = (values: ProfileFormValues) => {
        updateMutation.mutate(values);
    };

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

    const currentAge = calculateAge(form.watch("birth_date"));

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const formContent = (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                        <Avatar className="w-32 h-32 border-2 border-primary/20 shadow-xl">
                            <AvatarImage src={profile?.profile_photo || ""} className="object-cover" />
                            <AvatarFallback className="bg-white/5 text-primary text-4xl">
                                {user?.email?.[0].toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        {isUploadingPhoto && (
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        )}
                        <label
                            className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-black rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform active:scale-95 z-20"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera className="w-5 h-5 font-black" />
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            className={hideCard ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : ""}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {profile?.profile_photo ? "Değiştir" : "Fotoğraf Yükle"}
                        </Button>
                        {profile?.profile_photo && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleRemovePhoto}
                                disabled={isUploadingPhoto}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>


                <FormField
                    control={form.control}
                    name="job_title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white flex items-center justify-between">
                                Meslek / Ünvan
                                <span className="text-[10px] text-red-500/60 font-normal italic">Sosyal Akış için lütfen doldurunuz</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Örn: Yazılım Mühendisi"
                                    {...field}
                                    value={field.value || ""}
                                    className={hideCard ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 h-14 rounded-2xl" : ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="university"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white flex items-center justify-between">
                                Üniversite
                                <span className="text-[10px] text-red-500/60 font-normal italic">Sosyal Akış için lütfen doldurunuz</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Örn: Boğaziçi Üniversitesi"
                                    {...field}
                                    value={field.value || ""}
                                    className={hideCard ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 h-14 rounded-2xl" : ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="linkedin_url"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Linkedin Profili</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0077B5]" />
                                    <Input
                                        placeholder="https://www.linkedin.com/in/kullaniciadi"
                                        {...field}
                                        value={field.value || ""}
                                        className={hideCard ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 h-14 rounded-2xl pl-12" : "pl-12"}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Hakkımda (Biyografi)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Kendinizden bahsedin..."
                                    className={hideCard ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 rounded-2xl resize-none" : "resize-none"}
                                    rows={4}
                                    {...field}
                                    value={field.value || ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Doğum Tarihi</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ""}
                                    className={hideCard ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 h-14 rounded-2xl [color-scheme:dark]" : ""}
                                />
                            </FormControl>
                            <FormDescription className={hideCard ? "text-white/40" : ""}>
                                {currentAge !== null ? (
                                    <span className="text-primary font-medium">Sistemde sadece yaşınız ({currentAge}) gösterilecektir.</span>
                                ) : (

                                    "Girdiğiniz tarihe göre yaşınız hesaplanacak ve Sosyal Akış bölümünde diğer üyelere sadece yaşınız gösterilecektir."
                                )}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className={hideCard ? "flex justify-end" : ""}>
                    <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className={hideCard ? "w-full sm:w-auto h-14 px-8 rounded-2xl bg-primary text-black font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all" : "w-full sm:w-auto"}
                    >
                        {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Değişiklikleri Kaydet
                    </Button>
                </div>
            </form>
        </Form>
    );

    if (hideCard) {
        return formContent;
    }

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-sm border-gray-100">
            <CardHeader>
                <CardTitle>Sosyal Profil</CardTitle>
                <CardDescription>
                    Sosyal profiliniz başkalarıyla etkileşim kurarken görünür olur.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {formContent}
            </CardContent>
        </Card>
    );
}
