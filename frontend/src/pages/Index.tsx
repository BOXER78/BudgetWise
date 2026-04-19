import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ExpensesPanel } from "@/components/ExpensesPanel";
import { BudgetsPanel } from "@/components/BudgetsPanel";
import { GoalsPanel } from "@/components/GoalsPanel";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.name ?? ""));
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-base font-medium tracking-tight">BudgetWise</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {name || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <SummaryPanel />

        <Tabs defaultValue="expenses">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-6">
            <ExpensesPanel />
          </TabsContent>
          <TabsContent value="budgets" className="mt-6">
            <BudgetsPanel />
          </TabsContent>
          <TabsContent value="goals" className="mt-6">
            <GoalsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Index;
