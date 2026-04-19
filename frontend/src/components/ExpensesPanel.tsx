import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { Trash2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

type Category = { id: string; name: string; color: string | null };
type Expense = {
  id: string;
  amount: number;
  description: string | null;
  payment_mode: string | null;
  expense_date: string;
  category_id: string | null;
  categories?: { name: string; color: string | null } | null;
};

const PAYMENT_MODES = ["cash", "card", "upi", "bank", "other"];

export const ExpensesPanel = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase
        .from("expenses")
        .select("*, categories(name, color)")
        .order("expense_date", { ascending: false })
        .limit(50),
      supabase.from("categories").select("id,name,color").order("name"),
    ]);
    setExpenses((e as any) ?? []);
    setCategories((c as any) ?? []);
    if (!categoryId && c && c.length) setCategoryId(c[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("User not found");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id, // Explicitly pass user_id for RLS
          amount: amt,
          expense_date: date,
          description,
          payment_mode: paymentMode,
          category_id: categoryId || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Expense added");

      // Simple client-side budget check (Optional)
      const dateObj = new Date(date);
      const m = dateObj.getMonth() + 1;
      const y = dateObj.getFullYear();
      
      const { data: budget } = await supabase
        .from("budgets")
        .select("amount")
        .eq("month", m)
        .eq("year", y)
        .eq("category_id", categoryId || null)
        .maybeSingle();

      if (budget) {
        const { data: total } = await supabase.rpc('get_spending', { 
          m, y, cat: categoryId || null 
        }); // Note: requires a small RPC which I can help you with if needed
      }

      setAmount("");
      setDescription("");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add expense");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <section className="space-y-6">
      <form onSubmit={addExpense} className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-1 space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Input
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What for?"
          />
        </div>
        <div className="sm:col-span-1 space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-1 space-y-1.5">
          <Label>Payment</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-1 space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-6">
          <Button type="submit" disabled={busy}>
            {busy ? "Adding..." : "Add expense"}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border divide-y divide-border">
        {expenses.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No expenses yet. Add your first one above.
          </p>
        )}
        {expenses.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {e.description || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(e.expense_date)} · {e.categories?.name ?? "Uncategorized"} ·{" "}
                {e.payment_mode ?? "—"}
              </p>
            </div>
            <p className="font-medium tabular-nums">{formatCurrency(e.amount)}</p>
            <button
              onClick={() => remove(e.id)}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted"
              aria-label="Delete expense"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
