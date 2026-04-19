import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, monthName } from "@/lib/format";

type Stat = {
  monthTotal: number;
  expenseCount: number;
  byCategory: { name: string; color: string; total: number }[];
};

export const SummaryPanel = () => {
  const [stat, setStat] = useState<Stat | null>(null);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    (async () => {
      const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("expenses")
        .select("amount, categories(name, color)")
        .gte("expense_date", start)
        .lt("expense_date", end);

      const rows = (data as any) ?? [];
      const total = rows.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const map = new Map<string, { name: string; color: string; total: number }>();
      rows.forEach((r: any) => {
        const name = r.categories?.name ?? "Uncategorized";
        const color = r.categories?.color ?? "#888";
        const existing = map.get(name) ?? { name, color, total: 0 };
        existing.total += Number(r.amount);
        map.set(name, existing);
      });
      setStat({
        monthTotal: total,
        expenseCount: rows.length,
        byCategory: Array.from(map.values()).sort((a, b) => b.total - a.total),
      });
    })();
  }, [month, year]);

  if (!stat) return <div className="h-32" />;

  return (
    <section className="grid gap-6 sm:grid-cols-3">
      <div className="rounded-lg border border-border p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {monthName(month)} {year}
        </p>
        <p className="text-3xl font-medium mt-2 tabular-nums">
          {formatCurrency(stat.monthTotal)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {stat.expenseCount} {stat.expenseCount === 1 ? "expense" : "expenses"}
        </p>
      </div>

      <div className="sm:col-span-2 rounded-lg border border-border p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
          By category
        </p>
        {stat.byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending this month.</p>
        ) : (
          <div className="space-y-2">
            {stat.byCategory.map((c) => {
              const pct = stat.monthTotal > 0 ? (c.total / stat.monthTotal) * 100 : 0;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm w-28 truncate">{c.name}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                    />
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground w-20 text-right">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
