import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Image as ImageIcon, X, LayoutGrid, Camera, Clock, Download, Maximize2 } from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import { getDaysUntilEvent } from "@/lib/date-utils";
import { generateUUID } from "@/lib/uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

interface EventMemoriesProps {
  eventId: string;
  isAttendee: boolean;
  eventDate: string;
}

interface MemoryWithProfile {
  id: string;
  event_id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

export const EventMemories: React.FC<EventMemoriesProps> = ({ eventId, isAttendee, eventDate }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<MemoryWithProfile | null>(null);
  
  // Gallery is visible to everyone once the event starts or anytime if photos exist
  const isEventTodayOrPassed = getDaysUntilEvent(eventDate) <= 0;

  const { data: memories, isLoading, isError, error } = useQuery({
    queryKey: ["event_memories", eventId],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("event_memories")
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      return data as unknown as MemoryWithProfile[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user || selectedFiles.length === 0) return;

      setIsUploading(true);
      let successCount = 0;
      try {
        for (const file of selectedFiles) {
          const compressedFile = await compressImage(file);
          const fileName = `${user.id}/${generateUUID()}.webp`;
          const filePath = `memories/${fileName}`;

          // Ensure bucket and path are correct
          const { error: uploadError } = await supabase.storage
            .from("event_memories")
            .upload(filePath, compressedFile, {
              contentType: "image/webp",
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("event_memories")
            .getPublicUrl(filePath);

          const { error: insertError } = await supabase.from("event_memories").insert({
            event_id: eventId,
            user_id: user.id,
            image_url: publicUrlData.publicUrl,
            caption: caption.trim() || null,
          });

          if (insertError) throw insertError;
          successCount++;
        }

        toast.success(`${successCount} fotoğraf başarıyla yüklendi!`);
        setUploadDialogOpen(false);
        resetUpload();
      } catch (err: any) {
        console.error("Upload error details:", err);
        toast.error(`Yükleme başarısız (${successCount} yüklendi): ` + (err.message || "Bilinmeyen hata"));
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_memories", eventId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: delError } = await supabase.from("event_memories").delete().eq("id", id);
      if (delError) throw delError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_memories", eventId] });
      toast.success("Fotoğraf silindi.");
    },
    onError: (err: any) => {
      toast.error("Silme başarısız: " + err.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles: File[] = [];
      const newUrls: string[] = [];

      files.forEach(file => {
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} 15MB'dan büyük olduğu için eklenmedi.`);
        } else {
          validFiles.push(file);
          newUrls.push(URL.createObjectURL(file));
        }
      });

      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setPreviewUrls(prev => [...prev, ...newUrls]);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        <p className="text-xs text-muted-foreground mt-4 font-medium tracking-widest uppercase">Medya Arşivi Yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="mt-8 border-none bg-red-500/5 shadow-inner">
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-red-600 font-bold">Medya arşivi şu an için erişilemez durumda.</p>
          <p className="text-xs text-red-400 mt-2">{(error as any)?.message || "Veritabanı bağlantı hatası"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section id="event-media-archive" className="mt-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <LayoutGrid className="h-7 w-7 text-primary" />
            Medya Arşivi
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Bu etkinlikten unutulmaz anlar ve fotoğraflar.</p>
          <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50/50 px-3 py-1.5 rounded-xl border border-amber-100/50 w-fit">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Medya içerikleri 1 ay sonra silinir. Lütfen saklamak istediklerinizi indiriniz.</p>
          </div>
        </div>

        {user && isEventTodayOrPassed && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95">
                <Plus className="h-5 w-5 mr-2" /> Fotoğraf Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-lg max-h-[95dvh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-0 bg-white/95 backdrop-blur-xl scrollbar-hide">
              <DialogHeader className="p-6 sm:p-8 bg-gradient-to-r from-primary/10 to-transparent">
                <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-white rounded-2xl shadow-sm text-primary">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  Anını Paylaş
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 sm:p-8 pt-2">
                {previewUrls.length === 0 ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-gray-200 rounded-[1.5rem] p-8 sm:p-16 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-gray-300 group-hover:text-primary/40">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <p className="text-base font-bold text-gray-700">Fotoğraf Yüklemek İçin Tıklayın</p>
                    <p className="text-sm text-gray-400 mt-1">Sadece bu etkinliğe ait kareler.</p>
                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left w-full mx-auto max-w-[90%]">
                      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">ÖNEMLi BiLGi</p>
                        <p className="text-sm font-medium text-amber-700/80 leading-snug">Medya içerikleri yükleme tarihinden 1 ay sonra sistemden tamamen silinir. Lütfen saklamak istediğiniz fotoğrafları indiriniz.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto p-1 scrollbar-hide">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group rounded-2xl overflow-hidden shadow-md aspect-square">
                          <img 
                            src={url} 
                            alt={`Önizleme ${index + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                          <button 
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl aspect-square cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all text-gray-300 hover:text-primary/40"
                      >
                        <Plus className="h-8 w-8" />
                        <span className="text-[10px] font-bold mt-1">Daha Fazla</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block ml-1">Açıklama</label>
                      <textarea
                        placeholder="Bu kareyi birkaç kelimeyle anlat..."
                        className="w-full p-4 border-none bg-gray-50 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner"
                        rows={3}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  className="hidden" 
                  multiple
                />

                <div className="flex justify-end gap-3 mt-8">
                  <Button variant="ghost" onClick={() => { setUploadDialogOpen(false); resetUpload(); }} className="rounded-xl font-bold text-gray-400 hover:text-gray-600">İptal</Button>
                  <Button 
                    disabled={selectedFiles.length === 0 || isUploading} 
                    onClick={() => uploadMutation.mutate()}
                    className="rounded-xl font-black px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : `Paylaş (${selectedFiles.length})`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-4 sm:p-6 border border-white/60 shadow-xl overflow-hidden min-h-[300px]">
        {memories && memories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence>
              {memories.map((memory, index) => (
                <motion.div 
                  key={memory.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-white shadow-sm bg-white"
                >
                  <img 
                    src={memory.image_url} 
                    alt={memory.caption || "Etkinlik anısı"} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                    {memory.caption && (
                      <p className="text-sm text-white font-medium line-clamp-3 mb-3 leading-snug">{memory.caption}</p>
                    )}
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white border border-white/20">
                          {memory.profiles?.first_name?.[0]?.toUpperCase()}
                       </div>
                       <span className="text-[11px] text-gray-200 font-bold tracking-wide">
                        {memory.profiles?.first_name} {memory.profiles?.last_name}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 flex flex-row flex-wrap justify-end gap-1 max-w-[80%]">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhoto(memory);
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-black/60 hover:scale-110 transition-all shadow-lg scale-0 group-hover:scale-100 duration-300"
                        title="Tam Boyut Görüntüle"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                      
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(memory.image_url);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = `event-memory-${memory.id}.webp`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            toast.error("İndirme başarısız oldu");
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-primary/80 backdrop-blur-md rounded-lg text-white hover:bg-primary hover:scale-110 transition-all shadow-lg scale-0 group-hover:scale-100 duration-300 delay-75"
                        title="İndir"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>

                      {user && (user.id === memory.user_id || user.email === "admin@admin.com") && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Bu fotoğrafı arşivden silmek istediğinize emin misiniz?")) {
                              deleteMutation.mutate(memory.id);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-red-500/90 backdrop-blur-md rounded-lg text-white hover:bg-red-600 hover:scale-110 transition-all shadow-lg scale-0 group-hover:scale-100 duration-300 delay-150"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-gray-200 shadow-inner">
              <ImageIcon className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-gray-800">Henüz Bir Şey Paylaşılmamış</h3>
            <p className="text-gray-400 mt-2 text-sm max-w-[280px] mx-auto leading-relaxed">Etkinlik anılarını burada biriktiriyoruz. İlk paylaşımı siz yapın!</p>
            {user && isEventTodayOrPassed && (
              <Button 
                variant="outline" 
                onClick={() => setUploadDialogOpen(true)}
                className="mt-8 rounded-2xl border-primary/20 text-primary font-bold hover:bg-primary/5 px-8"
              >
                Hemen Başla
              </Button>
            )}
            {!isEventTodayOrPassed && (
              <div className="mt-8 px-6 py-2 bg-amber-50 rounded-full border border-amber-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Etkinlik Tamamlanınca Açılacak</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Photo Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-[80vw] lg:max-w-5xl p-1 bg-black/95 backdrop-blur-3xl border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
          {selectedPhoto && (
            <div className="relative flex flex-col">
              <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                <button
                  onClick={async () => {
                    try {
                      // Trigger download with fetch
                      const response = await fetch(selectedPhoto.image_url);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.style.display = 'none';
                      a.href = url;
                      a.download = `event-memory-${selectedPhoto.id}.webp`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast.success("Fotoğraf indiriliyor...");
                    } catch (err) {
                      toast.error("İndirme başarısız oldu");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  <Download className="w-4 h-4" />
                  İndir
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full flex items-center justify-center min-h-[50vh] max-h-[85vh] p-2 md:p-8">
                <img 
                  src={selectedPhoto.image_url} 
                  alt="Full size memory" 
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl drop-shadow-2xl" 
                />
              </div>

              <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="flex items-end justify-between">
                  <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center text-sm font-black text-white shadow-lg backdrop-blur-md">
                      {selectedPhoto.profiles?.first_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-white font-bold leading-none mb-1 shadow-black drop-shadow-md">
                        {selectedPhoto.profiles?.first_name} {selectedPhoto.profiles?.last_name}
                      </h4>
                      <p className="text-white/60 text-xs font-medium">
                        {new Date(selectedPhoto.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedPhoto.caption && (
                  <p className="mt-4 text-white/90 text-sm md:text-base max-w-2xl font-medium leading-relaxed drop-shadow-md pointer-events-auto">
                    {selectedPhoto.caption}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
