import React, { useEffect } from "react";
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
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
    social_name: z.string().min(2, "Sosyal ad en az 2 karakter olmalıdır"),
    birth_date: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    bio: z.string().max(500, "Biyografi en fazla 500 karakter olabilir").optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SocialProfileForm() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            social_name: "",
            birth_date: "",
            job_title: "",
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
                social_name: profile.social_name || "",
                birth_date: profile.birth_date || "",
                job_title: profile.job_title || "",
                bio: profile.bio || "",
            });
        }
    }, [profile, form]);

    const updateMutation = useMutation({
        mutationFn: async (values: ProfileFormValues) => {
            const { error } = await supabase
                .from("social_profiles")
                .update({
                    social_name: values.social_name,
                    birth_date: values.birth_date || null,
                    job_title: values.job_title || null,
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

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-sm border-gray-100">
            <CardHeader>
                <CardTitle>Sosyal Profil</CardTitle>
                <CardDescription>
                    Buradaki bilgileriniz, asıl isminizden bağımsızdır. Toplulukta diğer üyeler bu profilinizi görecektir.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="social_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sosyal İsim</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Toplulukta görünecek isminiz" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Gerçek isminizi veya takma adınızı kullanabilirsiniz. Bu değiştirildiğinde ana site hesap isminiz değişmez.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="birth_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Doğum Tarihi</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormDescription>
                                        {currentAge !== null ? (
                                            <span className="text-primary font-medium">Sistemde sadece yaşınız ({currentAge}) gösterilecektir.</span>
                                        ) : (
                                            "Girdiğiniz tarihe göre yaşınız hesaplanacak ve diğer üyelere sadece yaşınız gösterilecektir."
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="job_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Meslek / Ünvan</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Yazılım Mühendisi" {...field} value={field.value || ""} />
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
                                    <FormLabel>Hakkımda (Biyografi)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Kendinizden bahsedin..."
                                            className="resize-none"
                                            rows={4}
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
