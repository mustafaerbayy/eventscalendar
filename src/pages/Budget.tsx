import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, Edit2, Info, User as UserIcon, CalendarDays } from "lucide-react";
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

  // Budget form state
  const [newTotalBudget, setNewTotalBudget] = useState("");

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

  const combinedHistory = [...(expenses || []).map(e => ({ ...e, isExpense: true as const })), ...(allDuesPaymentsHistory || []).map(d => ({ ...d, isExpense: false as const }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


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
  
  // Calculate total dues collected (only count ones collected AFTER budgetStartDate to be consistent, or maybe count all? The requirement is: "bütçeye +100 eklensin otomatik olarak". So it should definitely be added to currentBudget.)
  // We'll count dues payments made after the budget start date for the "current budget".
  // Note: the prompt says "ilgili ayın aidat kutucuğuna eğer tik atarsa bütçeye +100 eklensin otomatik olarak".
  // So we add it to the available budget.
  const relevantDues = duesPayments?.filter(d => {
    if (!budgetStartDate) return true;
    return new Date(d.created_at) >= new Date(budgetStartDate);
  }) || [];
  
  const relevantDuesCollected = relevantDues.reduce((sum, d) => sum + Number(d.amount), 0);
  
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
    mutationFn: async ({ userId, month }: { userId: string, month: number }) => {
      const existing = duesPayments?.find(p => p.user_id === userId && p.year === selectedYear && p.month === month);
      if (existing) {
        const { error } = await supabase.from("dues_payments").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dues_payments").insert([{
          user_id: userId,
          year: selectedYear,
          month,
          amount: budgetSettings?.dues_amount || 100,
          created_by: user?.id
        }]);
        if (error) throw error;
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
            <TabsTrigger value="expenses" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold py-2">Harcamalar</TabsTrigger>
            <TabsTrigger value="dues" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold py-2">Aidat Takibi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expenses" className="space-y-8 animate-in fade-in-50 duration-500">
            {/* Overview Cards */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="h-24 w-24 text-emerald-400" />
            </div>
            <p className="text-emerald-400/80 font-medium mb-1">Mevcut Bütçe</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-emerald-400">
                ₺{currentBudget.toLocaleString("tr-TR")}
              </h2>
            </div>
            {canManageBudget && (
              <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="px-0 text-emerald-400/80 hover:text-emerald-300 mt-2 h-auto py-0">
                    <Edit2 className="w-3 h-3 mr-1" /> Bütçeyi Düzenle
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>Mevcut Bütçeyi Güncelle</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateBudget} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Yeni Mevcut Bütçe (₺)</Label>
                      <Input 
                        type="number" 
                        value={newTotalBudget} 
                        onChange={(e) => setNewTotalBudget(e.target.value)} 
                        placeholder="0"
                        className="bg-black/50 border-white/10"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={updateBudgetMutation.isPending}>
                      {updateBudgetMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold">İşlem Geçmişi</h3>
            
            <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
              setIsExpenseDialogOpen(open);
              if (!open) resetExpenseForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={openAddExpense} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl gap-2">
                  <Plus className="w-4 h-4" />
                  Yeni Harcama Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingExpenseId ? "Harcamayı Düzenle" : "Yeni Harcama Gir"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddExpense} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Harcama Tutarı (₺)</Label>
                      <Input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        placeholder="Örn: 500"
                        className="bg-black/50 border-white/10"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Açıklama</Label>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Harcama detayları..."
                        className="bg-black/50 border-white/10 min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <Label>Kim Tarafından Harcandı?</Label>
                      <Popover open={isSpentByOpen} onOpenChange={setIsSpentByOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isSpentByOpen}
                            className="w-full justify-between bg-black/50 border-white/10 text-white font-normal hover:bg-white/5 hover:text-white"
                          >
                            {spentBy && users
                              ? `${users.find((u) => u.id === spentBy)?.first_name} ${users.find((u) => u.id === spentBy)?.last_name}`
                              : "Kişi arayın veya seçin..."}
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
                                  <CommandItem
                                    key={u.id}
                                    value={`${u.first_name} ${u.last_name}`}
                                    onSelect={() => {
                                      setSpentBy(u.id);
                                      setIsSpentByOpen(false);
                                    }}
                                    className="text-white hover:bg-white/10 cursor-pointer rounded-xl font-bold py-3 px-4 my-1 data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 text-emerald-400",
                                        spentBy === u.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
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
                        <SelectTrigger className="bg-black/50 border-white/10">
                          <SelectValue placeholder="Etkinlik seçin" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0c0c0c] border-white/10 max-h-60 !z-[9999] !opacity-100 !visible p-2 rounded-2xl">
                          <SelectItem value="none" className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">Etkinlik Bağımsız</SelectItem>
                          {eventList?.map((ev) => (
                            <SelectItem key={ev.id} value={ev.id} className="rounded-xl py-3 font-bold !text-white hover:bg-white/10 cursor-pointer">
                              {ev.title} ({new Date(ev.date).toLocaleDateString("tr-TR")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold mt-2" disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}>
                      {addExpenseMutation.isPending || updateExpenseMutation.isPending ? "Kaydediliyor..." : (editingExpenseId ? "Güncelle" : "Harcama Ekle")}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
          </div>

          <div className="p-0">
            {loadingExpenses || loadingAllDuesHistory ? (
              <div className="p-8 text-center text-white/50">Yükleniyor...</div>
            ) : combinedHistory && combinedHistory.length > 0 ? (
              <div className="divide-y divide-white/5">
                {combinedHistory.map((item) => {
                  if (item.isExpense) {
                    const expense = item as any;
                    const spentUser = Array.isArray(expense.profiles) ? expense.profiles[0] : expense.profiles;
                    const canModify = expense.created_by === user?.id || isAdmin || hasBudgetRole;
                    
                    return (
                      <div key={`exp-${expense.id}`} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl shrink-0 mt-1 sm:mt-0">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">₺{Number(expense.amount).toLocaleString("tr-TR")}</span>
                              <span className="text-white/40 text-sm">•</span>
                              <span className="text-white/60 text-sm">{new Date(expense.created_at).toLocaleDateString("tr-TR")}</span>
                            </div>
                            {expense.description && (
                              <p className="text-white/80 mt-1">{expense.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded-lg w-fit">
                              <UserIcon className="w-3 h-3" />
                              <span>{spentUser?.first_name} {spentUser?.last_name} tarafından harcandı</span>
                            </div>
                            {expense.events && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded-lg w-fit">
                                <CalendarDays className="w-3 h-3" />
                                <span>{Array.isArray(expense.events) ? expense.events[0]?.title : expense.events?.title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {canModify && (
                          <div className="flex sm:flex-col justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl h-8 w-8"
                              onClick={() => openEditExpense(expense)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-8 w-8"
                              onClick={() => {
                                if (window.confirm("Bu harcamayı silmek istediğinize emin misiniz?")) {
                                  deleteExpenseMutation.mutate(expense.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const dueItem = item as any;
                    const dueUser = users?.find(u => u.id === dueItem.user_id);
                    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                    
                    return (
                      <div key={`due-${dueItem.id}`} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-1 sm:mt-0">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-emerald-400">+₺{Number(dueItem.amount).toLocaleString("tr-TR")}</span>
                              <span className="text-white/40 text-sm">•</span>
                              <span className="text-white/60 text-sm">{new Date(dueItem.created_at).toLocaleDateString("tr-TR")}</span>
                            </div>
                            <p className="text-white/80 mt-1 text-sm font-medium">
                              <span className="text-emerald-400">{dueUser?.first_name} {dueUser?.last_name}</span> {dueItem.year} {months[dueItem.month - 1]} ayı aidatını ödedi.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/20">
                  <Wallet className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Henüz İşlem Yok</h4>
                <p className="text-white/50 max-w-sm">Burada sisteme girilen tüm harcamalar ve ödenen aidatlar listelenecektir.</p>
              </div>
            )}
          </div>
        </div>

          </TabsContent>

          <TabsContent value="dues" className="space-y-8 animate-in fade-in-50 duration-500">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-bold">Aidat Tablosu</h3>
                  <p className="text-white/60 text-sm mt-1">Kullanıcıların aylık aidat ödemelerini takip edin</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl">
                    <span className="font-bold text-lg">₺{Number(budgetSettings?.dues_amount || 100).toLocaleString("tr-TR")}</span>
                    <span className="text-xs uppercase tracking-wider opacity-80">/ AY</span>
                    {canManageBudget && (
                      <Dialog open={isEditDuesOpen} onOpenChange={setIsEditDuesOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-6 h-6 ml-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Aidat Ücretini Güncelle</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateDuesAmount} className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Yeni Aidat Tutarı (₺)</Label>
                              <Input 
                                type="number" 
                                value={newDuesAmount} 
                                onChange={(e) => setNewDuesAmount(e.target.value)} 
                                placeholder={budgetSettings?.dues_amount?.toString() || "100"}
                                className="bg-black/50 border-white/10"
                                required
                              />
                            </div>
                            <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={updateDuesAmountMutation.isPending}>
                              {updateDuesAmountMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  {canManageBudget && (
                    <Dialog open={isEditMembersOpen} onOpenChange={setIsEditMembersOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="bg-black/50 border-white/10 hover:bg-white/5">
                          Üyeleri Seç
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Aidat Ödeyenleri Belirle</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[300px] w-full rounded-md border border-white/10 p-4 mt-4">
                          {users?.map(u => (
                            <div key={u.id} className="flex items-center space-x-3 mb-4">
                              <Checkbox 
                                id={`user-${u.id}`} 
                                checked={duesMembers?.includes(u.id)}
                                onCheckedChange={() => toggleDuesMemberMutation.mutate(u.id)}
                                disabled={toggleDuesMemberMutation.isPending && toggleDuesMemberMutation.variables === u.id}
                                className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                              <Label htmlFor={`user-${u.id}`} className="cursor-pointer">{u.first_name} {u.last_name}</Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
                    <SelectTrigger className="bg-black/50 border-white/10 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c0c0c] border-white/10 !z-[9999] rounded-2xl">
                      {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <SelectItem key={y} value={y.toString()} className="cursor-pointer hover:bg-white/10 rounded-xl">{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="w-full whitespace-nowrap rounded-2xl border border-white/10 bg-black/20">
                <div className="flex w-max min-w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-white/50 uppercase bg-white/5 border-b border-white/10 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 font-bold sticky left-0 z-20 bg-[#121212] border-r border-white/10">Kullanıcı</th>
                        {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'].map((m, i) => (
                          <th key={i} className="px-4 py-4 text-center font-bold min-w-[80px]">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users?.filter(u => duesMembers?.includes(u.id) && (canManageBudget || u.id === user?.id)).map(u => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3 font-medium sticky left-0 z-10 bg-[#0a0a0a] border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                            {u.first_name} {u.last_name}
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                            const isPaid = duesPayments?.some(p => p.user_id === u.id && p.year === selectedYear && p.month === month);
                            const isPending = toggleDuesMutation.variables?.userId === u.id && toggleDuesMutation.variables?.month === month && toggleDuesMutation.isPending;
                            
                            return (
                              <td key={month} className="px-2 py-3 text-center">
                                <button
                                  onClick={() => toggleDuesMutation.mutate({ userId: u.id, month })}
                                  disabled={toggleDuesMutation.isPending && isPending}
                                  className={cn(
                                    "flex items-center justify-center w-full py-2 rounded-xl transition-all duration-200",
                                    isPaid 
                                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                                      : "bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/50",
                                    isPending && "opacity-50 cursor-wait"
                                  )}
                                >
                                  {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/5" />
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
