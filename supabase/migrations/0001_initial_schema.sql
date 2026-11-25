-- ============================================================================
-- 1. EXTENSIONS & ENUMS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE account_type AS ENUM ('CASH', 'BANK', 'CREDIT_CARD', 'EWALLET');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE category_type AS ENUM ('INCOME', 'EXPENSE');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    currency TEXT NOT NULL DEFAULT 'THB',
    timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type account_type NOT NULL DEFAULT 'CASH',
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    color TEXT DEFAULT '#10b981',
    icon TEXT DEFAULT 'wallet',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type category_type NOT NULL,
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#6366f1',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name, type)
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::DATE,
    note TEXT,
    slip_storage_path TEXT,
    idempotency_key TEXT UNIQUE,
    source TEXT NOT NULL DEFAULT 'WEB',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_transfer CHECK (
        (type = 'TRANSFER' AND to_account_id IS NOT NULL AND account_id <> to_account_id) OR
        (type IN ('INCOME', 'EXPENSE') AND to_account_id IS NULL)
    )
);

CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    month_year CHAR(7) NOT NULL CHECK (month_year ~ '^\d{4}-\d{2}$'),
    amount_limit NUMERIC(12, 2) NOT NULL CHECK (amount_limit > 0),
    alert_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (user_id, category_id, month_year)
);

CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['transactions:read', 'transactions:write', 'summary:read'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES & RLS
-- ============================================================================
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id, type);
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_budgets_user_month ON public.budgets(user_id, month_year);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own api_keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 4. AUTO-ONBOARDING TRIGGER (สร้าง Default Account & Categories เมื่อสมัครครั้งแรก)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

    INSERT INTO public.accounts (user_id, name, type, initial_balance, current_balance, color, icon)
    VALUES (NEW.id, 'เงินสด', 'CASH', 0.00, 0.00, '#10b981', 'banknote');

    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'อาหารและเครื่องดื่ม', 'EXPENSE', 'utensils', '#ef4444', TRUE),
        (NEW.id, 'เดินทาง', 'EXPENSE', 'car', '#f97316', TRUE),
        (NEW.id, 'ช้อปปิ้ง', 'EXPENSE', 'shopping-bag', '#ec4899', TRUE),
        (NEW.id, 'บิลและสาธารณูปโภค', 'EXPENSE', 'receipt', '#3b82f6', TRUE),
        (NEW.id, 'ความบันเทิง', 'EXPENSE', 'film', '#8b5cf6', TRUE),
        (NEW.id, 'อื่นๆ', 'EXPENSE', 'more-horizontal', '#64748b', TRUE),
        (NEW.id, 'เงินเดือน', 'INCOME', 'briefcase', '#10b981', TRUE),
        (NEW.id, 'รายได้เสริม', 'INCOME', 'trending-up', '#06b6d4', TRUE);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. ATOMIC RPC FUNCTIONS (create / update / delete transaction)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_transaction_atomic(
    p_account_id UUID,
    p_to_account_id UUID,
    p_category_id UUID,
    p_type transaction_type,
    p_amount NUMERIC(12, 2),
    p_transaction_date DATE,
    p_note TEXT DEFAULT NULL,
    p_slip_storage_path TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'WEB',
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx public.transactions;
    v_caller_id UUID;
BEGIN
    v_caller_id := COALESCE(auth.uid(), p_user_id);
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_tx FROM public.transactions
        WHERE idempotency_key = p_idempotency_key AND user_id = v_caller_id;
        IF FOUND THEN
            RETURN v_tx;
        END IF;
    END IF;

    INSERT INTO public.transactions (
        user_id, account_id, to_account_id, category_id, type, amount,
        transaction_date, note, slip_storage_path, idempotency_key, source
    ) VALUES (
        v_caller_id, p_account_id, p_to_account_id,
        CASE WHEN p_type = 'TRANSFER' THEN NULL ELSE p_category_id END,
        p_type, p_amount, p_transaction_date, p_note, p_slip_storage_path, p_idempotency_key, p_source
    )
    RETURNING * INTO v_tx;

    IF p_type = 'INCOME' THEN
        UPDATE public.accounts SET current_balance = current_balance + p_amount, updated_at = NOW()
        WHERE id = p_account_id AND user_id = v_caller_id;
    ELSIF p_type = 'EXPENSE' THEN
        UPDATE public.accounts SET current_balance = current_balance - p_amount, updated_at = NOW()
        WHERE id = p_account_id AND user_id = v_caller_id;
    ELSIF p_type = 'TRANSFER' THEN
        UPDATE public.accounts SET current_balance = current_balance - p_amount, updated_at = NOW()
        WHERE id = p_account_id AND user_id = v_caller_id;

        UPDATE public.accounts SET current_balance = current_balance + p_amount, updated_at = NOW()
        WHERE id = p_to_account_id AND user_id = v_caller_id;
    END IF;

    RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_transaction_atomic(
    p_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_tx public.transactions;
    v_caller_id UUID := auth.uid();
BEGIN
    SELECT * INTO v_old_tx FROM public.transactions
    WHERE id = p_transaction_id AND user_id = v_caller_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found or access denied';
    END IF;

    IF v_old_tx.type = 'INCOME' THEN
        UPDATE public.accounts SET current_balance = current_balance - v_old_tx.amount, updated_at = NOW() WHERE id = v_old_tx.account_id;
    ELSIF v_old_tx.type = 'EXPENSE' THEN
        UPDATE public.accounts SET current_balance = current_balance + v_old_tx.amount, updated_at = NOW() WHERE id = v_old_tx.account_id;
    ELSIF v_old_tx.type = 'TRANSFER' THEN
        UPDATE public.accounts SET current_balance = current_balance + v_old_tx.amount, updated_at = NOW() WHERE id = v_old_tx.account_id;
        UPDATE public.accounts SET current_balance = current_balance - v_old_tx.amount, updated_at = NOW() WHERE id = v_old_tx.to_account_id;
    END IF;

    DELETE FROM public.transactions WHERE id = p_transaction_id AND user_id = v_caller_id;
    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 6. PRIVATE STORAGE BUCKET FOR SLIPS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('slips', 'slips', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own slips"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'slips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own slips"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'slips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own slips"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'slips' AND (storage.foldername(name))[1] = auth.uid()::text);
