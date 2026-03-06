import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Plus, Pencil, Trash2, Calendar, Upload, Loader2, Search, Clock, AlertCircle, ChevronRight, X } from "lucide-react";
import Navbar from "@/components/Navbar";

interface WeeklyReport {
  id: string;
  title: string;
  week_start: string;
  week_end: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  created_by: string | null;
  creator_name: string;
  created_at: string;
}

const WeeklyReports = () => {
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReport, setCanReport] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [formData, setFormData] = useState({ title: "", report_date: "", content: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("weekly_reports")
      .select("*")
      .gte("week_start", cutoff)
      .order("week_start", { ascending: false });

    if (error) {
      console.error("Failed to fetch reports:", error);
    } else {
      setReports((data as WeeklyReport[]) || []);
    }
    setLoading(false);
  };

  const checkPermission = async () => {
    if (!user) { setCanReport(false); return; }
    try {
      const { data: isAdmin, error: adminError } = await supabase.rpc("has_role_text", { _user_id: user.id, _role: "admin" });
      if (isAdmin && !adminError) { setCanReport(true); return; }

      const { data: isReportAdmin, error: reportError } = await supabase.rpc("has_role_text", { _user_id: user.id, _role: "report_admin" });
      if (reportError) {
        console.warn("Report admin check failed:", reportError);
        setCanReport(false);
      } else {
        setCanReport(!!isReportAdmin);
      }
    } catch (err) {
      console.error("Permission check failed:", err);
      setCanReport(false);
    }
  };

  useEffect(() => {
    fetchReports();
    checkPermission();
  }, [user?.id]);

  const openCreateDialog = () => {
    setEditingReport(null);
    setFormData({
      title: "",
      report_date: new Date().toISOString().split("T")[0],
      content: "",
    });
    setFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (report: WeeklyReport) => {
    setEditingReport(report);
    setFormData({
      title: report.title,
      report_date: report.week_start,
      content: report.content || "",
    });
    setFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { toast.error("Başlık gereklidir."); return; }
    if (!formData.report_date) { toast.error("Rapor tarihi gereklidir."); return; }
    if (!formData.content.trim() && !file && !editingReport?.file_url) {
      toast.error("İçerik veya dosya eklemelisiniz."); return;
    }

    setSaving(true);
    try {
      let fileUrl = editingReport?.file_url || null;
      let fileType = editingReport?.file_type || null;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("weekly-reports")
          .upload(fileName, file, { contentType: file.type });
        if (uploadError) { toast.error("Dosya yüklenemedi: " + uploadError.message); setSaving(false); return; }

        const { data: urlData } = supabase.storage.from("weekly-reports").getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
        fileType = ext;
      }

      let creatorName = 'Bilinmeyen Kullanıcı';
      if (profile) {
        creatorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || creatorName;
      }

      const record: any = {
        title: formData.title.trim(),
        week_start: formData.report_date,
        week_end: formData.report_date,
        content: formData.content.trim() || null,
        file_url: fileUrl,
        file_type: fileType,
        created_by: user!.id,
        creator_name: creatorName,
      };

      if (editingReport) {
        const { error } = await supabase.from("weekly_reports").update(record).eq("id", editingReport.id);
        if (error) throw error;
        toast.success("Rapor güncellendi.");
        if (selectedReport?.id === editingReport.id) {
          setSelectedReport({ ...selectedReport, ...record });
        }
      } else {
        const { error } = await supabase.from("weekly_reports").insert(record);
        if (error) throw error;
        toast.success("Rapor oluşturuldu.");
      }

      setDialogOpen(false);
      fetchReports();
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (report: WeeklyReport) => {
    if (!confirm("Bu raporu silmek istediğinizden emin misiniz?")) return;
    try {
      if (report.file_url) {
        const parts = report.file_url.split("/weekly-reports/");
        if (parts[1]) {
          await supabase.storage.from("weekly-reports").remove([parts[1]]);
        }
      }
      const { error } = await supabase.from("weekly_reports").delete().eq("id", report.id);
      if (error) throw error;
      toast.success("Rapor silindi.");
      if (selectedReport?.id === report.id) setSelectedReport(null);
      fetchReports();
    } catch (err: any) {
      toast.error("Silme başarısız: " + err.message);
    }
  };

  const filteredReports = reports
    .filter(report =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.week_start).getTime();
      const dateB = new Date(b.week_start).getTime();
      return dateB - dateA;
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background flex flex-col overflow-hidden">
      <Navbar />

      {/* Futuristic Background Blur Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.1, 1], x: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-accent/10 rounded-full blur-[100px]"
          animate={{ scale: [1, 1.2, 1], x: [0, -50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 pt-28 md:pt-32 flex flex-col z-10 min-h-[calc(100vh-8rem)]">

        {/* Minimalist Hero Row */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-display text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4"
            >
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 shadow-inner">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <span>
                Faaliyet <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Raporları</span>
              </span>
            </motion.h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full max-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Rapor ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 bg-card/40 backdrop-blur-xl border-border/30 focus:border-primary/50 focus:ring-primary/20 focus:ring-4 rounded-2xl transition-all shadow-sm"
              />
            </div>
            {canReport && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={openCreateDialog}
                  className="h-12 px-6 rounded-2xl gap-2 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-2xl shadow-foreground/20"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Yeni Rapor</span>
                </Button>
              </motion.div>
            )}
          </div>
        </header>

        {/* Master-Detail Split View */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">

          {/* Master List (Left Panel) */}
          <div className="w-full lg:w-[450px] flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                Tüm Kayıtlar <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">{filteredReports.length}</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-20 lg:pb-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <Loader2 className="w-8 h-8 text-primary/50 animate-spin" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm text-muted-foreground/60 p-6 text-center">
                  <FileText className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Bulunamadı</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredReports.map((report) => {
                    const isSelected = selectedReport?.id === report.id;
                    const rpDate = new Date(report.week_start);
                    return (
                      <motion.button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: isSelected ? 1 : 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full text-left p-4 rounded-3xl relative overflow-hidden transition-all duration-300 border ${isSelected
                          ? "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40 shadow-xl shadow-primary/10"
                          : "bg-card/40 backdrop-blur-xl border-border/30 hover:border-primary/20 hover:bg-card/60"
                          }`}
                      >
                        {/* Active selection glow layer */}
                        {isSelected && (
                          <motion.div
                            layoutId="active-indicator"
                            className="absolute inset-0 border-2 border-primary/50 rounded-3xl pointer-events-none"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}

                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-display font-bold text-base line-clamp-1 mb-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {report.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs font-semibold mt-2">
                              <span className={`px-2 py-1 rounded-md flex items-center gap-1.5 ${isSelected ? "bg-primary/20 text-primary-foreground/90" : "bg-muted/50 text-muted-foreground"}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {rpDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              </span>

                              {report.file_url && (
                                <span className="flex items-center gap-1 text-accent">
                                  <Upload className="w-3.5 h-3.5" /> Eklenti
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 shrink-0 transition-transform ${isSelected ? "text-primary translate-x-1" : "text-muted-foreground/30"}`} />
                        </div>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Detail View (Right Panel) */}
          <div className="flex-1 bg-card/30 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative flex flex-col">
            {/* Ambient inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-primary/10 blur-[80px] pointer-events-none" />

            <AnimatePresence mode="wait">
              {selectedReport ? (
                <motion.div
                  key={selectedReport.id}
                  initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
                  animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                  exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 40 }}
                  className="flex flex-col h-full z-10 p-6 md:p-10 overflow-y-auto custom-scrollbar"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4 border border-primary/20">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedReport.week_start).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h2 className="text-3xl md:text-5xl font-display font-black text-foreground drop-shadow-sm leading-tight">
                        {selectedReport.title}
                      </h2>
                      <div className="flex items-center gap-2 text-muted-foreground mt-4 text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        Oluşturan: <span className="text-foreground">{selectedReport.creator_name || 'Bilinmeyen'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {canReport && (
                        <>
                          <Button variant="outline" className="gap-2 rounded-xl backdrop-blur-md bg-background/50 border-white/10 hover:border-primary/40 text-primary h-10" onClick={() => openEditDialog(selectedReport)}>
                            <Pencil className="w-4 h-4" /> Düzenle
                          </Button>
                          <Button variant="outline" className="gap-2 rounded-xl backdrop-blur-md bg-destructive/5 hover:bg-destructive/10 border-destructive/20 text-destructive h-10" onClick={() => handleDelete(selectedReport)}>
                            <Trash2 className="w-4 h-4" /> Sil
                          </Button>
                        </>
                      )}
                      {/* Mobile Close Button */}
                      <Button variant="ghost" size="icon" className="lg:hidden rounded-xl self-end mt-2" onClick={() => setSelectedReport(null)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col gap-8">
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-foreground/80 font-medium">
                      {selectedReport.content ? (
                        <div className="whitespace-pre-wrap">{selectedReport.content}</div>
                      ) : (
                        <div className="flex items-center gap-3 p-6 rounded-2xl bg-muted/30 border border-dashed border-border/50 text-muted-foreground">
                          <AlertCircle className="w-6 h-6" /> Metin içeriği girilmemiş.
                        </div>
                      )}
                    </div>

                    {selectedReport.file_url && (
                      <div className="mt-auto pt-8">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Ekli Belge</h4>
                        <a href={selectedReport.file_url} target="_blank" rel="noopener noreferrer" download className="block">
                          <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex items-center p-5 rounded-2xl bg-gradient-to-r from-accent/10 to-primary/10 border border-primary/20 hover:border-primary/50 transition-all shadow-lg shadow-primary/5 group cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-xl bg-background flex items-center justify-center shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                              <FileText className="w-7 h-7 text-accent" />
                            </div>
                            <div className="ml-5 flex-1">
                              <h5 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                {selectedReport.file_type?.toUpperCase() || "BELGE"} FORMATINDA DOSYA
                              </h5>
                              <p className="text-sm text-muted-foreground font-medium mt-1">İndirmek için tıklayın</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                              <Download className="w-5 h-5" />
                            </div>
                          </motion.div>
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col items-center justify-center text-center p-8 z-10"
                >
                  <motion.div
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center shadow-2xl backdrop-blur-xl border border-white/10 mb-8 rotation-3d">
                      <FileText className="w-16 h-16 text-primary/60" />
                    </div>
                  </motion.div>
                  <h3 className="font-display font-black text-3xl tracking-tight text-foreground/80">İncelemek İçin Seçin</h3>
                  <p className="text-muted-foreground font-medium mt-3 max-w-sm mx-auto">
                    Soldaki listeden bir rapor seçerek tüm detayları, içerikleri ve eklentileri buradan holografik hızda görüntüleyebilirsiniz.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Info Banner at absolute bottom */}
      <footer className="w-full bg-amber-500/10 border-t border-amber-500/20 px-4 py-3 shrink-0 z-20">
        <div className="container mx-auto flex items-center justify-center gap-3 text-amber-600/90 text-xs md:text-sm font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>Sistemdeki raporlar 1 yıl (365 gün) saklanır. Süresi dolanlar veri politikasınca otomatik silinir.</p>
        </div>
      </footer>

      {/* Create/Edit Dialog Modal remains unchanged under the hood */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl border-border/40 bg-gradient-to-br from-card/99 via-card/97 to-card/93 backdrop-blur-3xl shadow-2xl rounded-[2rem] border-primary/20 p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-display text-3xl font-black flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 p-3 shadow-lg border border-primary/20">
                {editingReport ? <Pencil className="h-6 w-6 text-primary" /> : <Plus className="h-6 w-6 text-primary" />}
              </div>
              {editingReport ? "Raporu Düzenle" : "Yeni Rapor Ekle"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-foreground opacity-90">Rapor Başlığı</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Örn: Haftalık Şantiye İlerlemesi"
                className="h-12 bg-black/5 dark:bg-white/5 border-transparent focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all font-medium text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-foreground opacity-90">Tarih</Label>
              <Input
                type="date"
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                className="h-12 bg-black/5 dark:bg-white/5 border-transparent focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all font-medium text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-foreground opacity-90">İçerik</Label>
              <Textarea
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Rapor içerik metnini buraya yapıştırabilirsiniz..."
                className="bg-black/5 dark:bg-white/5 border-transparent focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all font-medium text-base resize-none"
              />
            </div>

            <div className="space-y-2 border border-dashed border-primary/30 rounded-2xl p-4 bg-primary/5">
              <Label className="font-bold text-primary flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4" /> Belge Yükle
              </Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer text-muted-foreground border-0 bg-transparent h-auto p-0"
              />
              {editingReport?.file_url && !file && (
                <p className="text-xs text-muted-foreground mt-3 font-semibold px-2">
                  ✓ Mevcut ek yüklü: {editingReport.file_type?.toUpperCase()}
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4 mt-8">
              <Button onClick={() => setDialogOpen(false)} variant="ghost" className="h-12 flex-1 rounded-xl font-bold bg-muted/50 hover:bg-muted">
                Vazgeç
              </Button>
              <Button onClick={handleSave} disabled={saving} className="h-12 flex-1 rounded-xl gap-2 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/20">
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</>
                ) : (
                  <>{editingReport ? "Güncelle" : "Oluştur"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyReports;
