import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, Edit2, Info, User as UserIcon, CalendarDays, Users, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import LoadingScreen from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";

export default function Budget() {
  const { user, profile, isAdmin, hasBudgetRole, loading } = useAuth();
  const queryClient = useQueryClient();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Expense form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [spentBy, setSpentBy] = useState("");
  const [isSpentByOpen, setIsSpentByOpen] = useState(false);
  const [eventId, setEventId] = useState("none");

  // Dues state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isEditDuesOpen, setIsEditDuesOpen] = useState(false);
  const [isEditMembersOpen, setIsEditMembersOpen] = useState(false);
  const [newDuesAmount, setNewDuesAmount] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Budget form state
  const [newTotalBudget, setNewTotalBudget] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "income" | "expense">("all");

  // Dues payment dialog state
  const [isDuesPaymentDialogOpen, setIsDuesPaymentDialogOpen] = useState(false);
  const [pendingDuesPayment, setPendingDuesPayment] = useState<{ userId: string, month: number } | null>(null);
  const [duesPaymentAmount, setDuesPaymentAmount] = useState("");
  const [distributePayment, setDistributePayment] = useState(true);

  // Cancel payment dialog state
  const [isCancelPaymentDialogOpen, setIsCancelPaymentDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<{ userId: string, month: number } | null>(null);

  useEffect(() => {
    if (profile?.id && !spentBy) {
      setSpentBy(profile.id);
    }
  }, [profile, spentBy]);

  const canManageBudget = isAdmin || hasBudgetRole;

  // Fetch Budget Settings
  const { data: budgetSettings, isLoading: loadingBudget } = useQuery({
    queryKey: ["budgetSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // ignore no rows error
      return data || { total_budget: 0, dues_amount: 100, id: null as unknown as string, updated_at: null, updated_by: null };
    },
  });

  // Fetch Dues Payments
  const { data: duesPayments, isLoading: loadingDues } = useQuery({
    queryKey: ["duesPayments", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dues_payments")
        .select("*")
        .eq("year", selectedYear);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: duesMembers, isLoading: loadingDuesMembers } = useQuery({
    queryKey: ["duesMembers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dues_members").select("user_id");
      if (error) throw error;
      return data?.map(d => d.user_id) || [];
    },
  });

  // Fetch Expenses
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          description,
          created_at,
          created_by,
          profiles!expenses_spent_by_user_id_fkey (
            id,
            first_name,
            last_name
          ),
          events (
            id,
            title
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch All Dues Payments for History
  const { data: allDuesPaymentsHistory, isLoading: loadingAllDuesHistory } = useQuery({
    queryKey: ["allDuesPaymentsHistory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dues_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const combinedHistory = [
    ...(expenses || []).map(e => ({ ...e, isExpense: true as const })),
    ...(allDuesPaymentsHistory || [])
      .filter(d => d.created_by === d.user_id)
      .map(d => ({ ...d, isExpense: false as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


  // Fetch Users for Select
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch Events for Select
  const { data: eventList } = useQuery({
    queryKey: ["budgetEventsList"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const budgetStartDate = budgetSettings?.updated_at;

  const relevantExpenses = expenses?.filter(exp => {
    if (!budgetStartDate) return true;
    return new Date(exp.created_at) >= new Date(budgetStartDate);
  }) || [];

  const relevantSpent = relevantExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalSpentAllTime = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  // Calculate total dues collected (only count ones collected AFTER budgetStartDate to be consistent)
  // Note: The requirement is that if an admin checks a user's dues, it shouldn't add to the budget.
  // If the user checks it themselves, it adds to the budget.
  const relevantDues = allDuesPaymentsHistory?.filter(d => {
    if (!budgetStartDate) return true;
    return new Date(d.created_at) >= new Date(budgetStartDate);
  }) || [];

  const relevantDuesCollected = relevantDues.reduce((sum, d) => {
    // Only add to budget if the user marked it themselves (created_by === user_id)
    if (d.created_by === d.user_id) {
      return sum + Number(d.amount);
    }
    return sum;
  }, 0);

  const currentBudget = Number(budgetSettings?.total_budget || 0) + relevantDuesCollected - relevantSpent;

  // Mutations
  const updateBudgetMutation = useMutation({
    mutationFn: async (newBudget: number) => {
      if (budgetSettings?.id) {
        const { error } = await supabase
          .from("budget_settings")
          .update({ total_budget: newBudget, updated_at: new Date().toISOString(), updated_by: user.id })
          .eq("id", budgetSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budget_settings")
          .insert([{ total_budget: newBudget, updated_by: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetSettings"] });
      setIsEditBudgetOpen(false);
      toast.success("Bütçe güncellendi");
    },
    onError: (error: Error) => {
      toast.error("Bütçe güncellenirken hata oluştu: " + error.message);
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("expenses")
        .insert([{
          amount: Number(amount),
          description,
          spent_by_user_id: spentBy,
          event_id: eventId === "none" ? null : eventId,
          created_by: user.id
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsExpenseDialogOpen(false);
      resetExpenseForm();
      toast.success("Harcama eklendi");
    },
    onError: (error: Error) => {
      toast.error("Harcama eklenirken hata oluştu: " + error.message);
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!editingExpenseId) return;
      const { error } = await supabase
        .from("expenses")
        .update({
          amount: Number(amount),
          description,
          spent_by_user_id: spentBy,
          event_id: eventId === "none" ? null : eventId,
        })
        .eq("id", editingExpenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsExpenseDialogOpen(false);
      resetExpenseForm();
      toast.success("Harcama güncellendi");
    },
    onError: (error: Error) => {
      toast.error("Harcama güncellenirken hata oluştu: " + error.message);
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Harcama silindi");
    },
    onError: (error: Error) => {
      toast.error("Harcama silinirken hata oluştu: " + (error.message || "Erişim reddedildi"));
    }
  });

  const toggleDuesMutation = useMutation({
    mutationFn: async ({ userId, month, amount, distribute }: { userId: string, month: number, amount?: number, distribute?: boolean }) => {
      const existing = duesPayments?.find(p => p.user_id === userId && p.year === selectedYear && p.month === month);
      if (existing) {
        const { error } = await supabase.from("dues_payments").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const baseDues = budgetSettings?.dues_amount || 100;
        const totalAmount = amount !== undefined ? amount : baseDues;
        const inserts = [];

        if (distribute && totalAmount > baseDues) {
          let remainingAmount = totalAmount;
          let currentMonth = month;
          let currentYear = selectedYear;

          while (remainingAmount >= baseDues) {
            const isAlreadyPaid = allDuesPaymentsHistory?.some(p => p.user_id === userId && p.year === currentYear && p.month === currentMonth);

            if (!isAlreadyPaid) {
              inserts.push({
                user_id: userId,
                year: currentYear,
                month: currentMonth,
                amount: baseDues,
                created_by: isEditMode ? user?.id : userId
              });
              remainingAmount -= baseDues;
            }

            currentMonth++;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear++;
            }
            if (currentYear > selectedYear + 10) break; // safety
          }

          // Kalan küsurat varsa son ödenen aya ekle ki para kaybolmasın ama yarım tik atılmasın
          if (remainingAmount > 0) {
            if (inserts.length > 0) {
              inserts[inserts.length - 1].amount += remainingAmount;
            } else {
              inserts.push({
                user_id: userId,
                year: selectedYear,
                month,
                amount: remainingAmount,
                created_by: isEditMode ? user?.id : userId
              });
            }
          }
        } else {
          inserts.push({
            user_id: userId,
            year: selectedYear,
            month,
            amount: totalAmount,
            created_by: isEditMode ? user?.id : userId
          });
        }

        if (inserts.length > 0) {
          const { error } = await supabase.from("dues_payments").insert(inserts);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duesPayments", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["allDuesPaymentsHistory"] });
    },
    onError: (error: Error) => {
      toast.error("Aidat durumu güncellenirken hata oluştu: " + error.message);
    }
  });

  const updateDuesAmountMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (budgetSettings?.id) {
        const { error } = await supabase
          .from("budget_settings")
          .update({ dues_amount: amount })
          .eq("id", budgetSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budget_settings")
          .insert([{ dues_amount: amount, updated_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetSettings"] });
      setIsEditDuesOpen(false);
      toast.success("Aidat ücreti güncellendi");
    },
    onError: (error: Error) => {
      toast.error("Aidat güncellenirken hata: " + error.message);
    }
  });

  const toggleDuesMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (duesMembers?.includes(userId)) {
        const { error } = await supabase.from("dues_members").delete().eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dues_members").insert([{ user_id: userId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duesMembers"] });
    },
    onError: (error: Error) => {
      toast.error("Üye güncellenirken hata oluştu: " + error.message);
    }
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Lütfen geçerli bir tutar girin");
      return;
    }
    if (editingExpenseId) {
      updateExpenseMutation.mutate();
    } else {
      addExpenseMutation.mutate();
    }
  };

  const resetExpenseForm = () => {
    setAmount("");
    setDescription("");
    setSpentBy(profile?.id || "");
    setEventId("none");
    setEditingExpenseId(null);
  };

  const openAddExpense = () => {
    resetExpenseForm();
    setIsExpenseDialogOpen(true);
  };

  const openEditExpense = (expense: { id: string; amount: number | string; description: string | null; created_by: string; profiles?: { id?: string } | { id?: string }[]; events?: { id?: string } | { id?: string }[] }) => {
    setAmount(expense.amount.toString());
    setDescription(expense.description || "");

    // Extract user ID from relation properly
    let userId = "";
    if (expense.profiles) {
      userId = Array.isArray(expense.profiles) ? expense.profiles[0]?.id : expense.profiles?.id;
    }
    setSpentBy(userId || expense.created_by);

    // Extract event ID properly
    let evId = "none";
    if (expense.events) {
      evId = Array.isArray(expense.events) ? expense.events[0]?.id : expense.events?.id;
    }
    setEventId(evId || "none");

    setEditingExpenseId(expense.id);
    setIsExpenseDialogOpen(true);
  };

  const handleUpdateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(newTotalBudget)) || Number(newTotalBudget) < 0) {
      toast.error("Lütfen geçerli bir bütçe tutarı girin");
      return;
    }
    updateBudgetMutation.mutate(Number(newTotalBudget));
  };

  const handleUpdateDuesAmount = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(newDuesAmount)) || Number(newDuesAmount) < 0) {
      toast.error("Lütfen geçerli bir tutar girin");
      return;
    }
    updateDuesAmountMutation.mutate(Number(newDuesAmount));
  };

  // Check auth AFTER all hooks have been called
  if (loading) return <LoadingScreen />;
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const filteredHistory = combinedHistory.filter(item => {
    if (historyFilter === "income" && item.isExpense) return false;
    if (historyFilter === "expense" && !item.isExpense) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-4 sm:px-6">
      <Navbar />
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Bütçe Yönetimi</h1>
              <p className="text-white/60 text-sm mt-1">Topluluk bütçesini ve harcamalarını takip edin</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl mb-8 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="expenses" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold py-2">Bütçe</TabsTrigger>
            <TabsTrigger value="dues" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold py-2">Aidat Takibi</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="h-16 w-16 text-emerald-400" /></div>
                <div className="p-3 bg-emerald-500/20 rounded-xl"><Wallet className="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Mevcut Bütçe</p>
                  <p className={cn("text-2xl font-black", currentBudget >= 0 ? "text-emerald-400" : "text-red-400")}>₺{currentBudget.toLocaleString("tr-TR")}</p>
                  {canManageBudget && (
                    <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
                      <DialogTrigger asChild>
                        <button className="text-emerald-400/60 hover:text-emerald-400 text-[10px] font-medium mt-0.5 flex items-center gap-1 transition-colors"><Edit2 className="w-2.5 h-2.5" /> Düzenle</button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border border-white/10 text-white">
                        <DialogHeader><DialogTitle>Mevcut Bütçeyi Güncelle</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpdateBudget} className="space-y-4 pt-4">
                          <div className="space-y-2"><Label>Yeni Mevcut Bütçe (₺)</Label><Input type="number" value={newTotalBudget} onChange={(e) => setNewTotalBudget(e.target.value)} placeholder="0" className="bg-black/50 border-white/10" /></div>
                          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={updateBudgetMutation.isPending}>{updateBudgetMutation.isPending ? "Kaydediliyor..." : "Kaydet"}</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl"><TrendingUp className="w-5 h-5 text-red-400 rotate-180" /></div>
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Toplam Harcama</p>
                  <p className="text-2xl font-black text-white">₺{totalSpentAllTime.toLocaleString("tr-TR")}</p>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/5 rounded-lg"><CalendarDays className="w-4 h-4 text-white/60" /></div>
                    <h3 className="text-base font-bold">İşlem Geçmişi</h3>
                  </div>
                  <div className="flex bg-black/50 p-0.5 rounded-lg border border-white/10">
                    {[{ key: "all" as const, label: "Tümü" }, { key: "income" as const, label: "Gelirler" }, { key: "expense" as const, label: "Giderler" }].map(f => (
                      <button key={f.key} onClick={() => setHistoryFilter(f.key)} className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", historyFilter === f.key ? "bg-emerald-500 text-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => { setIsExpenseDialogOpen(open); if (!open) resetExpenseForm(); }}>
                  <DialogTrigger asChild>
                    <Button onClick={openAddExpense} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Yeni Harcama</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
                    <DialogHeader><DialogTitle>{editingExpenseId ? "Harcamayı Düzenle" : "Yeni Harcama Gir"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddExpense} className="space-y-4 pt-4">
                      <div className="space-y-2"><Label>Harcama Tutarı (₺)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Örn: 500" className="bg-black/50 border-white/10" required /></div>
                      <div className="space-y-2"><Label>Açıklama</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Harcama detayları..." className="bg-black/50 border-white/10 min-h-[80px]" /></div>
                      <div className="space-y-2 flex flex-col">
                        <Label>Kim Tarafından Harcandı?</Label>
                        <Popover open={isSpentByOpen} onOpenChange={setIsSpentByOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isSpentByOpen} className="w-full justify-between bg-black/50 border-white/10 text-white font-normal hover:bg-white/5 hover:text-white">
                              {spentBy && users ? `${users.find((u) => u.id === spentBy)?.first_name} ${users.find((u) => u.id === spentBy)?.last_name}` : "Kişi arayın veya seçin..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#0c0c0c] border-white/10 !z-[9999]">
                            <Command className="bg-transparent border-none">
                              <CommandInput placeholder="Kişi ara..." className="text-white border-none focus:ring-0" />
                              <CommandList className="custom-scrollbar">
                                <CommandEmpty className="py-6 text-center text-sm text-white/50">Kişi bulunamadı.</CommandEmpty>
                                <CommandGroup>
                                  {users?.map((u) => (
                                    <CommandItem key={u.id} value={`${u.first_name} ${u.last_name}`} onSelect={() => { setSpentBy(u.id); setIsSpentByOpen(false); }} className="text-white hover:bg-white/10 cursor-pointer rounded-xl font-bold py-3 px-4 my-1 data-[selected=true]:bg-white/10 data-[selected=true]:text-white">
                                      <Check className={cn("mr-2 h-4 w-4 text-emerald-400", spentBy === u.id ? "opacity-100" : "opacity-0")} />
                                      {u.first_name} {u.last_name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>İlgili Etkinlik (Opsiyonel)</Label>
                        <Select value={eventId} onValueChange={setEventId}>
                          <SelectTrigger className="bg-black/50 border-white/10"><SelectValue placeholder="Etkinlik seçin" /></SelectTrigger>
                          <SelectContent className="bg-[#0c0c0c] border-white/10 max-h-60 !z-[9999] !opacity-100 !visible p-2 rounded-2xl">
                            <SelectItem value="none" className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">Etkinlik Bağımsız</SelectItem>
                            {eventList?.map((ev) => (<SelectItem key={ev.id} value={ev.id} className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">{ev.title} ({new Date(ev.date).toLocaleDateString("tr-TR")})</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold mt-2" disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}>{addExpenseMutation.isPending || updateExpenseMutation.isPending ? "Kaydediliyor..." : (editingExpenseId ? "Güncelle" : "Harcama Ekle")}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="p-0">
                {loadingExpenses || loadingAllDuesHistory ? (
                  <div className="p-10 text-center text-white/40 text-sm">Yükleniyor...</div>
                ) : filteredHistory && filteredHistory.length > 0 ? (
                  <div className="divide-y divide-white/[0.04]">
                    {filteredHistory.map((item) => {
                      if (item.isExpense) {
                        const expense = item as Extract<typeof combinedHistory[number], { isExpense: true }>;
                        const spentUser = Array.isArray(expense.profiles) ? expense.profiles[0] : expense.profiles;
                        const canModify = expense.created_by === user?.id || isAdmin || hasBudgetRole;
                        return (
                          <div key={`exp-${expense.id}`} className="p-4 sm:p-5 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors group border-l-2 border-transparent hover:border-red-500/50">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl shrink-0"><Wallet className="w-4 h-4" /></div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-base text-red-400">-₺{Number(expense.amount).toLocaleString("tr-TR")}</span>
                                  <span className="text-white/30 text-xs">{new Date(expense.created_at).toLocaleDateString("tr-TR")}</span>
                                </div>
                                {expense.description && <p className="text-white/60 text-sm mt-1 line-clamp-2">{expense.description}</p>}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full"><UserIcon className="w-2.5 h-2.5" />{spentUser?.first_name} {spentUser?.last_name}</span>
                                  {expense.events && <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded-full"><CalendarDays className="w-2.5 h-2.5" />{Array.isArray(expense.events) ? expense.events[0]?.title : expense.events?.title}</span>}
                                </div>
                              </div>
                            </div>
                            {canModify && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button variant="ghost" size="icon" className="text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg h-7 w-7" onClick={() => openEditExpense(expense)}><Edit2 className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-7 w-7" onClick={() => { if (window.confirm("Bu harcamayı silmek istediğinize emin misiniz?")) deleteExpenseMutation.mutate(expense.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        const dueItem = item as Extract<typeof combinedHistory[number], { isExpense: false }>;
                        const dueUser = users?.find(u => u.id === dueItem.user_id);
                        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                        const isSelfPaid = dueItem.created_by === dueItem.user_id;
                        return (
                          <div key={`due-${dueItem.id}`} className={cn("p-4 sm:p-5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors border-l-2 border-transparent", isSelfPaid ? "hover:border-emerald-500/50" : "hover:border-white/20")}>
                            <div className={cn("p-2.5 rounded-xl shrink-0", isSelfPaid ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30")}><Wallet className="w-4 h-4" /></div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("font-bold text-base", isSelfPaid ? "text-emerald-400" : "text-white/30")}>{isSelfPaid ? `+₺${Number(dueItem.amount).toLocaleString("tr-TR")}` : `₺0`}</span>
                                {!isSelfPaid && <span className="text-[10px] border border-white/10 bg-white/5 px-1.5 py-0.5 rounded text-white/40">Admin</span>}
                                <span className="text-white/30 text-xs">{new Date(dueItem.created_at).toLocaleDateString("tr-TR")}</span>
                              </div>
                              <p className="text-white/50 mt-1 text-sm">
                                <span className={isSelfPaid ? "text-emerald-400/80" : "text-white/50"}>{dueUser?.first_name} {dueUser?.last_name}</span> — {dueItem.year} {months[dueItem.month - 1]} aidatı {isSelfPaid ? 'ödendi' : 'işaretlendi'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <div className="p-14 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 text-white/15"><Wallet className="w-6 h-6" /></div>
                    <h4 className="text-sm font-bold text-white/70 mb-1">Henüz İşlem Yok</h4>
                    <p className="text-white/30 text-xs max-w-[250px]">Sisteme girilen harcamalar ve ödenen aidatlar burada listelenecektir.</p>
                  </div>
                )}
              </div>
            </div>

          </TabsContent>

          <TabsContent value="dues" className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Stats */}
            {(() => {
              const totalDuesMembers = users?.filter(u => duesMembers?.includes(u.id)).length || 0;
              const currentMonth = new Date().getMonth() + 1;
              const currentYear = new Date().getFullYear();
              const paidThisMonth = new Set(duesPayments?.filter(p => p.month === currentMonth && p.year === currentYear).map(p => p.user_id)).size;
              const paymentRate = totalDuesMembers > 0 ? Math.round((paidThisMonth / totalDuesMembers) * 100) : 0;
              const currentMonthDuesCollected = allDuesPaymentsHistory?.filter(d => d.month === currentMonth && d.year === currentYear).reduce((sum, d) => sum + Number(d.amount), 0) || 0;
              const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl"><Wallet className="w-5 h-5 text-emerald-400" /></div>
                    <div>
                      <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{monthNames[currentMonth - 1]} Ayında Toplanan Aidat</p>
                      <p className="text-2xl font-black text-emerald-400">₺{currentMonthDuesCollected.toLocaleString("tr-TR")}</p>
                      <p className="text-white/30 text-[10px] mt-0.5">Aylık aidat: ₺{Number(budgetSettings?.dues_amount || 100).toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl"><TrendingUp className="w-5 h-5 text-amber-400" /></div>
                    <div>
                      <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{monthNames[currentMonth - 1]} Ayı Tahsilat Oranı</p>
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-black text-white">%{paymentRate}</p>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${paymentRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Toolbar */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
                    <SelectTrigger className="bg-black/50 border-white/10 w-28 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c0c0c] border-white/10 !z-[9999] rounded-2xl">
                      {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <SelectItem key={y} value={y.toString()} className="cursor-pointer hover:bg-white/10 rounded-xl">{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  {canManageBudget && (
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors", isEditMode ? "bg-amber-500/10 border-amber-500/30" : "bg-black/50 border-white/10")}>
                      <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                      <Label htmlFor="edit-mode" className={cn("text-sm cursor-pointer whitespace-nowrap font-medium", isEditMode ? "text-amber-400" : "text-white/70")}>
                        Düzenleme Modu
                      </Label>
                    </div>
                  )}
                </div>
                {canManageBudget && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={isEditDuesOpen} onOpenChange={setIsEditDuesOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-black/50 border-white/10 hover:bg-white/5 rounded-xl gap-1.5 text-xs">
                          <Edit2 className="w-3 h-3" /> Aidat Tutarı
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
                        <DialogHeader><DialogTitle>Aidat Ücretini Güncelle</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpdateDuesAmount} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Yeni Aidat Tutarı (₺)</Label>
                            <Input type="number" value={newDuesAmount} onChange={(e) => setNewDuesAmount(e.target.value)} placeholder={budgetSettings?.dues_amount?.toString() || "100"} className="bg-black/50 border-white/10" required />
                          </div>
                          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={updateDuesAmountMutation.isPending}>
                            {updateDuesAmountMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isEditMembersOpen} onOpenChange={setIsEditMembersOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-black/50 border-white/10 hover:bg-white/5 rounded-xl gap-1.5 text-xs">
                          <Users className="w-3 h-3" /> Üyeleri Seç
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
                        <DialogHeader><DialogTitle>Aidat Ödeyenleri Belirle</DialogTitle></DialogHeader>
                        <ScrollArea className="h-[300px] w-full rounded-md border border-white/10 p-4 mt-4">
                          {users?.map(u => (
                            <div key={u.id} className="flex items-center space-x-3 mb-4">
                              <Checkbox id={`user-${u.id}`} checked={duesMembers?.includes(u.id)} onCheckedChange={() => toggleDuesMemberMutation.mutate(u.id)} disabled={toggleDuesMemberMutation.isPending && toggleDuesMemberMutation.variables === u.id} className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                              <Label htmlFor={`user-${u.id}`} className="cursor-pointer">{u.first_name} {u.last_name}</Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
              {isEditMode && (
                <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2.5 rounded-xl text-sm">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Düzenleme modu aktif — yapılan değişiklikler bütçeye ve işlem geçmişine yansımayacaktır.</span>
                </div>
              )}
            </div>

            {users?.some(u => u.id === user?.id && duesMembers?.includes(u.id)) && (
              <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg"><UserIcon className="w-4 h-4 text-emerald-400" /></div>
                    <div>
                      <h4 className="text-base font-bold text-emerald-400">Benim Aidat Durumum</h4>
                      <p className="text-white/40 text-xs">{selectedYear} yılı ödeme durumunuz</p>
                    </div>
                  </div>
                  {(() => {
                    const myPaid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(m => duesPayments?.some(p => p.user_id === user?.id && p.year === selectedYear && p.month === m)).length;
                    return (
                      <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                        <span className="text-emerald-400 font-black text-sm">{myPaid}/12</span>
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(myPaid / 12) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                  {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'].map((m, i) => {
                    const month = i + 1;
                    const isPaid = duesPayments?.some(p => p.user_id === user?.id && p.year === selectedYear && p.month === month);
                    const isPending = toggleDuesMutation.variables?.userId === user?.id && toggleDuesMutation.variables?.month === month && toggleDuesMutation.isPending;
                    const isCurrentMonth = i === new Date().getMonth() && selectedYear === new Date().getFullYear();
                    return (
                      <button
                        key={month}
                        onClick={() => {
                          if (isPaid) { setPaymentToCancel({ userId: user!.id, month }); setIsCancelPaymentDialogOpen(true); }
                          else { setPendingDuesPayment({ userId: user!.id, month }); setDuesPaymentAmount(budgetSettings?.dues_amount?.toString() || "100"); setIsDuesPaymentDialogOpen(true); }
                        }}
                        disabled={toggleDuesMutation.isPending && isPending}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-1 py-3 sm:py-4 rounded-xl border transition-all duration-300 group",
                          isPaid ? "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25" : "bg-white/[0.02] border-white/10 hover:bg-white/[0.06] hover:border-white/20",
                          isCurrentMonth && !isPaid && "border-emerald-500/40 ring-1 ring-emerald-500/20",
                          isPending && "opacity-50 cursor-wait"
                        )}
                      >
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", isPaid ? "text-emerald-400/70" : "text-white/40")}>{m}</span>
                        {isPaid ? <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" /> : <Circle className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />}
                        {isCurrentMonth && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg"><Users className="w-4 h-4 text-white/60" /></div>
                  <div>
                    <h4 className="text-base font-bold text-white">Tüm Üyeler</h4>
                    <p className="text-white/40 text-xs">{selectedYear} yılı aidat durumları</p>
                  </div>
                </div>
                <span className="text-white/40 text-xs font-medium bg-white/5 px-3 py-1 rounded-lg">Toplam: {users?.filter(u => duesMembers?.includes(u.id)).length || 0} üye</span>
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max min-w-full">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="text-[9px] sm:text-xs text-white/40 uppercase bg-white/[0.03] border-b border-white/10 sticky top-0">
                      <tr>
                        <th className="px-3 sm:px-5 py-3 font-bold sticky left-0 z-20 bg-[#0c0c0c] border-r border-white/10 min-w-[100px] sm:min-w-[160px]">Kullanıcı</th>
                        {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'].map((m, i) => {
                          const isCurrentMonth = i === new Date().getMonth() && selectedYear === new Date().getFullYear();
                          return (
                            <th key={i} className={cn("px-1 sm:px-3 py-3 text-center font-bold min-w-[32px] sm:min-w-[56px] transition-colors", isCurrentMonth && "bg-emerald-500/10")}>
                              <span className={cn(isCurrentMonth ? "bg-emerald-500 text-black px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px]" : "")}>{m}</span>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {users?.filter(u => duesMembers?.includes(u.id) && u.id !== user?.id).map(u => {
                        const paidCount = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(m => duesPayments?.some(p => p.user_id === u.id && p.year === selectedYear && p.month === m)).length;
                        return (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-3 sm:px-5 py-2.5 sm:py-3 font-medium sticky left-0 z-10 bg-[#0a0a0a] group-hover:bg-[#0e0e0e] border-r border-white/10 shadow-[2px_0_8px_rgba(0,0,0,0.4)] min-w-[100px] sm:min-w-[160px] whitespace-normal leading-tight transition-colors">
                              <div className="flex flex-col gap-1">
                                <span className="text-white/90 text-xs sm:text-sm">{u.first_name} {u.last_name}</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500" style={{ width: `${(paidCount / 12) * 100}%` }} />
                                  </div>
                                  <span className="text-[9px] text-white/30">{paidCount}/12</span>
                                </div>
                              </div>
                            </td>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                              const isPaid = duesPayments?.some(p => p.user_id === u.id && p.year === selectedYear && p.month === month);
                              const isPending = toggleDuesMutation.variables?.userId === u.id && toggleDuesMutation.variables?.month === month && toggleDuesMutation.isPending;
                              const isCurrentMonthCol = (month - 1) === new Date().getMonth() && selectedYear === new Date().getFullYear();
                              return (
                                <td key={month} className={cn("px-0.5 sm:px-1.5 py-1.5 sm:py-2.5 text-center transition-colors", isCurrentMonthCol && "bg-emerald-500/5")}>
                                  <button
                                    onClick={() => {
                                      if (isPaid) { setPaymentToCancel({ userId: u.id, month }); setIsCancelPaymentDialogOpen(true); }
                                      else { setPendingDuesPayment({ userId: u.id, month }); setDuesPaymentAmount(budgetSettings?.dues_amount?.toString() || "100"); setIsDuesPaymentDialogOpen(true); }
                                    }}
                                    disabled={(toggleDuesMutation.isPending && isPending) || !canManageBudget}
                                    className={cn(
                                      "flex items-center justify-center w-full py-1.5 sm:py-2 rounded-lg transition-all duration-200",
                                      isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.03] text-white/15",
                                      canManageBudget && isPaid && "hover:bg-emerald-500/30",
                                      canManageBudget && !isPaid && "hover:bg-white/[0.08] hover:text-white/40",
                                      isPending && "opacity-50 cursor-wait",
                                      !canManageBudget && "cursor-default"
                                    )}
                                  >
                                    {isPaid ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/5" />
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDuesPaymentDialogOpen} onOpenChange={setIsDuesPaymentDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ödenen Tutarı Girin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tutar (₺)</Label>
              <Input
                type="number"
                value={duesPaymentAmount}
                onChange={(e) => setDuesPaymentAmount(e.target.value)}
                className="bg-black/50 border-white/10"
              />
            </div>

            {Number(duesPaymentAmount) > (budgetSettings?.dues_amount || 100) && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-4 mt-2">
                <Label className="text-emerald-400 block leading-snug">Fazla Ödediğiniz Tutarı Bir Sonraki Aylara Yansıtmak İstiyor Musunuz?</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDistributePayment(true)}
                    className={cn("px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full", distributePayment ? "bg-emerald-500 text-black" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white")}
                  >Evet</button>
                  <button
                    type="button"
                    onClick={() => setDistributePayment(false)}
                    className={cn("px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full", !distributePayment ? "bg-emerald-500 text-black" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white")}
                  >Hayır</button>
                </div>
                <div className="space-y-2 mt-3">
                  <p className="text-xs text-white/50">
                    {distributePayment
                      ? "Girilen fazla tutar sıradaki ödenmemiş aylara otomatik dağıtılacaktır."
                      : "Girdiğiniz tutarın tamamı sadece seçtiğiniz ayın ödemesi olarak kaydedilecektir."}
                  </p>
                  {distributePayment && (
                    <p className="text-[11px] text-emerald-400/80 bg-emerald-500/10 p-2 rounded-lg leading-snug">
                      Not: Dağıtılacak olan son pay 1 tam aidat tutarını karşılamıyorsa o aya yarım tik atılmaz. Kalan miktar bütçeye dahil edilmek üzere son tam ödenen ayın üzerine eklenir.
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold mt-4"
              disabled={toggleDuesMutation.isPending}
              onClick={() => {
                if (pendingDuesPayment) {
                  toggleDuesMutation.mutate({
                    userId: pendingDuesPayment.userId,
                    month: pendingDuesPayment.month,
                    amount: Number(duesPaymentAmount),
                    distribute: distributePayment
                  }, {
                    onSuccess: () => {
                      setIsDuesPaymentDialogOpen(false);
                      setPendingDuesPayment(null);
                    }
                  });
                }
              }}
            >
              {toggleDuesMutation.isPending ? "Kaydediliyor..." : "Onayla"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelPaymentDialogOpen} onOpenChange={setIsCancelPaymentDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Ödemeyi İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-white/70">Bu aya ait ödemeyi iptal etmek istediğinize emin misiniz? Bu işlem bütçeden ilgili tutarı düşecektir.</p>
            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                onClick={() => setIsCancelPaymentDialogOpen(false)}
                disabled={toggleDuesMutation.isPending}
              >
                Vazgeç
              </Button>
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold"
                disabled={toggleDuesMutation.isPending}
                onClick={() => {
                  if (paymentToCancel) {
                    toggleDuesMutation.mutate({
                      userId: paymentToCancel.userId,
                      month: paymentToCancel.month
                    }, {
                      onSuccess: () => {
                        setIsCancelPaymentDialogOpen(false);
                        setPaymentToCancel(null);
                      }
                    });
                  }
                }}
              >
                {toggleDuesMutation.isPending ? "İptal Ediliyor..." : "İptal Et"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
