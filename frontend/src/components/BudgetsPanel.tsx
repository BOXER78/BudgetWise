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
import { formatCurrency, monthName } from "@/lib/format";
import { Trash2 } from "lucide-react";

type Category = { id: string; name: string };
type Budget = {
  id: string;
  amount: number;
  month: number;
  year: number;
  category_id: string | null;
  categories?: { name: string } | null;
};
type Spending = { categoryId: string | null; spent: number };

export const BudgetsPanel = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<Spending[]>([]);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("__monthly__");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);

    const [{ data: b }, { data: c }, { data: exps }] = await Promise.all([
      supabase
        .from("budgets")
        .select("*, categories(name)")
        .eq("year", year)
        .eq("month", month),
      supabase.from("categories").select("id,name").order("name"),
      supabase
        .from("expenses")
        .select("amount, category_id")
        .gte("expense_date", start)
        .lt("expense_date", end),
    ]);
    setBudgets((b as any) ?? []);
    setCategories((c as any) ?? []);

    const map = new Map<string | null, number>();
    let total = 0;
    (exps ?? []).forEach((e: any) => {
      total += Number(e.amount);
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + Number(e.amount));
    });
    const arr: Spending[] = Array.from(map.entries()).map(([categoryId, spent]) => ({
      categoryId,
      spent,
    }));
    arr.push({ categoryId: null, spent: total });
    setSpending(arr);
  };

  useEffect(() => {
    load();
  }, [year, month]);

  const spentFor = (catId: string | null) =>
    spending.find((s) => s.categoryId === catId)?.spent ?? 0;
  const monthlyTotal = spending.find((s) => s.categoryId === null)?.spent ?? 0;

  const setBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const cat = categoryId === "__monthly__" ? null : categoryId;
      const { error } = await supabase.from("budgets").upsert(
        {
          user_id: user.id,
          category_id: cat,
          amount: amt,
          month,
          year,
        },
        { onConflict: "user_id,category_id,month,year" },
      );
      if (error) throw error;
      toast.success("Budget saved");
      setAmount("");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const Bar = ({ spent, limit }: { spent: number; limit: number }) => {
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const over = spent > limit;
    return (
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: over
              ? "hsl(var(--destructive))"
              : pct > 80
              ? "hsl(var(--warning))"
              : "hsl(var(--foreground))",
          }}
        />
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {monthName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
              (y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={setBudget} className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Scope</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__monthly__">Overall monthly budget</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bamount">Amount</Label>
          <Input
            id="bamount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving..." : "Set budget"}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border divide-y divide-border">
        {budgets.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No budgets set for {monthName(month)} {year}.
          </p>
        )}
        {budgets
          .sort((a, b) => (a.category_id === null ? -1 : b.category_id === null ? 1 : 0))
          .map((b) => {
            const label = b.category_id ? b.categories?.name ?? "Category" : "Monthly total";
            const spent = b.category_id ? spentFor(b.category_id) : monthlyTotal;
            return (
              <div key={b.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{label}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(spent)} / {formatCurrency(b.amount)}
                    </p>
                    <button
                      onClick={() => remove(b.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted"
                      aria-label="Delete budget"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <Bar spent={spent} limit={Number(b.amount)} />
              </div>
            );
          })}
      </div>
    </section>
  );
};
