import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, Edit2, Info, User as UserIcon, CalendarDays, Users, TrendingUp, ShieldCheck, Clock, XCircle, Landmark, Copy, Mail, Send, Search, AlertTriangle } from "lucide-react";
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
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Payment Info state
  const [isEditPaymentInfoOpen, setIsEditPaymentInfoOpen] = useState(false);
  const [paymentName, setPaymentName] = useState("");
  const [paymentIban, setPaymentIban] = useState("");

  // Mail sending state
  const [isSendMailDialogOpen, setIsSendMailDialogOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [selectedMailRecipients, setSelectedMailRecipients] = useState<string[]>([]);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailSearchQuery, setMailSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Dues warning states
  const [isUnpaidWarningOpen, setIsUnpaidWarningOpen] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [unpaidMonths, setUnpaidMonths] = useState<string[]>([]);
  const [showWarningPaymentInfo, setShowWarningPaymentInfo] = useState(true);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setIsScrolling(true);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

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

  // Returns the correct dues amount for a specific month/year, accounting for mid-year rate changes
  const getDuesAmountForMonth = (month: number, year: number): number => {
    const currentAmount = Number(budgetSettings?.dues_amount || 100);
    const previousAmount = Number((budgetSettings as any)?.previous_dues_amount);
    const effectiveMonth = Number((budgetSettings as any)?.dues_effective_month);
    const effectiveYear = Number((budgetSettings as any)?.dues_effective_year);

    // If no previous amount or effective date stored, use current amount for all months
    if (!previousAmount || !effectiveMonth || !effectiveYear) return currentAmount;

    // If the requested month/year is before the effective date, use the previous amount
    if (year < effectiveYear || (year === effectiveYear && month < effectiveMonth)) {
      return previousAmount;
    }

    return currentAmount;
  };

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

  // Fetch Pending Dues Transactions
  const { data: pendingTransactions, isLoading: loadingPending } = useQuery({
    queryKey: ["pendingDuesTransactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_dues_transactions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });


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

  useEffect(() => {
    if (!loading && user && duesMembers && allDuesPaymentsHistory && !hasShownWarning) {
      const isMember = duesMembers.includes(user.id);
      if (isMember) {
        const curMonth = new Date().getMonth() + 1;
        const curYear = new Date().getFullYear();
        const monthNames = [
          "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
          "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
        ];
        const missing: string[] = [];

        for (let m = 1; m <= curMonth; m++) {
          const isPaid = allDuesPaymentsHistory.some(
            (p) => p.user_id === user.id && p.year === curYear && p.month === m
          );
          if (!isPaid) {
            missing.push(monthNames[m - 1]);
          }
        }

        if (missing.length > 0) {
          setUnpaidMonths(missing);
          setIsUnpaidWarningOpen(true);
        }
      }
      setHasShownWarning(true);
    }
  }, [loading, user, duesMembers, allDuesPaymentsHistory, hasShownWarning]);

  type GroupedDuesPayment = {
    id: string;
    user_id: string;
    created_by: string;
    created_at: string;
    amount: number;
    months_paid: { month: number; year: number }[];
    isExpense: false;
  };

  // Group dues payments that were made at the same time by the same user
  const groupedDuesPayments: GroupedDuesPayment[] = [];
  if (allDuesPaymentsHistory) {
    const duesItems = allDuesPaymentsHistory.filter(d => d.created_by === d.user_id);
    const processedIds = new Set();

    duesItems.forEach(item => {
      if (processedIds.has(item.id)) return;

      // Find other items from the same user created within 5 seconds
      const itemTime = new Date(item.created_at).getTime();
      const relatedItems = duesItems.filter(d =>
        !processedIds.has(d.id) &&
        d.user_id === item.user_id &&
        Math.abs(new Date(d.created_at).getTime() - itemTime) < 5000
      );

      relatedItems.forEach(r => processedIds.add(r.id));

      // Sort related items by year and month
      relatedItems.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      groupedDuesPayments.push({
        id: relatedItems.map(r => r.id).join(','),
        user_id: item.user_id,
        created_by: item.created_by,
        created_at: item.created_at, // Use the earliest or same
        amount: relatedItems.reduce((sum, r) => sum + Number(r.amount), 0),
        months_paid: relatedItems.map(r => ({ month: r.month, year: r.year })),
        isExpense: false as const
      });
    });
  }

  const combinedHistory = [
    ...(expenses || []).map(e => ({ ...e, isExpense: true as const })),
    ...groupedDuesPayments
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

  const updatePaymentInfoMutation = useMutation({
    mutationFn: async ({ name, iban }: { name: string; iban: string }) => {
      if (budgetSettings?.id) {
        const { error } = await supabase
          .from("budget_settings")
          // @ts-ignore
          .update({ payment_name: name, payment_iban: iban, updated_at: new Date().toISOString(), updated_by: user.id })
          .eq("id", budgetSettings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetSettings"] });
      setIsEditPaymentInfoOpen(false);
      toast.success("Ödeme bilgileri güncellendi");
    },
    onError: (error: Error) => {
      toast.error("Ödeme bilgileri güncellenirken hata oluştu: " + error.message);
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

      // Check if user is admin/budget manager
      const userIsAdmin = canManageBudget;

      if (userIsAdmin) {
        // Admin: apply directly (existing behavior)
        if (existing) {
          const { error } = await supabase.from("dues_payments").delete().eq("id", existing.id);
          if (error) throw error;
        } else {
          const baseDues = getDuesAmountForMonth(month, selectedYear);
          const totalAmount = amount !== undefined ? amount : baseDues;
          const inserts: { user_id: string; year: number; month: number; amount: number; created_by: string }[] = [];

          if (distribute && totalAmount > baseDues) {
            let remainingAmount = totalAmount;
            let currentMonth = month;
            let currentYear = selectedYear;

            while (remainingAmount > 0) {
              const monthDues = getDuesAmountForMonth(currentMonth, currentYear);
              if (remainingAmount < monthDues) break;
              const isAlreadyPaid = allDuesPaymentsHistory?.some(p => p.user_id === userId && p.year === currentYear && p.month === currentMonth);

              if (!isAlreadyPaid) {
                inserts.push({
                  user_id: userId,
                  year: currentYear,
                  month: currentMonth,
                  amount: monthDues,
                  created_by: isEditMode ? user?.id : userId
                });
                remainingAmount -= monthDues;
              }

              currentMonth++;
              if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
              }
              if (currentYear > selectedYear + 10) break;
            }

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
      } else {
        // Normal user: create pending transaction
        const actionType = existing ? "mark_unpaid" : "mark_paid";
        const baseDues = getDuesAmountForMonth(month, selectedYear);
        const totalAmount = amount !== undefined ? amount : baseDues;

        // Check if there's already a pending transaction for this user/month/year
        const existingPending = pendingTransactions?.find(
          pt => pt.user_id === userId && pt.year === selectedYear && pt.month === month
        );
        if (existingPending) {
          // Cancel the existing pending transaction
          const { error } = await supabase
            .from("pending_dues_transactions")
            .delete()
            .eq("id", existingPending.id);
          if (error) throw error;
          toast.info("Bekleyen işlem iptal edildi");
          return;
        }

        const { error } = await supabase
          .from("pending_dues_transactions")
          .insert([{
            user_id: userId,
            year: selectedYear,
            month,
            amount: totalAmount,
            action_type: actionType,
            status: "pending",
            distribute: distribute || false,
            payment_amount: totalAmount
          }]);
        if (error) throw error;
        toast.info("İşleminiz onay bekliyor. Bir admin onayladığında uygulanacaktır.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duesPayments", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["allDuesPaymentsHistory"] });
      queryClient.invalidateQueries({ queryKey: ["pendingDuesTransactions"] });
    },
    onError: (error: Error) => {
      toast.error("Aidat durumu güncellenirken hata oluştu: " + error.message);
    }
  });

  // Approve pending transaction
  const approvePendingMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const transaction = pendingTransactions?.find(t => t.id === transactionId);
      if (!transaction) throw new Error("İşlem bulunamadı");

      if (transaction.action_type === "mark_paid") {
        const baseDues = getDuesAmountForMonth(transaction.month, transaction.year);
        const totalAmount = transaction.payment_amount || transaction.amount || baseDues;
        const inserts: { user_id: string; year: number; month: number; amount: number; created_by: string }[] = [];

        if (transaction.distribute && totalAmount > baseDues) {
          let remainingAmount = totalAmount;
          let currentMonth = transaction.month;
          let currentYear = transaction.year;

          while (remainingAmount > 0) {
            const monthDues = getDuesAmountForMonth(currentMonth, currentYear);
            if (remainingAmount < monthDues) break;
            const isAlreadyPaid = allDuesPaymentsHistory?.some(
              p => p.user_id === transaction.user_id && p.year === currentYear && p.month === currentMonth
            );

            if (!isAlreadyPaid) {
              inserts.push({
                user_id: transaction.user_id,
                year: currentYear,
                month: currentMonth,
                amount: monthDues,
                created_by: transaction.user_id
              });
              remainingAmount -= monthDues;
            }

            currentMonth++;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear++;
            }
            if (currentYear > transaction.year + 10) break;
          }

          if (remainingAmount > 0) {
            if (inserts.length > 0) {
              inserts[inserts.length - 1].amount += remainingAmount;
            } else {
              inserts.push({
                user_id: transaction.user_id,
                year: transaction.year,
                month: transaction.month,
                amount: remainingAmount,
                created_by: transaction.user_id
              });
            }
          }
        } else {
          inserts.push({
            user_id: transaction.user_id,
            year: transaction.year,
            month: transaction.month,
            amount: totalAmount,
            created_by: transaction.user_id
          });
        }

        if (inserts.length > 0) {
          const { error } = await supabase.from("dues_payments").insert(inserts);
          if (error) throw error;
        }
      } else if (transaction.action_type === "mark_unpaid") {
        const { error } = await supabase
          .from("dues_payments")
          .delete()
          .eq("user_id", transaction.user_id)
          .eq("year", transaction.year)
          .eq("month", transaction.month);
        if (error) throw error;
      }

      // Mark as approved
      const { error } = await supabase
        .from("pending_dues_transactions")
        .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duesPayments", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["allDuesPaymentsHistory"] });
      queryClient.invalidateQueries({ queryKey: ["pendingDuesTransactions"] });
      toast.success("İşlem onaylandı ve uygulandı");
    },
    onError: (error: Error) => {
      toast.error("İşlem onaylanırken hata oluştu: " + error.message);
    }
  });

  // Reject pending transaction
  const rejectPendingMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from("pending_dues_transactions")
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDuesTransactions"] });
      toast.success("İşlem reddedildi");
    },
    onError: (error: Error) => {
      toast.error("İşlem reddedilirken hata oluştu: " + error.message);
    }
  });

  const updateDuesAmountMutation = useMutation({
    mutationFn: async (amount: number) => {
      // Effective from next month
      const now = new Date();
      let effMonth = now.getMonth() + 2; // +1 for 0-indexed, +1 for next month
      let effYear = now.getFullYear();
      if (effMonth > 12) { effMonth = 1; effYear++; }

      const oldAmount = budgetSettings?.dues_amount || 100;

      if (budgetSettings?.id) {
        const { error } = await supabase
          .from("budget_settings")
          // @ts-ignore - previous_dues_amount, dues_effective_month, dues_effective_year columns
          .update({
            dues_amount: amount,
            previous_dues_amount: oldAmount,
            dues_effective_month: effMonth,
            dues_effective_year: effYear,
          })
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
      const now = new Date();
      let effMonth = now.getMonth() + 2;
      let effYear = now.getFullYear();
      if (effMonth > 12) { effMonth = 1; effYear++; }
      const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      toast.success(`Aidat ücreti güncellendi. Yeni tutar ${monthNames[effMonth - 1]} ${effYear}'dan itibaren geçerli olacaktır.`);
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

  const getUnpaidDuesMembers = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    return users
      ? users
        .filter(u => duesMembers?.includes(u.id))
        .filter(u => !allDuesPaymentsHistory?.some(p => p.user_id === u.id && p.year === currentYear && p.month === currentMonth))
        .map(u => u.id)
      : [];
  };

  const openSendMail = () => {
    // Select only unpaid dues members by default
    setSelectedMailRecipients(getUnpaidDuesMembers());
    setMailSubject("");
    setMailBody("");
    setMailSearchQuery("");
    setIsSendMailDialogOpen(true);
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailSubject.trim() || !mailBody.trim()) {
      toast.error("Lütfen konu ve mesaj alanlarını doldurun.");
      return;
    }
    if (selectedMailRecipients.length === 0) {
      toast.error("Lütfen en az bir alıcı seçin.");
      return;
    }

    setIsSendingMail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-announcement", {
        body: {
          subject: mailSubject,
          body: mailBody,
          recipientIds: selectedMailRecipients,
        },
      });

      if (error) throw error;

      toast.success(`${data.sent || selectedMailRecipients.length} kullanıcıya e-posta başarıyla gönderildi.`);
      setIsSendMailDialogOpen(false);
      setMailSubject("");
      setMailBody("");
    } catch (err: any) {
      console.error("Mail gönderme hatası:", err);
      toast.error("E-posta gönderilirken hata oluştu: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setIsSendingMail(false);
    }
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
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20 px-4 sm:px-6">
      <Navbar />
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Bütçe Yönetimi</h1>
              <p className="text-foreground/60 text-sm mt-1">Topluluk bütçesini ve harcamalarını takip edin</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className={cn("h-12 bg-foreground/5 border border-border/10 p-1 gap-2 rounded-2xl mb-8 grid w-full", canManageBudget ? "max-w-2xl grid-cols-3" : "max-w-md grid-cols-2")}>
            <TabsTrigger value="expenses" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black data-[state=active]:shadow-none font-bold h-full px-6">Bütçe</TabsTrigger>
            <TabsTrigger value="dues" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black data-[state=active]:shadow-none font-bold h-full px-6">Aidat Takibi</TabsTrigger>
            {canManageBudget && (
              <TabsTrigger value="approvals" className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:shadow-none font-bold h-full px-6 relative">
                Onay Bekleyenler
                {(pendingTransactions?.length || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {pendingTransactions?.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="expenses" className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="h-16 w-16 text-emerald-400" /></div>
                <div className="p-3 bg-emerald-500/20 rounded-xl"><Wallet className="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <p className="text-foreground/50 text-xs font-medium uppercase tracking-wider">Mevcut Bütçe</p>
                  <p className={cn("text-2xl font-black", currentBudget >= 0 ? "text-emerald-400" : "text-red-400")}>₺{currentBudget.toLocaleString("tr-TR")}</p>
                  {canManageBudget && (
                    <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
                      <DialogTrigger asChild>
                        <button className="text-emerald-400/60 hover:text-emerald-400 text-[10px] font-medium mt-0.5 flex items-center gap-1 transition-colors"><Edit2 className="w-2.5 h-2.5" /> Düzenle</button>
                      </DialogTrigger>
                      <DialogContent className="bg-background border border-border/40 text-foreground rounded-[2rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
                        <DialogHeader><DialogTitle className="text-xl font-black">Mevcut Bütçeyi Güncelle</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpdateBudget} className="space-y-4 pt-4">
                          <div className="space-y-2"><Label>Yeni Mevcut Bütçe (₺)</Label><Input type="number" value={newTotalBudget} onChange={(e) => setNewTotalBudget(e.target.value)} placeholder="0" className="bg-foreground/5 border-border/10" /></div>
                          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={updateBudgetMutation.isPending}>{updateBudgetMutation.isPending ? "Kaydediliyor..." : "Kaydet"}</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-border/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl"><TrendingUp className="w-5 h-5 text-red-400 rotate-180" /></div>
                <div>
                  <p className="text-foreground/50 text-xs font-medium uppercase tracking-wider">Toplam Harcama</p>
                  <p className="text-2xl font-black text-foreground">₺{totalSpentAllTime.toLocaleString("tr-TR")}</p>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white/[0.02] border border-border/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-4 sm:p-5 border-b border-border/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-foreground/5 rounded-lg"><CalendarDays className="w-4 h-4 text-foreground/60" /></div>
                    <h3 className="text-base font-bold">İşlem Geçmişi</h3>
                  </div>
                  <div className="flex bg-foreground/5 p-0.5 rounded-lg border border-border/10">
                    {[{ key: "all" as const, label: "Tümü" }, { key: "income" as const, label: "Gelirler" }, { key: "expense" as const, label: "Giderler" }].map(f => (
                      <button key={f.key} onClick={() => setHistoryFilter(f.key)} className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", historyFilter === f.key ? "bg-emerald-500 text-black" : "text-foreground/40 hover:text-foreground/70")}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => { setIsExpenseDialogOpen(open); if (!open) resetExpenseForm(); }}>
                  <DialogTrigger asChild>
                    <Button onClick={openAddExpense} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Yeni Harcama</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2.5rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
                    <DialogHeader><DialogTitle className="text-xl font-black">{editingExpenseId ? "Harcamayı Düzenle" : "Yeni Harcama Gir"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddExpense} className="space-y-4 pt-4">
                      <div className="space-y-2"><Label>Harcama Tutarı (₺)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Örn: 500" className="bg-foreground/5 border-border/10" required /></div>
                      <div className="space-y-2"><Label>Açıklama</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Harcama detayları..." className="bg-foreground/5 border-border/10 min-h-[80px]" /></div>
                      <div className="space-y-2 flex flex-col">
                        <Label>Kim Tarafından Harcandı?</Label>
                        <Popover open={isSpentByOpen} onOpenChange={setIsSpentByOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isSpentByOpen} className="w-full justify-between bg-foreground/5 border-border/10 text-foreground font-normal hover:bg-foreground/5 hover:text-foreground">
                              {spentBy && users ? `${users.find((u) => u.id === spentBy)?.first_name} ${users.find((u) => u.id === spentBy)?.last_name}` : "Kişi arayın veya seçin..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border-border/40 !z-[9999]">
                            <Command className="bg-transparent border-none">
                              <CommandInput placeholder="Kişi ara..." className="text-foreground border-none focus:ring-0" />
                              <CommandList className="custom-scrollbar">
                                <CommandEmpty className="py-6 text-center text-sm text-foreground/50">Kişi bulunamadı.</CommandEmpty>
                                <CommandGroup>
                                  {users?.map((u) => (
                                    <CommandItem key={u.id} value={`${u.first_name} ${u.last_name}`} onSelect={() => { setSpentBy(u.id); setIsSpentByOpen(false); }} className="text-foreground hover:bg-foreground/10 cursor-pointer rounded-xl font-bold py-3 px-4 my-1 data-[selected=true]:bg-foreground/10 data-[selected=true]:text-foreground">
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
                          <SelectTrigger className="bg-foreground/5 border-border/10"><SelectValue placeholder="Etkinlik seçin" /></SelectTrigger>
                          <SelectContent className="bg-background border-border/40 max-h-60 !z-[9999] !opacity-100 !visible p-2 rounded-2xl">
                            <SelectItem value="none" className="rounded-xl py-3 font-bold !text-foreground hover:bg-foreground/10 cursor-pointer">Etkinlik Bağımsız</SelectItem>
                            {eventList?.map((ev) => (<SelectItem key={ev.id} value={ev.id} className="rounded-xl py-3 font-bold !text-foreground hover:bg-foreground/10 cursor-pointer">{ev.title} ({new Date(ev.date).toLocaleDateString("tr-TR")})</SelectItem>))}
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
                  <div className="p-10 text-center text-foreground/40 text-sm">Yükleniyor...</div>
                ) : filteredHistory && filteredHistory.length > 0 ? (
                  <div className="divide-y divide-border/40">
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
                                  <span className="text-foreground/30 text-xs">{new Date(expense.created_at).toLocaleDateString("tr-TR")}</span>
                                </div>
                                {expense.description && <p className="text-foreground/60 text-sm mt-1 line-clamp-2">{expense.description}</p>}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] text-foreground/50 bg-foreground/5 px-2 py-0.5 rounded-full"><UserIcon className="w-2.5 h-2.5" />{spentUser?.first_name} {spentUser?.last_name}</span>
                                  {expense.events && <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded-full"><CalendarDays className="w-2.5 h-2.5" />{Array.isArray(expense.events) ? expense.events[0]?.title : expense.events?.title}</span>}
                                </div>
                              </div>
                            </div>
                            {canModify && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button variant="ghost" size="icon" className="text-foreground/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg h-7 w-7" onClick={() => openEditExpense(expense)}><Edit2 className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="text-foreground/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-7 w-7" onClick={() => { if (window.confirm("Bu harcamayı silmek istediğinize emin misiniz?")) deleteExpenseMutation.mutate(expense.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        const dueItem = item as GroupedDuesPayment;
                        const dueUser = users?.find(u => u.id === dueItem.user_id);
                        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                        const isSelfPaid = dueItem.created_by === dueItem.user_id;

                        let monthsText = '';
                        if (dueItem.months_paid && dueItem.months_paid.length > 1) {
                          const formattedMonths = dueItem.months_paid.map(m => `${m.year} ${months[m.month - 1]}`);
                          monthsText = `${formattedMonths.join(', ')} aidatları`;
                        } else if (dueItem.months_paid && dueItem.months_paid.length === 1) {
                          const m = dueItem.months_paid[0];
                          monthsText = `${m.year} ${months[m.month - 1]} aidatı`;
                        } else {
                          monthsText = `${(dueItem as any).year} ${months[(dueItem as any).month - 1]} aidatı`;
                        }

                        return (
                          <div key={`due-${dueItem.id}`} className={cn("p-4 sm:p-5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors border-l-2 border-transparent", isSelfPaid ? "hover:border-emerald-500/50" : "hover:border-border/20")}>
                            <div className={cn("p-2.5 rounded-xl shrink-0", isSelfPaid ? "bg-emerald-500/10 text-emerald-400" : "bg-foreground/5 text-foreground/30")}><Wallet className="w-4 h-4" /></div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("font-bold text-base", isSelfPaid ? "text-emerald-400" : "text-foreground/30")}>{isSelfPaid ? `+₺${Number(dueItem.amount).toLocaleString("tr-TR")}` : `₺0`}</span>
                                {!isSelfPaid && <span className="text-[10px] border border-border/10 bg-foreground/5 px-1.5 py-0.5 rounded text-foreground/40">Admin</span>}
                                <span className="text-foreground/30 text-xs">{new Date(dueItem.created_at).toLocaleDateString("tr-TR")}</span>
                              </div>
                              <p className="text-foreground/50 mt-1 text-sm">
                                <span className={isSelfPaid ? "text-emerald-400/80" : "text-foreground/50"}>{dueUser?.first_name} {dueUser?.last_name}</span> — {monthsText} {isSelfPaid ? 'ödendi' : 'işaretlendi'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <div className="p-14 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-border/10 flex items-center justify-center mb-4 text-foreground/15"><Wallet className="w-6 h-6" /></div>
                    <h4 className="text-sm font-bold text-foreground/70 mb-1">Henüz İşlem Yok</h4>
                    <p className="text-foreground/30 text-xs max-w-[250px]">Sisteme girilen harcamalar ve ödenen aidatlar burada listelenecektir.</p>
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
                      <p className="text-foreground/50 text-xs font-medium uppercase tracking-wider">{monthNames[currentMonth - 1]} Ayında Toplanan Aidat</p>
                      <p className="text-2xl font-black text-emerald-400">₺{currentMonthDuesCollected.toLocaleString("tr-TR")}</p>
                      <p className="text-foreground/30 text-[10px] mt-0.5">Bu ay aidat: ₺{getDuesAmountForMonth(currentMonth, currentYear).toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-border/10 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl"><TrendingUp className="w-5 h-5 text-amber-400" /></div>
                    <div>
                      <p className="text-foreground/50 text-xs font-medium uppercase tracking-wider">{monthNames[currentMonth - 1]} Ayı Tahsilat Oranı</p>
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-black text-foreground">%{paymentRate}</p>
                        <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden min-w-[60px]">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${paymentRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Payment Info Box */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-900/10 border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between gap-4 relative">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-indigo-500/20 rounded-xl shrink-0"><Landmark className="w-5 h-5 text-indigo-400" /></div>
                <div className="min-w-0">
                  <p className="text-foreground/50 text-xs font-medium uppercase tracking-wider">Aidat Ödeme Bilgileri</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                    <div
                      className="flex items-start sm:items-center gap-2 cursor-pointer group hover:bg-white/[0.05] p-1.5 -ml-1.5 rounded-md transition-colors active:scale-95"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const textToCopy = (budgetSettings as any)?.payment_name;
                        if (!textToCopy) {
                          toast.error("Kopyalanacak isim bulunamadı.");
                          return;
                        }
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(textToCopy)
                            .then(() => toast.success("İsim kopyalandı!"))
                            .catch(() => toast.error("Kopyalama başarısız oldu."));
                        } else {
                          const textArea = document.createElement("textarea");
                          textArea.value = textToCopy;
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            toast.success("İsim kopyalandı!");
                          } catch (err) {
                            toast.error("Tarayıcınız kopyalamayı desteklemiyor.");
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                    >
                      <p className="font-bold text-foreground text-sm sm:text-base break-words">{(budgetSettings as any)?.payment_name || "Belirtilmemiş"}</p>
                      <Copy className="w-3.5 h-3.5 text-foreground/30 group-hover:text-indigo-400 transition-colors shrink-0 mt-1 sm:mt-0" />
                    </div>

                    <div className="hidden sm:block text-foreground/20">•</div>

                    <div
                      className="flex items-start sm:items-center gap-2 cursor-pointer group hover:bg-white/[0.05] p-1.5 -ml-1.5 rounded-md transition-colors active:scale-95"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const textToCopy = (budgetSettings as any)?.payment_iban;
                        if (!textToCopy) {
                          toast.error("Kopyalanacak IBAN bulunamadı.");
                          return;
                        }
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(textToCopy)
                            .then(() => toast.success("IBAN kopyalandı!"))
                            .catch(() => toast.error("Kopyalama başarısız oldu."));
                        } else {
                          const textArea = document.createElement("textarea");
                          textArea.value = textToCopy;
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            toast.success("IBAN kopyalandı!");
                          } catch (err) {
                            toast.error("Tarayıcınız kopyalamayı desteklemiyor.");
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                    >
                      <p className="text-indigo-400 font-mono text-[11px] sm:text-sm tracking-wider sm:tracking-widest break-all">{(budgetSettings as any)?.payment_iban || "TR..."}</p>
                      <Copy className="w-3.5 h-3.5 text-foreground/30 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5 sm:mt-0" />
                    </div>
                  </div>
                </div>
              </div>
              {canManageBudget && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground/30 hover:text-indigo-400 hover:bg-indigo-500/10 shrink-0"
                  onClick={() => {
                    setPaymentName((budgetSettings as any)?.payment_name || "");
                    setPaymentIban((budgetSettings as any)?.payment_iban || "");
                    setIsEditPaymentInfoOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Toolbar */}
            <div className="bg-white/[0.02] border border-border/10 rounded-2xl p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
                    <SelectTrigger className="bg-foreground/5 border-border/10 w-28 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border/40 !z-[9999] rounded-2xl">
                      {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <SelectItem key={y} value={y.toString()} className="cursor-pointer hover:bg-foreground/10 rounded-xl">{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  {canManageBudget && (
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors", isEditMode ? "bg-amber-500/10 border-amber-500/30" : "bg-foreground/5 border-border/10")}>
                      <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                      <Label htmlFor="edit-mode" className={cn("text-sm cursor-pointer whitespace-nowrap font-medium", isEditMode ? "text-amber-400" : "text-foreground/70")}>
                        Düzenleme Modu
                      </Label>
                    </div>
                  )}
                </div>
                {canManageBudget && (
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <Button
                        onClick={openSendMail}
                        variant="outline"
                        size="sm"
                        className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl gap-1.5 text-xs font-bold"
                      >
                        <Mail className="w-3.5 h-3.5" /> E-posta Gönder
                      </Button>
                    )}
                    <Dialog open={isEditDuesOpen} onOpenChange={setIsEditDuesOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-foreground/5 border-border/10 hover:bg-foreground/5 rounded-xl gap-1.5 text-xs">
                          <Edit2 className="w-3 h-3" /> Aidat Tutarı
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
                        <DialogHeader><DialogTitle>Aidat Ücretini Güncelle</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpdateDuesAmount} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Yeni Aidat Tutarı (₺)</Label>
                            <Input type="number" value={newDuesAmount} onChange={(e) => setNewDuesAmount(e.target.value)} placeholder={budgetSettings?.dues_amount?.toString() || "100"} className="bg-foreground/5 border-border/10" required />
                          </div>
                          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={updateDuesAmountMutation.isPending}>
                            {updateDuesAmountMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isEditMembersOpen} onOpenChange={setIsEditMembersOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-foreground/5 border-border/10 hover:bg-foreground/5 rounded-xl gap-1.5 text-xs">
                          <Users className="w-3 h-3" /> Üyeleri Seç
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2.5rem] p-8 shadow-2xl top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black text-center mb-2">Aidat Ödeyenler</DialogTitle>
                          <p className="text-center text-foreground/40 text-sm mb-4">Aidat listesinde görünecek üyeleri seçin</p>
                        </DialogHeader>
                        <div className="relative group mb-3 mt-2">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 group-focus-within:text-emerald-400 transition-colors" />
                          <Input
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Üye ara..."
                            className="bg-foreground/5 border-border/10 rounded-xl pl-11 h-11 text-sm font-semibold"
                          />
                        </div>
                        <ScrollArea
                          className="h-[350px] w-full pr-4"
                          onScroll={handleScroll}
                        >
                          <div className={cn("space-y-1", isScrolling && "pointer-events-none")}>
                            {users
                              ?.filter(u => `${u.first_name} ${u.last_name}`.toLocaleLowerCase('tr-TR').includes(memberSearchQuery.toLocaleLowerCase('tr-TR')))
                              .map(u => (
                                <div
                                  key={u.id}
                                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-500/5 transition-all group border-b border-border/5 last:border-0 cursor-pointer"
                                  onClick={() => {
                                    if (!isScrolling) {
                                      toggleDuesMemberMutation.mutate(u.id);
                                    }
                                  }}
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-500/5 flex items-center justify-center text-xs font-black text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                      {u.first_name?.[0]?.toLocaleUpperCase('tr-TR')}{u.last_name?.[0]?.toLocaleUpperCase('tr-TR')}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-sm text-foreground/90 group-hover:text-emerald-400 transition-colors">{u.first_name} {u.last_name}</span>
                                      <span className="text-[10px] text-foreground/30 font-medium">Topluluk Üyesi</span>
                                    </div>
                                  </div>
                                  <Checkbox
                                    id={`user-${u.id}`}
                                    checked={duesMembers?.includes(u.id)}
                                    onCheckedChange={() => { }} // Handled by div onClick to prevent double trigger and scroll issues
                                    disabled={toggleDuesMemberMutation.isPending && toggleDuesMemberMutation.variables === u.id}
                                    className="h-5 w-5 border-border/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-lg transition-all pointer-events-none"
                                  />
                                </div>
                              ))}
                          </div>
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
                      <p className="text-foreground/40 text-xs">{selectedYear} yılı ödeme durumunuz</p>
                    </div>
                  </div>
                  {(() => {
                    const myPaid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(m => duesPayments?.some(p => p.user_id === user?.id && p.year === selectedYear && p.month === m)).length;
                    return (
                      <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                        <span className="text-emerald-400 font-black text-sm">{myPaid}/12</span>
                        <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
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
                    const hasPendingTx = pendingTransactions?.some(pt => pt.user_id === user?.id && pt.year === selectedYear && pt.month === month);
                    const isMutating = toggleDuesMutation.variables?.userId === user?.id && toggleDuesMutation.variables?.month === month && toggleDuesMutation.isPending;
                    const isCurrentMonth = i === new Date().getMonth() && selectedYear === new Date().getFullYear();
                    return (
                      <button
                        key={month}
                        onClick={() => {
                          if (hasPendingTx) {
                            // Cancel pending transaction
                            toggleDuesMutation.mutate({ userId: user!.id, month });
                          } else if (isPaid) {
                            if (canManageBudget) {
                              setPaymentToCancel({ userId: user!.id, month }); setIsCancelPaymentDialogOpen(true);
                            } else {
                              // Normal user wants to unmark - create pending
                              toggleDuesMutation.mutate({ userId: user!.id, month });
                            }
                          } else {
                            // Both admin and normal user: open amount dialog
                            setPendingDuesPayment({ userId: user!.id, month });
                            setDuesPaymentAmount(getDuesAmountForMonth(month, selectedYear).toString());
                            setIsDuesPaymentDialogOpen(true);
                          }
                        }}
                        disabled={toggleDuesMutation.isPending && isMutating}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-1 py-3 sm:py-4 rounded-xl border transition-all duration-300 group",
                          hasPendingTx ? "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25" :
                            isPaid ? "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25" : "bg-white/[0.02] border-border/10 hover:bg-white/[0.06] hover:border-border/20",
                          isCurrentMonth && !isPaid && !hasPendingTx && "border-emerald-500/40 ring-1 ring-emerald-500/20",
                          isMutating && "opacity-50 cursor-wait"
                        )}
                      >
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", hasPendingTx ? "text-amber-400/70" : isPaid ? "text-emerald-400/70" : "text-foreground/40")}>{m}</span>
                        {hasPendingTx ? <Clock className="w-5 h-5 text-amber-400 animate-pulse group-hover:scale-110 transition-transform" /> :
                          isPaid ? <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" /> : <Circle className="w-5 h-5 text-foreground/20 group-hover:text-foreground/40 transition-colors" />}
                        {hasPendingTx && <span className="text-[8px] text-amber-400/80 font-medium leading-tight">Onay Bekliyor</span>}
                        {isCurrentMonth && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] border border-border/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-5 border-b border-border/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-foreground/5 rounded-lg"><Users className="w-4 h-4 text-foreground/60" /></div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Tüm Üyeler</h4>
                    <p className="text-foreground/40 text-xs">{selectedYear} yılı aidat durumları</p>
                  </div>
                </div>
                <span className="text-foreground/40 text-xs font-medium bg-foreground/5 px-3 py-1 rounded-lg">Toplam: {users?.filter(u => duesMembers?.includes(u.id)).length || 0} üye</span>
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max min-w-full">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="text-[9px] sm:text-xs text-foreground/40 uppercase bg-white/[0.03] border-b border-border/10 sticky top-0">
                      <tr>
                        <th className="px-3 sm:px-5 py-3 font-bold sticky left-0 z-20 bg-background border-r border-border/10 min-w-[100px] sm:min-w-[160px]">Kullanıcı</th>
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
                    <tbody className="divide-y divide-border/40">
                      {users?.filter(u => duesMembers?.includes(u.id) && u.id !== user?.id).map(u => {
                        const paidCount = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(m => duesPayments?.some(p => p.user_id === u.id && p.year === selectedYear && p.month === m)).length;
                        return (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-3 sm:px-5 py-2.5 sm:py-3 font-medium sticky left-0 z-10 bg-background group-hover:bg-muted/30 border-r border-border/10 shadow-[2px_0_8px_rgba(0,0,0,0.05)] min-w-[100px] sm:min-w-[160px] whitespace-normal leading-tight transition-colors">
                              <div className="flex flex-col gap-1">
                                <span className="text-foreground/90 text-xs sm:text-sm">{u.first_name} {u.last_name}</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1 bg-foreground/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500" style={{ width: `${(paidCount / 12) * 100}%` }} />
                                  </div>
                                  <span className="text-[9px] text-foreground/30">{paidCount}/12</span>
                                </div>
                              </div>
                            </td>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                              const isPaid = duesPayments?.some(p => p.user_id === u.id && p.year === selectedYear && p.month === month);
                              const hasPendingTx = pendingTransactions?.some(pt => pt.user_id === u.id && pt.year === selectedYear && pt.month === month);
                              const isMutating = toggleDuesMutation.variables?.userId === u.id && toggleDuesMutation.variables?.month === month && toggleDuesMutation.isPending;
                              const isCurrentMonthCol = (month - 1) === new Date().getMonth() && selectedYear === new Date().getFullYear();
                              return (
                                <td key={month} className={cn("px-0.5 sm:px-1.5 py-1.5 sm:py-2.5 text-center transition-colors", isCurrentMonthCol && "bg-emerald-500/5")}>
                                  <button
                                    onClick={() => {
                                      if (isPaid) { setPaymentToCancel({ userId: u.id, month }); setIsCancelPaymentDialogOpen(true); }
                                      else { setPendingDuesPayment({ userId: u.id, month }); setDuesPaymentAmount(getDuesAmountForMonth(month, selectedYear).toString()); setIsDuesPaymentDialogOpen(true); }
                                    }}
                                    disabled={(toggleDuesMutation.isPending && isMutating) || !canManageBudget}
                                    className={cn(
                                      "flex items-center justify-center w-full py-1.5 sm:py-2 rounded-lg transition-all duration-200",
                                      hasPendingTx ? "bg-amber-500/20 text-amber-400" :
                                        isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.03] text-foreground/15",
                                      canManageBudget && isPaid && "hover:bg-emerald-500/30",
                                      canManageBudget && !isPaid && !hasPendingTx && "hover:bg-white/[0.08] hover:text-foreground/40",
                                      isMutating && "opacity-50 cursor-wait",
                                      !canManageBudget && "cursor-default"
                                    )}
                                    title={hasPendingTx ? "Onay bekliyor" : ""}
                                  >
                                    {hasPendingTx ? <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> :
                                      isPaid ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
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
                <ScrollBar orientation="horizontal" className="bg-foreground/5" />
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Pending Approvals Tab - Admin Only */}
          {canManageBudget && (
            <TabsContent value="approvals" className="space-y-6 animate-in fade-in-50 duration-500">
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl"><Clock className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <p className="text-foreground/50 text-xs font-medium uppercase tracking-wider">Onay Bekleyen İşlemler</p>
                  <p className="text-2xl font-black text-amber-400">{pendingTransactions?.length || 0}</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-border/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                <div className="p-5 border-b border-border/10 flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg"><Clock className="w-4 h-4 text-amber-400" /></div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Onay Bekleyen İşlemler</h4>
                    <p className="text-foreground/40 text-xs">Kullanıcıların aidat değişiklik talepleri</p>
                  </div>
                </div>

                {loadingPending ? (
                  <div className="p-10 text-center text-foreground/40 text-sm">Yükleniyor...</div>
                ) : pendingTransactions && pendingTransactions.length > 0 ? (
                  <div className="divide-y divide-white/[0.04]">
                    {pendingTransactions.map(tx => {
                      const txUser = users?.find(u => u.id === tx.user_id);
                      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                      const isApproving = approvePendingMutation.isPending && approvePendingMutation.variables === tx.id;
                      const isRejecting = rejectPendingMutation.isPending && rejectPendingMutation.variables === tx.id;

                      return (
                        <div key={tx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors border-l-2 border-amber-500/50">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl shrink-0">
                              {tx.action_type === "mark_paid" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground">{txUser?.first_name} {txUser?.last_name}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  tx.action_type === "mark_paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                )}>
                                  {tx.action_type === "mark_paid" ? "Aidat İşaretleme" : "Aidat Kaldırma"}
                                </span>
                              </div>
                              <p className="text-foreground/50 text-sm mt-1">
                                {tx.year} {months[tx.month - 1]} — ₺{Number(tx.amount).toLocaleString("tr-TR")}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-foreground/30">
                                  <Clock className="w-2.5 h-2.5 inline mr-1" />
                                  {new Date(tx.created_at).toLocaleString("tr-TR")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => approvePendingMutation.mutate(tx.id)}
                              disabled={isApproving || isRejecting}
                              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl gap-1.5 text-xs"
                            >
                              {isApproving ? "Onaylanıyor..." : <><Check className="w-3.5 h-3.5" /> Onayla</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectPendingMutation.mutate(tx.id)}
                              disabled={isApproving || isRejecting}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl gap-1.5 text-xs"
                            >
                              {isRejecting ? "Reddediliyor..." : <><XCircle className="w-3.5 h-3.5" /> Reddet</>}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-14 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-border/10 flex items-center justify-center mb-4 text-foreground/15"><Check className="w-6 h-6" /></div>
                    <h4 className="text-sm font-bold text-foreground/70 mb-1">Bekleyen İşlem Yok</h4>
                    <p className="text-foreground/30 text-xs max-w-[250px]">Tüm kullanıcı talepleri işlenmiş durumda.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={isDuesPaymentDialogOpen} onOpenChange={setIsDuesPaymentDialogOpen}>
        <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Ödeme Onayı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tutar (₺)</Label>
              <Input
                type="number"
                value={duesPaymentAmount}
                onChange={(e) => setDuesPaymentAmount(e.target.value)}
                className="bg-foreground/5 border-border/10"
              />
            </div>

            {pendingDuesPayment && Number(duesPaymentAmount) > getDuesAmountForMonth(pendingDuesPayment.month, selectedYear) && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-4 mt-2">
                <Label className="text-emerald-400 block leading-snug">Fazla Ödediğiniz Tutarı Bir Sonraki Aylara Yansıtmak İstiyor Musunuz?</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDistributePayment(true)}
                    className={cn("px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full", distributePayment ? "bg-emerald-500 text-black" : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground")}
                  >Evet</button>
                  <button
                    type="button"
                    onClick={() => setDistributePayment(false)}
                    className={cn("px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full", !distributePayment ? "bg-emerald-500 text-black" : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground")}
                  >Hayır</button>
                </div>
                <div className="space-y-2 mt-3">
                  <p className="text-xs text-foreground/50">
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

      <Dialog open={isUnpaidWarningOpen} onOpenChange={setIsUnpaidWarningOpen}>
        <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%] shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center pb-2">
            <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-full animate-bounce mb-3">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-amber-400">Aidat Ödeme Uyarısı</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <p className="text-foreground/80 text-center leading-relaxed font-semibold">
              Lütfen <span className="text-amber-400 font-extrabold">{unpaidMonths.join(", ")}</span> ayı aidatlarını ödeyiniz.
            </p>

            <div className="border border-border/10 bg-white/[0.02] rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowWarningPaymentInfo(!showWarningPaymentInfo)}
                className="w-full flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
              >
                <span className="text-sm font-bold text-foreground/90 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-400" />
                  Ödeme Bilgilerini Görüntüle
                </span>
                <span className={`text-foreground/40 transition-transform duration-300 ${showWarningPaymentInfo ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showWarningPaymentInfo && (
                <div className="p-5 border-t border-border/10 space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">Alıcı (İsim Soyisim)</p>
                    <div className="flex items-center justify-between bg-foreground/5 p-3 rounded-xl border border-border/5">
                      <span className="font-bold text-sm text-foreground/90">{(budgetSettings as any)?.payment_name || "Belirtilmemiş"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-foreground/40 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0"
                        onClick={() => {
                          const text = (budgetSettings as any)?.payment_name;
                          if (text) {
                            navigator.clipboard.writeText(text);
                            toast.success("Alıcı ismi kopyalandı!");
                          }
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">IBAN Bilgisi</p>
                    <div className="flex items-center justify-between bg-foreground/5 p-3 rounded-xl border border-border/5">
                      <span className="font-mono text-xs text-indigo-400 tracking-wider break-all">{(budgetSettings as any)?.payment_iban || "TR..."}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-foreground/40 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0"
                        onClick={() => {
                          const text = (budgetSettings as any)?.payment_iban;
                          if (text) {
                            navigator.clipboard.writeText(text);
                            toast.success("IBAN kopyalandı!");
                          }
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all"
              onClick={() => setIsUnpaidWarningOpen(false)}
            >
              Tamam
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelPaymentDialogOpen} onOpenChange={setIsCancelPaymentDialogOpen}>
        <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-400">Ödemeyi İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-foreground/70">Bu aya ait ödemeyi iptal etmek istediğinize emin misiniz? Bu işlem bütçeden ilgili tutarı düşecektir.</p>
            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="outline"
                className="w-full bg-foreground/5 border-border/10 hover:bg-foreground/10 text-foreground"
                onClick={() => setIsCancelPaymentDialogOpen(false)}
                disabled={toggleDuesMutation.isPending}
              >
                Vazgeç
              </Button>
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-foreground font-bold"
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

      <Dialog open={isEditPaymentInfoOpen} onOpenChange={setIsEditPaymentInfoOpen}>
        <DialogContent className="bg-background border border-border/40 text-foreground sm:max-w-md rounded-[2rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Ödeme Bilgilerini Güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>İsim Soyisim</Label>
              <Input
                value={paymentName}
                onChange={(e) => setPaymentName(e.target.value)}
                placeholder="Örn: Refik Topluluğu"
                className="bg-foreground/5 border-border/10"
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={paymentIban}
                onChange={(e) => setPaymentIban(e.target.value)}
                placeholder="TR..."
                className="bg-foreground/5 border-border/10 font-mono"
              />
            </div>
            <Button
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold mt-4"
              disabled={updatePaymentInfoMutation.isPending}
              onClick={() => {
                updatePaymentInfoMutation.mutate({ name: paymentName, iban: paymentIban });
              }}
            >
              {updatePaymentInfoMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <p className="text-[10px] text-foreground/40 text-center mt-2 leading-snug">
              Not: Bu bilgilerin kaydedilebilmesi için Supabase panelinizden <code className="bg-foreground/10 px-1 rounded">budget_settings</code> tablosuna <code className="bg-foreground/10 px-1 rounded">payment_name</code> ve <code className="bg-foreground/10 px-1 rounded">payment_iban</code> sütunlarının eklenmiş olması gerekmektedir.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendMailDialogOpen} onOpenChange={setIsSendMailDialogOpen}>
        <DialogContent className="bg-background border border-border/40 text-foreground w-[95vw] sm:max-w-lg rounded-[2.5rem] p-8 top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
          <DialogHeader className="pb-4 border-b border-border/10">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span>E-posta Gönder</span>
                <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider mt-0.5">Aidat Takibindeki Üyelere</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSendMail} className="space-y-5 pt-5 flex-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Konu</Label>
              <Input
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder="E-posta konusu..."
                className="bg-foreground/5 border-border/10 rounded-xl h-12 focus:border-emerald-500/40"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Mesaj</Label>
              <Textarea
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                placeholder="Mesajınızı buraya yazın..."
                className="bg-foreground/5 border-border/10 rounded-xl min-h-[140px] focus:border-emerald-500/40 resize-none"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                    Alıcılar ({selectedMailRecipients.length}/{users?.filter(u => duesMembers?.includes(u.id))?.length || 0})
                  </Label>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const activeDuesMembers = users ? users.filter(u => duesMembers?.includes(u.id)).map(u => u.id) : [];
                      if (selectedMailRecipients.length === activeDuesMembers.length) {
                        setSelectedMailRecipients([]);
                      } else {
                        setSelectedMailRecipients(activeDuesMembers);
                      }
                    }}
                    className="text-xs font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider cursor-pointer select-none"
                  >
                    {selectedMailRecipients.length === (users?.filter(u => duesMembers?.includes(u.id))?.length || 0)
                      ? "Tüm Seçimleri Kaldır"
                      : "Tüm Kullanıcıları Seç"}
                  </span>
                </div>
                <div
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const unpaid = getUnpaidDuesMembers();
                    setSelectedMailRecipients(unpaid);

                    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const currentMailMonth = new Date().getMonth() + 1;
                    const currentMailYear = new Date().getFullYear();
                    const duesAmt = getDuesAmountForMonth(currentMailMonth, currentMailYear);
                    const paymentNameText = (budgetSettings as any)?.payment_name || "Topluluk Hesabı";
                    const paymentIbanText = (budgetSettings as any)?.payment_iban || "";

                    const siteUrl = "https://www.refik.online";

                    setMailSubject(`${monthNames[currentMonth]} ${currentYear} Aidat Hatırlatması`);
                    setMailBody(
                      `Merhaba,

${monthNames[currentMonth]} ${currentYear} ayına ait topluluk aidat ödemenizin henüz tarafımıza ulaşmadığını fark ettik. Ödemenizi en uygun zamanda gerçekleştirmenizi rica ederiz.

Aidat Tutarı: ${duesAmt.toLocaleString("tr-TR")} TL
Alıcı: ${paymentNameText}${paymentIbanText ? `\nIBAN: ${paymentIbanText}` : ""}
Açıklama: ${monthNames[currentMonth]} ${currentYear} Aidat

Ödemenizi gerçekleştirdikten sonra, bir sonraki hatırlatma e-postasını almamak için lütfen aşağıdaki butona tıklayarak sisteme giriş yapın ve aidatınızı ödendi olarak işaretleyin.

<a href="${siteUrl}/butce" style="display:inline-block;padding:14px 32px;background:#10b981;color:#000;font-weight:bold;text-decoration:none;border-radius:12px;font-size:15px;margin:8px 0;">Aidatımı İşaretle</a>

Herhangi bir sorunuz varsa bizimle iletişime geçmekten çekinmeyin.

Saygılarımızla,
Topluluk Yönetimi`
                    );

                    if (unpaid.length === 0) {
                      toast.info("Bu ay tüm üyeler aidatını ödemiş!");
                    } else {
                      toast.success(`${unpaid.length} ödeme yapmamış kullanıcı seçildi, taslak mail hazırlandı.`);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-all cursor-pointer select-none"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-black uppercase tracking-wider">Sadece Ödeme Yapmayanları Seç</span>
                </div>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 group-focus-within:text-emerald-400 transition-colors" />
                <Input
                  value={mailSearchQuery}
                  onChange={(e) => setMailSearchQuery(e.target.value)}
                  placeholder="Kullanıcı ara..."
                  className="bg-foreground/5 border-border/10 rounded-xl pl-11 h-11 text-sm font-semibold"
                />
              </div>

              <ScrollArea className="h-[180px] border border-border/10 rounded-2xl p-4 bg-foreground/[0.01]">
                <div className="space-y-2">
                  {users
                    ?.filter(u => duesMembers?.includes(u.id))
                    ?.filter(u => `${u.first_name} ${u.last_name}`.toLocaleLowerCase('tr-TR').includes(mailSearchQuery.toLocaleLowerCase('tr-TR')))
                    ?.map(u => {
                      const isChecked = selectedMailRecipients.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedMailRecipients(prev =>
                              prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            isChecked
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-transparent border-border/5 hover:bg-foreground/5"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-black border border-emerald-500/20">
                              {u.first_name?.[0]?.toLocaleUpperCase('tr-TR')}{u.last_name?.[0]?.toLocaleUpperCase('tr-TR')}
                            </div>
                            <span className="font-bold text-sm text-foreground/90">{u.first_name} {u.last_name}</span>
                          </div>
                          <div
                            className={cn(
                              "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                              isChecked
                                ? "bg-emerald-500 border-emerald-500 text-black"
                                : "border-foreground/20 bg-transparent"
                            )}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>

            <Button
              type="submit"
              disabled={isSendingMail}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-wider rounded-xl mt-2 flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(16,185,129,0.15)]"
            >
              {isSendingMail ? (
                "Gönderiliyor..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gönder ({selectedMailRecipients.length} Alıcı)
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
