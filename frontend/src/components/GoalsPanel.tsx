import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string;
};

export const GoalsPanel = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .order("created_at", { ascending: false });
    setGoals((data as any) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(target);
    if (!title || isNaN(amt) || amt <= 0) return toast.error("Fill all fields");
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        title,
        target_amount: amt,
        deadline: deadline || null,
      });
      if (error) throw error;
      toast.success("Goal created");
      setTitle("");
      setTarget("");
      setDeadline("");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const contribute = async (g: Goal, delta: number) => {
    const next = Math.max(0, Number(g.current_amount) + delta);
    const status = next >= Number(g.target_amount) ? "completed" : "active";
    const { error } = await supabase
      .from("savings_goals")
      .update({ current_amount: next, status })
      .eq("id", g.id);
    if (error) return toast.error(error.message);
    if (status === "completed") toast.success("Goal completed!");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <section className="space-y-6">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="gtitle">Title</Label>
          <Input
            id="gtitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vacation fund"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gtarget">Target</Label>
          <Input
            id="gtarget"
            type="number"
            step="0.01"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gdeadline">Deadline</Label>
          <Input
            id="gdeadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="sm:col-span-4">
          <Button type="submit" disabled={busy}>
            {busy ? "Creating..." : "Create goal"}
          </Button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {goals.length === 0 && (
          <p className="sm:col-span-2 p-6 text-sm text-muted-foreground text-center border border-border rounded-lg">
            No goals yet. Set your first one above.
          </p>
        )}
        {goals.map((g) => {
          const pct = Math.min(
            100,
            (Number(g.current_amount) / Number(g.target_amount)) * 100,
          );
          const done = g.status === "completed";
          return (
            <div key={g.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.deadline ? `Due ${formatDate(g.deadline)}` : "No deadline"}
                    {done && " · ✓ completed"}
                  </p>
                </div>
                <button
                  onClick={() => remove(g.id)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted"
                  aria-label="Delete goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    {formatCurrency(g.current_amount)}
                  </span>
                  <span>{formatCurrency(g.target_amount)}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => contribute(g, 10)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> $10
                </Button>
                <Button size="sm" variant="outline" onClick={() => contribute(g, 50)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> $50
                </Button>
                <Button size="sm" variant="outline" onClick={() => contribute(g, 100)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> $100
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
