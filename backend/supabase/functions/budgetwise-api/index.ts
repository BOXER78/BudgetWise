// BudgetWise API Implementation


import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =================== ENTITIES (data classes) ===================
class Expense {
  constructor(
    public amount: number,
    public expenseDate: string,
    public description: string,
    public paymentMode: string,
    public categoryId: string | null,
  ) {}
}

class BudgetStatus {
  constructor(
    public hasBudget: boolean,
    public budgetAmount: number,
    public spent: number,
    public remaining: number,
    public overLimit: boolean,
    public scope: "category" | "monthly" | "none",
  ) {}
}

// =================== REPOSITORIES ===================
class ExpenseRepository {
  constructor(private db: SupabaseClient, private userId: string) {}

  async insert(e: Expense) {
    const { data, error } = await this.db
      .from("expenses")
      .insert({
        user_id: this.userId,
        amount: e.amount,
        expense_date: e.expenseDate,
        description: e.description,
        payment_mode: e.paymentMode,
        category_id: e.categoryId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async sumForMonth(year: number, month: number, categoryId?: string | null) {
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    let q = this.db
      .from("expenses")
      .select("amount")
      .eq("user_id", this.userId)
      .gte("expense_date", start)
      .lt("expense_date", end);
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
  }
}

class BudgetRepository {
  constructor(private db: SupabaseClient, private userId: string) {}

  async findForPeriod(
    year: number,
    month: number,
    categoryId: string | null,
  ) {
    let q = this.db
      .from("budgets")
      .select("*")
      .eq("user_id", this.userId)
      .eq("year", year)
      .eq("month", month);
    q = categoryId ? q.eq("category_id", categoryId) : q.is("category_id", null);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data;
  }
}

// =================== SERVICES ===================
class BudgetService {
  constructor(
    private budgetRepo: BudgetRepository,
    private expenseRepo: ExpenseRepository,
  ) {}

  async checkBudgetLimit(
    year: number,
    month: number,
    categoryId: string | null,
  ): Promise<BudgetStatus> {
    // Try category budget first, fall back to overall monthly budget
    let budget = categoryId
      ? await this.budgetRepo.findForPeriod(year, month, categoryId)
      : null;
    let scope: "category" | "monthly" | "none" = "category";

    if (!budget) {
      budget = await this.budgetRepo.findForPeriod(year, month, null);
      scope = budget ? "monthly" : "none";
    }

    if (!budget) {
      return new BudgetStatus(false, 0, 0, 0, false, "none");
    }

    const spent = await this.expenseRepo.sumForMonth(
      year,
      month,
      scope === "category" ? categoryId : null,
    );
    const amount = Number(budget.amount);
    return new BudgetStatus(
      true,
      amount,
      spent,
      amount - spent,
      spent > amount,
      scope,
    );
  }
}

class ExpenseService {
  constructor(
    private expenseRepo: ExpenseRepository,
    private budgetService: BudgetService,
  ) {}

  async addExpense(e: Expense) {
    const saved = await this.expenseRepo.insert(e);
    const d = new Date(e.expenseDate);
    const status = await this.budgetService.checkBudgetLimit(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      e.categoryId,
    );
    return { expense: saved, budget: status };
  }
}

// =================== CONTROLLER ===================
class ExpenseController {
  constructor(private service: ExpenseService) {}

  async addExpense(body: any) {
    if (typeof body?.amount !== "number" || body.amount < 0) {
      return { status: 400, body: { error: "amount must be a positive number" } };
    }
    if (!body?.expense_date || typeof body.expense_date !== "string") {
      return { status: 400, body: { error: "expense_date is required (YYYY-MM-DD)" } };
    }
    const expense = new Expense(
      body.amount,
      body.expense_date,
      String(body.description ?? ""),
      String(body.payment_mode ?? "cash"),
      body.category_id ?? null,
    );
    const result = await this.service.addExpense(expense);
    return { status: 200, body: result };
  }

  async checkBudget(body: any) {
    const now = new Date();
    const year = body?.year ?? now.getUTCFullYear();
    const month = body?.month ?? now.getUTCMonth() + 1;
    const categoryId = body?.category_id ?? null;
    const status = await (this.service as any).budgetService.checkBudgetLimit(
      year,
      month,
      categoryId,
    );
    return { status: 200, body: status };
  }
}

// =================== HTTP ENTRY ===================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const db = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await db.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Wire up dependencies (DI)
    const expenseRepo = new ExpenseRepository(db, userId);
    const budgetRepo = new BudgetRepository(db, userId);
    const budgetService = new BudgetService(budgetRepo, expenseRepo);
    const expenseService = new ExpenseService(expenseRepo, budgetService);
    const expenseController = new ExpenseController(expenseService);

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "";

    let result: { status: number; body: unknown };
    switch (action) {
      case "add_expense":
        result = await expenseController.addExpense(body.payload ?? {});
        break;
      case "check_budget":
        result = await expenseController.checkBudget(body.payload ?? {});
        break;
      default:
        result = { status: 400, body: { error: `Unknown action: ${action}` } };
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("budgetwise-api error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
