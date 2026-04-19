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
import { Trash2, Plus } from "lucide-react";

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
  
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");

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

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !user) return;
    try {
      // Random color
      const color = '#' + Math.floor(Math.random()*16777215).toString(16);
      const { data, error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: newCatName,
        color: color
      }).select().single();
      
      if (error) throw error;
      toast.success("Category created");
      setNewCatName("");
      setShowCatForm(false);
      load().then(() => {
        if (data) setCategoryId(data.id);
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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
      const { error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          amount: amt,
          expense_date: date,
          description,
          payment_mode: paymentMode,
          category_id: categoryId || null,
        });

      if (error) throw error;
      toast.success("Expense added");
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
      {/* Category Management */}
      <div className="bg-muted/30 p-4 rounded-lg border border-border">
        {!showCatForm ? (
          <button 
            onClick={() => setShowCatForm(true)}
            className="text-sm font-medium flex items-center gap-2 hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" /> Add a new category
          </button>
        ) : (
          <form onSubmit={addCategory} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="newcat">Category Name</Label>
              <Input 
                id="newcat" 
                value={newCatName} 
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Shopping"
                autoFocus
              />
            </div>
            <Button type="submit" size="sm">Create</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCatForm(false)}>Cancel</Button>
          </form>
        )}
      </div>

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
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{backgroundColor: c.color || '#888'}} />
                    {c.name}
                  </div>
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
        <div className="sm:col-span-6 text-right">
          <Button type="submit" disabled={busy} className="w-full sm:w-auto px-10">
            {busy ? "Adding..." : "Add Expense"}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden bg-card">
        {expenses.length === 0 && (
          <p className="p-10 text-sm text-muted-foreground text-center">
            No expenses yet. Add your first one to start tracking!
          </p>
        )}
        {expenses.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor: e.categories?.color || '#888'}} />
                <p className="font-medium truncate">
                  {e.description || "Untitled"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(e.expense_date)} · {e.categories?.name ?? "Uncategorized"} ·{" "}
                <span className="uppercase">{e.payment_mode ?? "—"}</span>
              </p>
            </div>
            <p className="font-semibold tabular-nums text-lg">{formatCurrency(e.amount)}</p>
            <button
              onClick={() => remove(e.id)}
              className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors"
              aria-label="Delete expense"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
