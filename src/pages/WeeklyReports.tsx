import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Plus, Pencil, Trash2, Calendar, Upload, Loader2, Search, LayoutGrid, List, Eye, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

interface WeeklyReport {
  id: string;
  title: string;
  week_start: string;
  week_end: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  created_by: string;
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
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("timeline");
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

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
      setReports(data || []);
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

  const fetchCreatorNames = async () => {
    const uniqueCreators = [...new Set(reports.map(r => r.created_by))];
    const names: Record<string, string> = {};
    
    for (const userId of uniqueCreators) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        
        if (data?.first_name || data?.last_name) {
          names[userId] = `${data?.first_name || ''} ${data?.last_name || ''}`.trim();
        } else {
          names[userId] = 'Bilinmeyen Kullanıcı';
        }
      } catch (err) {
        names[userId] = 'Bilinmeyen Kullanıcı';
      }
    }
    
    setCreatorNames(prev => ({ ...prev, ...names }));
  };

  useEffect(() => {
    if (reports.length > 0) {
      fetchCreatorNames();
    }
  }, [reports]);

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

      const record = {
        title: formData.title.trim(),
        week_start: formData.report_date,
        week_end: formData.report_date,
        content: formData.content.trim() || null,
        file_url: fileUrl,
        file_type: fileType,
        created_by: user!.id,
      };

      if (editingReport) {
        const { error } = await supabase.from("weekly_reports").update(record).eq("id", editingReport.id);
        if (error) throw error;
        toast.success("Rapor güncellendi.");
      } else {
        const { error } = await supabase.from("weekly_reports").insert(record);
        if (error) throw error;
        toast.success("Rapor oluşturuldu.");
      }

      setDialogOpen(false);
      
      // Oluşturan kullanıcı bilgisini hemen state'e ekle
      if (profile && user?.id) {
        const creatorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        if (creatorName) {
          setCreatorNames(prev => ({ ...prev, [user.id]: creatorName }));
        }
      }
      
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

  const stats = {
    total: reports.length,
    thisWeek: reports.filter(r => {
      const reportDate = new Date(r.week_start);
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return reportDate >= weekAgo && reportDate <= today;
    }).length,
    withFiles: reports.filter(r => r.file_url).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-10 -left-40 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/8 rounded-full blur-3xl"
            animate={{ y: [0, 60, 0], x: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -right-40 w-96 h-96 bg-gradient-to-br from-accent/15 to-primary/8 rounded-full blur-3xl"
            animate={{ y: [0, -60, 0], x: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, delay: 1 }}
          />
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <motion.div 
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/35 to-primary/8 shadow-lg shadow-primary/25 border border-primary/20"
                whileHover={{ scale: 1.15, rotate: 8 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <FileText className="h-7 w-7 text-primary font-bold" />
              </motion.div>
              <div>
                <h1 className="font-display text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent leading-tight">
                  Raporlar
                </h1>
                <p className="text-muted-foreground/80 mt-2 text-base md:text-lg font-medium">Çalışmanızın detaylı kaydı ve takibi</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Controls Section */}
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input 
                    placeholder="Raporlarda ara..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-gradient-to-br from-card/70 to-card/50 border-border/40 focus:border-primary/60 focus:ring-primary/30 focus:ring-2 rounded-xl transition-all shadow-sm hover:shadow-md"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="gap-2 h-11 px-4 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Kart</span>
                  </Button>
                  <Button 
                    variant={viewMode === "timeline" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("timeline")}
                    className="gap-2 h-11 px-4 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Liste</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">

                {canReport && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      className="gap-2 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/85 hover:to-primary/70 text-primary-foreground font-semibold h-11 px-6 rounded-xl"
                      onClick={openCreateDialog}
                    >
                      <Plus className="h-5 w-5" /> 
                      Yeni Rapor Oluştur
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Reports Section */}
      <section className="relative py-12 px-4 pb-20">
        <div className="container mx-auto max-w-7xl">
          {loading ? (
            <motion.div 
              className="flex flex-col items-center justify-center gap-4 py-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              >
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary" />
                </div>
              </motion.div>
              <motion.p 
                className="text-lg text-muted-foreground font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Raporlar yükleniyor...
              </motion.p>
            </motion.div>
          ) : filteredReports.length === 0 ? (
            <motion.div
              className="text-center py-24"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 shadow-lg mb-6 border border-border/30"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <FileText className="h-14 w-14 text-muted-foreground/30" />
              </motion.div>
              <p className="text-2xl font-display font-bold text-foreground mb-2">
                {searchTerm ? "Sonuç bulunamadı" : "Rapor bulunamadı"}
              </p>
              <p className="text-muted-foreground text-lg mb-6">
                {searchTerm 
                  ? "Aranılan kriterlere uygun raporlar mevcut değil." 
                  : canReport 
                    ? "İlk raporunuzu oluşturarak başlayın." 
                    : "Rapor yayınlanmamış."}
              </p>
              {canReport && !searchTerm && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={openCreateDialog}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold gap-2 h-12 px-8 rounded-xl shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    İlk Raporu Oluştur
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div 
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-max"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ staggerChildren: 0.08, delayChildren: 0.2 }}
            >
              <AnimatePresence>
                {filteredReports.map((report, i) => (
                  <motion.div 
                    key={report.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedReport(report)}
                    className="cursor-pointer h-full"
                  >
                    <Card
                      className={`border-border/40 bg-gradient-to-br from-card/95 via-card/90 to-card/80 backdrop-blur-xl shadow-lg transition-all h-full duration-300 group hover:shadow-2xl hover:border-primary/40 ${
                        selectedReport?.id === report.id 
                          ? "ring-2 ring-primary/60 shadow-2xl shadow-primary/20 border-primary/50 scale-105" 
                          : "hover:border-accent/40 hover:-translate-y-3"
                      }`}
                    >
                      <CardHeader className="pb-4 border-b border-border/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="rounded-xl bg-gradient-to-br from-primary/25 to-primary/8 p-3 group-hover:from-primary/30 group-hover:to-primary/12 transition-all flex-shrink-0 shadow-md border border-primary/15">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex items-center gap-2">
                            {report.file_url && (
                              <motion.div 
                                className="h-2 w-2 bg-accent rounded-full" 
                                title="Dosya ekli"
                              />
                            )}
                            {selectedReport?.id === report.id && (
                              <motion.div
                                className="h-2.5 w-2.5 bg-gradient-to-r from-primary to-accent rounded-full shadow-lg shadow-primary/50"
                                layoutId="activeIndicator"
                                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <CardTitle className="font-display text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors font-semibold">{report.title}</CardTitle>
                          <motion.div className="text-sm text-muted-foreground/80 mt-3 flex items-center gap-2 font-medium">
                            <Calendar className="h-4 w-4 text-primary/70" />
                            {new Date(report.week_start).toLocaleDateString("tr-TR", { 
                              day: "numeric", 
                              month: "short",
                              year: "numeric"
                            })}
                          </motion.div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {report.content && (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReport(report);
                                }}
                                className="text-xs bg-gradient-to-r from-green-500/25 to-green-500/10 text-green-700 px-3 py-1.5 rounded-full font-semibold border border-green-200/50 shadow-sm hover:shadow-md hover:from-green-500/35 transition-all cursor-pointer"
                              >
                                İçeriği Görüntüle
                              </motion.button>
                            )}
                            {report.file_url && (
                              <motion.span 
                                whileHover={{ scale: 1.05 }}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm ${
                                  report.file_type === 'pdf' 
                                    ? 'bg-red-500/15 text-red-600 border-red-200/50'
                                    : 'bg-blue-500/15 text-blue-600 border-blue-200/50'
                                }`}
                              >
                                {report.file_type?.toUpperCase() || "DOSYA"}
                              </motion.span>
                            )}
                          </div>
                          
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ staggerChildren: 0.05, delayChildren: 0.2 }}
            >
              <AnimatePresence>
                {filteredReports.map((report, i) => (
                  <motion.div 
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedReport(report)}
                    className="cursor-pointer group"
                  >
                    <div className={`flex gap-4 p-4 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                      selectedReport?.id === report.id 
                        ? "bg-gradient-to-r from-primary/15 via-primary/10 to-accent/8 border-primary/40 shadow-lg shadow-primary/10" 
                        : "bg-gradient-to-r from-card/60 to-card/40 border-border/30 hover:border-primary/30 hover:bg-gradient-to-r hover:from-card/70 hover:to-card/50"
                    }`}>
                      <div className="flex-shrink-0">
                        <motion.div 
                          className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-md"
                          whileHover={{ scale: 1.1 }}
                        >
                          <FileText className="h-6 w-6 text-primary" />
                        </motion.div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{report.title}</h3>
                          {selectedReport?.id === report.id && (
                            <motion.span className="inline-flex h-2 w-2 bg-primary rounded-full shadow-lg shadow-primary/50" layoutId="activeIndicator" />
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary/60" />
                            {new Date(report.week_start).toLocaleDateString("tr-TR", { 
                              day: "numeric",
                              month: "short", 
                              year: "numeric"
                            })}
                          </span>
                          {report.content && (
                            <span className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary px-2 py-1 rounded-full font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              İçerik
                            </span>
                          )}
                          {report.file_url && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                              report.file_type === 'pdf'
                                ? 'bg-red-500/15 text-red-600'
                                : 'bg-blue-500/15 text-blue-600'
                            }`}>
                              <Upload className="h-3 w-3" />
                              {report.file_type?.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {report.content && (
                          <p className="text-sm text-foreground/70 line-clamp-2 mb-3">{report.content}</p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {canReport && (
                          <>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(report);
                                }}
                                title="Düzenle"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(report);
                                }}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Stats Section - Bottom */}
          {!loading && reports.length > 0 && (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 pt-12 border-t border-border/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {[
                { label: "Toplam Rapor", value: stats.total, icon: FileText, color: "from-primary" },
                { label: "Bu Hafta", value: stats.thisWeek, icon: Calendar, color: "from-accent" },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className={`border-border/40 bg-gradient-to-br ${stat.color}/8 via-card/90 to-card/95 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all relative overflow-hidden group border-primary/20`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="pt-6 pb-6 relative z-10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                            <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                          </div>
                          <motion.div 
                            className={`h-12 w-12 rounded-full bg-gradient-to-br ${stat.color}/20 flex items-center justify-center`}
                            whileHover={{ scale: 1.2, rotate: 10 }}
                          >
                            <Icon className="h-6 w-6 text-foreground/70" />
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedReport(null);
              }}
            >
              <Card className="w-full max-w-3xl border-border/40 bg-gradient-to-br from-card/99 via-card/97 to-card/93 backdrop-blur-2xl shadow-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-primary/20">
                <CardHeader className="pb-6 border-b border-border/20 sticky top-0 bg-gradient-to-br from-card/99 via-card/97 to-card/93 backdrop-blur-xl z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <motion.div 
                        className="rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 p-3 flex-shrink-0 shadow-lg border border-primary/20"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <FileText className="h-7 w-7 text-primary" />
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="font-display text-2xl md:text-3xl text-foreground">{selectedReport.title}</CardTitle>
                        <div className="flex flex-col gap-2 mt-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 text-primary/60" />
                            {new Date(selectedReport.week_start).toLocaleDateString("tr-TR", { 
                              day: "numeric", 
                              month: "long", 
                              year: "numeric",
                              weekday: "long"
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {canReport && (
                        <>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                              onClick={() => {
                                openEditDialog(selectedReport);
                                setSelectedReport(null);
                              }}
                              title="Düzenle"
                            >
                              <Pencil className="h-5 w-5" />
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                              onClick={() => {
                                handleDelete(selectedReport);
                                setSelectedReport(null);
                              }}
                              title="Sil"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </motion.div>
                        </>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 hover:bg-muted/50"
                        onClick={() => setSelectedReport(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-8 pb-8 space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                  >
                    <div>
                      <h4 className="font-display font-semibold text-foreground text-lg mb-4 flex items-center gap-3">
                        <div className="h-1 w-6 bg-gradient-to-r from-primary to-accent rounded-full" />
                        Rapor İçeriği
                      </h4>
                      <div className="prose prose-sm max-w-none text-foreground/85 whitespace-pre-wrap bg-gradient-to-br from-primary/8 to-accent/4 p-6 rounded-xl border border-primary/15 leading-relaxed shadow-sm hover:shadow-md transition-shadow">
                        {selectedReport.content || "Bu raporda açıklama bulunmuyor."}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground/80">
                        <Clock className="h-4 w-4 text-primary/60" />
                        <span>{creatorNames[selectedReport.created_by] || 'Yükleniyor...'} tarafından {new Date(selectedReport.created_at).toLocaleDateString("tr-TR")} tarihinde oluşturuldu</span>
                      </div>
                    </div>
                  </motion.div>

                  {selectedReport.file_url && (
                    <motion.div
                      className="pt-4 border-t border-border/20"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 }}
                    >
                      <h4 className="font-display font-semibold text-foreground text-lg mb-4 flex items-center gap-3">
                        <div className="h-1 w-6 bg-gradient-to-r from-accent to-primary rounded-full" />
                        Ekli Dosya
                      </h4>
                      <motion.div whileHover={{ x: 6 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          variant="outline" 
                          className="gap-3 w-full group hover:border-primary/60 hover:bg-primary/8 transition-all rounded-xl h-12 text-base font-semibold shadow-md hover:shadow-lg border-border/40"
                          asChild
                        >
                          <a href={selectedReport.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-5 w-5 group-hover:scale-110 group-hover:-translate-y-1 transition-transform" />
                            <span>{selectedReport.file_type?.toUpperCase() || "Dosya"} Dosyasını İndir</span>
                          </a>
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}

                  {!selectedReport.content && !selectedReport.file_url && (
                    <motion.div
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                    >
                      <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground/60 italic text-lg">Bu raporda henüz içerik bulunmuyor</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl border-border/40 bg-gradient-to-br from-card/99 via-card/97 to-card/93 backdrop-blur-3xl shadow-2xl rounded-2xl border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-3">
              <motion.div 
                className="rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 p-2.5 shadow-lg border border-primary/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {editingReport ? (
                  <Pencil className="h-5 w-5 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 text-primary" />
                )}
              </motion.div>
              {editingReport ? "Raporu Düzenle" : "Yeni Rapor Oluştur"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Label className="font-semibold text-foreground text-sm">Başlık *</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Rapor başlığını girin..." 
                className="h-11 bg-gradient-to-br from-card/70 to-card/50 border-border/40 focus:border-primary/60 focus:ring-primary/30 focus:ring-2 rounded-lg transition-all placeholder:text-muted-foreground/50 shadow-sm"
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              <Label className="font-semibold text-foreground text-sm">Tarih *</Label>
              <Input 
                type="date" 
                value={formData.report_date} 
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })} 
                className="h-11 bg-gradient-to-br from-card/70 to-card/50 border-border/40 focus:border-primary/60 focus:ring-primary/30 focus:ring-2 rounded-lg transition-all shadow-sm"
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Label className="font-semibold text-foreground text-sm">İçerik</Label>
              <Textarea 
                rows={5}
                value={formData.content} 
                onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
                placeholder="Rapor içeriğini ayrıntılı olarak yazın..." 
                className="bg-gradient-to-br from-card/70 to-card/50 border-border/40 focus:border-primary/60 focus:ring-primary/30 focus:ring-2 rounded-lg transition-all placeholder:text-muted-foreground/50 resize-none shadow-sm"
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
            >
              <Label className="font-semibold text-foreground text-sm">Dosya (PDF, Word, vb.)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-11 bg-gradient-to-br from-card/70 to-card/50 border-border/40 focus:border-primary/60 focus:ring-primary/30 focus:ring-2 rounded-lg transition-all text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/25 cursor-pointer shadow-sm"
              />
              {file && (
                <motion.p 
                  className="text-sm text-accent font-medium flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle2 className="h-4 w-4" /> {file.name}
                </motion.p>
              )}
              {editingReport?.file_url && !file && (
                <p className="text-xs text-muted-foreground/70 flex items-center gap-2">
                  <Upload className="h-3 w-3" /> Mevcut dosya: {editingReport.file_type?.toUpperCase()}
                </p>
              )}
            </motion.div>

            <motion.div 
              className="flex gap-3 pt-4 border-t border-border/20"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                onClick={() => setDialogOpen(false)}
                variant="outline" 
                className="flex-1 h-11 rounded-lg border-border/50 hover:bg-card/50 transition-all font-semibold"
              >
                İptal
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button 
                  onClick={handleSave} 
                  className="w-full h-11 rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/85 hover:to-primary/70 text-primary-foreground font-semibold"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 
                      Kaydediliyor...
                    </>
                  ) : editingReport ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Güncelle
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Oluştur
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyReports;
