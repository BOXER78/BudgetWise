-- ===== Shared trigger function for updated_at =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== CATEGORIES =====
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#888888',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories select own" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories insert own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories update own" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories delete own" ON public.categories FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_categories_user ON public.categories(user_id);

-- ===== EXPENSES =====
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  payment_mode TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses select own" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses insert own" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses update own" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses delete own" ON public.expenses FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);

-- ===== BUDGETS =====
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month, year)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets select own" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets insert own" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets update own" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets delete own" ON public.budgets FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_budgets_user_period ON public.budgets(user_id, year, month);

-- ===== SAVINGS GOALS =====
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals select own" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals insert own" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals update own" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals delete own" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_goals_user ON public.savings_goals(user_id);

-- ===== Auto-create profile + default categories on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  INSERT INTO public.categories (user_id, name, description, color) VALUES
    (NEW.id, 'Food',          'Groceries & dining',  '#ef4444'),
    (NEW.id, 'Transport',     'Travel & commute',    '#3b82f6'),
    (NEW.id, 'Bills',         'Utilities & rent',    '#f59e0b'),
    (NEW.id, 'Entertainment', 'Leisure & fun',       '#8b5cf6'),
    (NEW.id, 'Shopping',      'Personal purchases',  '#ec4899'),
    (NEW.id, 'Other',         'Uncategorized',       '#64748b');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();