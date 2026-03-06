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
import { FileText, Download, Plus, Pencil, Trash2, Calendar, Upload, Loader2, Search, Clock, AlertCircle, ChevronRight, X, Layers, Zap } from "lucide-react";
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
  is_archived: boolean;
}

const WeeklyReports = () => {
  const { user, profile, isAdmin } = useAuth();
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
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

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
      const formattedData = (data as WeeklyReport[]) || [];
      setReports(formattedData);
      if (formattedData.length > 0 && !selectedReport && window.innerWidth > 1024) {
        setSelectedReport(formattedData[0]);
      }
    }
    setLoading(false);
  };

  const checkPermission = async () => {
    if (!user) { setCanReport(false); return; }
    try {
      if (isAdmin) { setCanReport(true); return; }
      const { data: isReportAdmin, error: reportError } = await supabase.rpc("has_role_text", { _user_id: user.id, _role: "report_admin" });
      setCanReport(!!isReportAdmin);
    } catch (err) {
      console.error("Permission check failed:", err);
      setCanReport(false);
    }
  };

  useEffect(() => {
    fetchReports();
    checkPermission();
  }, [user?.id, isAdmin]);

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
        const ext = file.name.split(".").pop()?.toLocaleLowerCase('tr-TR') || "pdf";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("weekly-reports")
          .upload(fileName, file, { contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("weekly-reports").getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
        fileType = ext;
      }

      const creatorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Bilinmeyen Kullanıcı';

      const record = {
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
        if (parts[1]) await supabase.storage.from("weekly-reports").remove([parts[1]]);
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

  const handleArchive = async (report: WeeklyReport) => {
    setArchiveLoading(true);
    try {
      const { error } = await supabase
        .from("weekly_reports")
        .update({ is_archived: !report.is_archived })
        .eq("id", report.id);

      if (error) throw error;

      toast.success(report.is_archived ? "Rapor arşivden çıkarıldı." : "Rapor arşive alındı.");
      fetchReports();
      if (selectedReport?.id === report.id) {
        setSelectedReport({ ...selectedReport, is_archived: !report.is_archived });
      }
    } catch (err: any) {
      toast.error("İşlem başarısız: " + err.message);
    } finally {
      setArchiveLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
      report.content?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'));

    // Admin/Report Admin sees based on showArchived filter
    // Regular users never see archived
    const isArchived = !!report.is_archived;
    if (canReport) {
      return matchesSearch && isArchived === showArchived;
    }
    return matchesSearch && !isArchived;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-white overflow-x-hidden font-body">
      <Navbar />

      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(245,158,11,0.05)_0%,transparent_40%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150" />
      </div>

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 pt-28 pb-12 flex flex-col h-screen max-h-screen overflow-hidden">

        {/* Sleek Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">Raporlama Merkezi</span>
              <div className="h-px w-12 bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-none">
              Haftalık <span className="text-gradient drop-shadow-[0_0_25px_rgba(245,158,11,0.2)]">Rapor</span>
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Raporlarda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-[320px] h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/[0.05] transition-all backdrop-blur-xl"
              />
            </div>
            {canReport && (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={openCreateDialog}
                className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center gap-3 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.6)] transition-all"
              >
                <Plus className="w-5 h-5 stroke-[3px]" />
                YENİ EKLE
              </motion.button>
            )}
          </div>
        </div>

        {/* Innovative Interactive Layout */}
        <div className="flex-1 flex gap-8 min-h-0 overflow-hidden relative">

          {/* List Sidebar */}
          <div className={`
            w-full lg:w-[420px] flex flex-col gap-4 transition-all duration-500 shrink-0
            ${isMobileDetailOpen ? 'translate-x-full absolute lg:relative lg:translate-x-0' : 'translate-x-0 relative'}
          `}>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">Kayıtlar / {filteredReports.length}</h2>
                {canReport && (
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 ml-2">
                    <button
                      onClick={() => setShowArchived(false)}
                      className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${!showArchived ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      AKTİF
                    </button>
                    <button
                      onClick={() => setShowArchived(true)}
                      className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${showArchived ? 'bg-amber-500 text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      ARŞİV
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-primary/40" />
                <div className="w-1 h-1 rounded-full bg-primary/20" />
                <div className="w-1 h-1 rounded-full bg-primary/10" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide lg:scrollbar-default pb-24 lg:pb-0">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 bg-white/5 rounded-[2rem] border border-white/5 animate-pulse" />
                ))
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] rounded-[2.5rem] border border-dashed border-white/10 group">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                    <FileText className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 font-bold tracking-tight">Kayıt Bulunamadı</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredReports.map((report) => (
                    <motion.div
                      layout
                      key={report.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      onClick={() => {
                        setSelectedReport(report);
                        if (window.innerWidth < 1024) setIsMobileDetailOpen(true);
                      }}
                      className={`
                        group relative p-6 rounded-[2rem] cursor-pointer transition-all duration-500 border
                        ${selectedReport?.id === report.id
                          ? 'bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-primary/30 shadow-[0_20px_40px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'}
                      `}
                    >
                      {selectedReport?.id === report.id && (
                        <motion.div
                          layoutId="sidebar-glow"
                          className="absolute inset-0 rounded-[2rem] bg-primary/5 blur-2xl -z-10"
                        />
                      )}

                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-display text-lg font-bold truncate transition-colors ${selectedReport?.id === report.id ? 'text-primary' : 'text-white/80 group-hover:text-white'}`}>
                            {report.title}
                          </h3>
                        </div>
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${selectedReport?.id === report.id ? 'bg-primary border-primary rotate-45' : 'bg-white/5 border-white/10'}`}>
                          <ChevronRight className={`w-4 h-4 transition-transform ${selectedReport?.id === report.id ? 'text-black' : 'text-white/40 group-hover:translate-x-0.5'}`} />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[10px] font-black tracking-widest text-white/60">
                          <Calendar className="w-3 h-3 text-primary" />
                          {new Date(report.week_start).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                        {report.file_url && (
                          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/80">
                            <Upload className="w-3 h-3" />
                            EKLENTİ
                          </div>
                        )}
                        {(() => {
                          const rpDate = new Date(report.week_start);
                          const diffTime = new Date().getTime() - rpDate.getTime();
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                          const remaining = 365 - diffDays;
                          return (
                            <div className="ml-auto flex flex-col items-end">
                              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Silinmesine Kalan Süre</span>
                              <span className={`text-[10px] font-black tracking-tight ${remaining < 30 ? 'text-amber-500' : 'text-white/40'}`}>
                                {remaining > 0 ? `${remaining} GÜN` : 'SÜRE DOLDU'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Detailed Content View */}
          <div className={`
            flex-1 h-full bg-white/[0.02] rounded-[3rem] border border-white/5 backdrop-blur-3xl overflow-hidden relative shadow-2xl flex flex-col z-20 transition-all duration-500
            ${isMobileDetailOpen ? 'translate-x-0 pointer-events-auto bg-black lg:bg-white/[0.02]' : 'translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto absolute lg:relative inset-0 lg:inset-auto'}
          `}>
            <AnimatePresence mode="wait">
              {selectedReport ? (
                <motion.div
                  key={selectedReport.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-col h-full"
                >
                  {/* Detail Header */}
                  <div className="p-8 md:p-12 pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-start justify-between gap-8 bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-6">
                        <button
                          onClick={() => setIsMobileDetailOpen(false)}
                          className="lg:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                          <Clock className="w-4 h-4" />
                          {new Date(selectedReport.week_start).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>

                      <h2 className="text-4xl md:text-5xl font-display font-black leading-tight text-white mb-6">
                        {selectedReport.title}
                      </h2>

                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-[1px]">
                            <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center text-[10px] font-black">
                              {selectedReport.creator_name?.[0]?.toUpperCase()}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Hazırlayan</span>
                            <span className="text-sm font-bold text-white/90">{selectedReport.creator_name}</span>
                          </div>
                        </div>

                        {canReport && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleArchive(selectedReport)}
                              disabled={archiveLoading}
                              className={`w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all ${selectedReport.is_archived ? 'text-amber-500 hover:bg-amber-500/10' : 'text-white/40 hover:text-primary'}`}
                              title={selectedReport.is_archived ? "Arşivden Çıkar" : "Arşive Al"}
                            >
                              <Layers className={`w-4 h-4 ${archiveLoading ? 'animate-pulse' : ''}`} />
                            </button>
                            <button onClick={() => openEditDialog(selectedReport)} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary transition-all">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(selectedReport)} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-destructive/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-destructive transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail Body */}
                  <div className="flex-1 overflow-y-auto p-8 md:p-12 pt-10 scrollbar-hide">
                    <div className="max-w-4xl mx-auto">
                      <div className="prose prose-invert prose-lg max-w-none">
                        {selectedReport.content ? (
                          <p className="text-white/70 leading-[1.8] text-lg font-medium whitespace-pre-wrap selection:bg-primary/40">
                            {selectedReport.content}
                          </p>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                            <AlertCircle className="w-12 h-12 text-white/10 mb-4" />
                            <p className="text-white/30 font-bold">Resmi metin içeriği girilmemiş.</p>
                          </div>
                        )}
                      </div>

                      {selectedReport.file_url && (
                        <div className="mt-16 group/doc">
                          <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-6">EK DOSYALAR</h4>
                          <a
                            href={selectedReport.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative p-1 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-white/5 to-white/5 group-hover/doc:from-primary/50 transition-all duration-500"
                          >
                            <div className="bg-[#0c0c0c] rounded-[2.4rem] p-8 flex items-center gap-6">
                              <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover/doc:scale-110 group-hover/doc:rotate-3 transition-transform duration-500 relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover/doc:opacity-100 transition-opacity" />
                                <FileText className="w-10 h-10 text-primary relative z-10" />
                              </div>
                              <div className="flex-1">
                                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest mb-2 border border-primary/20">
                                  {selectedReport.file_type?.toUpperCase()} BELGESİ
                                </span>
                                <h5 className="text-2xl font-display font-black text-white group-hover/doc:text-primary transition-colors">Faaliyet Dökümanı</h5>
                                <p className="text-white/30 text-sm font-bold mt-1">Görüntülemek için tıklayın</p>
                              </div>
                              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover/doc:bg-primary group-hover/doc:border-primary transition-all duration-500">
                                <Download className="w-6 h-6 text-white group-hover/doc:text-black" />
                              </div>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="relative mb-12">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 6, repeat: Infinity }}
                      className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-white/5 to-white/10 border border-white/10 flex items-center justify-center backdrop-blur-3xl relative z-10"
                    >
                      <Layers className="w-14 h-14 text-white/20" />
                    </motion.div>
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-display font-black text-white selection:bg-transparent">Rapor Seçin</h3>
                  <p className="text-white/30 font-bold mt-4 max-w-sm mx-auto leading-relaxed">
                    Sistemdeki güncel faaliyetleri detaylıca incelemek için sol panelden bir kayıt seçebilirsiniz.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating Info Footnote */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-2xl flex items-center gap-3">
        <Zap className="w-4 h-4 text-amber-500 fill-amber-500/30" />
        <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest whitespace-nowrap">
          Sistem Veri Politikası: <span className="text-white/60">Raporlar 1 yıl süreyle bulutta saklanır.</span>
        </p>
      </footer>

      {/* Futuristic Dialog Implementation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-2xl overflow-visible">
          <div className="relative w-full overflow-hidden rounded-[3rem] bg-[#0c0c0c] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            {/* Modal Header Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="absolute top-0 right-0 p-8">
              <button
                onClick={() => setDialogOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-10 md:p-14">
              <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-4">
                  {editingReport ? 'KAYIT GÜNCELLEME' : 'YENİ VERİ GİRİŞİ'}
                </div>
                <h2 className="text-4xl font-display font-black text-white">
                  {editingReport ? 'Rapor Bilgilerini' : 'Yeni Faaliyet'} <span className="text-primary italic">Düzenle</span>
                </h2>
              </div>

              <div className="grid gap-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Başlık</label>
                    <input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="..."
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">İşlem Tarihi</label>
                    <input
                      type="date"
                      value={formData.report_date}
                      onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Gövde Metni</label>
                  <textarea
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Detaylı rapor içeriği..."
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                </div>

                <div className="relative group/upload">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/40 transition-all cursor-pointer group-hover/upload:scale-[1.01]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover/upload:bg-primary group-hover/upload:transition-all">
                      <Upload className="w-6 h-6 text-primary group-hover/upload:text-black" />
                    </div>
                    <p className="text-sm font-black text-white/80">
                      {file ? file.name : (editingReport?.file_url ? 'BELGE YÜKLÜ (Değiştir)' : 'DÖKÜMAN EKLE')}
                    </p>
                    <p className="text-[10px] font-bold text-white/20 mt-2 uppercase tracking-widest">PDF, DOC, JPG Desteklenir</p>
                  </label>
                </div>

                <div className="flex gap-4 mt-4">
                  <button
                    disabled={saving}
                    onClick={handleSave}
                    className="flex-1 h-16 rounded-[2rem] bg-primary text-black font-black flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingReport ? 'GÜNCELLEMEYİ TAMAMLA' : 'SİSTEME KAYDET')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyReports;
