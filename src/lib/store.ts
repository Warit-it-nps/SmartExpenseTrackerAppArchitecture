import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getBangkokDateString, getBangkokMonthYear } from './utils/timezone.ts';

export interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'EWALLET';
  initial_balance: number;
  current_balance: number;
  color: string;
  icon: string;
  is_archived: boolean;
}

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  is_default: boolean;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  transaction_date: string;
  note: string | null;
  slip_storage_path: string | null;
  idempotency_key: string | null;
  source: 'WEB' | 'AI_QUICK' | 'API' | 'MCP';
  created_at: string;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  category_id: string | null;
  month_year: string;
  amount_limit: number;
  alert_threshold: number;
}

interface LocalDB {
  accounts: AccountRow[];
  categories: CategoryRow[];
  transactions: TransactionRow[];
  budgets: BudgetRow[];
  api_keys: Array<{
    id: string;
    user_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    scopes: string[];
    is_active: boolean;
  }>;
}

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DB_FILE = path.join(process.cwd(), '.local-demo-db.json');

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('your-project-id'));
}

function getInitialSeed(): LocalDB {
  const today = getBangkokDateString();
  const currentMonth = getBangkokMonthYear();
  const cashAccId = '11111111-1111-4111-8111-111111111111';
  const kbankAccId = '22222222-2222-4222-8222-222222222222';
  const ktcAccId = '33333333-3333-4333-8333-333333333333';

  const catFood = 'aaaa1111-1111-4111-8111-111111111111';
  const catTravel = 'aaaa2222-2222-4222-8222-222222222222';
  const catShop = 'aaaa3333-3333-4333-8333-333333333333';
  const catBill = 'aaaa4444-4444-4444-8444-444444444444';
  const catSalary = 'bbbb1111-1111-4111-8111-111111111111';

  const demoApiKeyHash = crypto
    .createHash('sha256')
    .update('sk_live_demo_smart_expense_2026')
    .digest('hex');

  return {
    accounts: [
      {
        id: cashAccId,
        user_id: DEMO_USER_ID,
        name: 'เงินสด',
        type: 'CASH',
        initial_balance: 3000.0,
        current_balance: 2775.0,
        color: '#10b981',
        icon: 'banknote',
        is_archived: false,
      },
      {
        id: kbankAccId,
        user_id: DEMO_USER_ID,
        name: 'กสิกรไทย (K-Bank)',
        type: 'BANK',
        initial_balance: 15000.0,
        current_balance: 57180.0,
        color: '#059669',
        icon: 'landmark',
        is_archived: false,
      },
      {
        id: ktcAccId,
        user_id: DEMO_USER_ID,
        name: 'บัตรเครดิต KTC',
        type: 'CREDIT_CARD',
        initial_balance: 0.0,
        current_balance: -1890.0,
        color: '#6366f1',
        icon: 'credit-card',
        is_archived: false,
      },
    ],
    categories: [
      { id: catFood, user_id: DEMO_USER_ID, name: 'อาหารและเครื่องดื่ม', type: 'EXPENSE', icon: 'utensils', color: '#ef4444', is_default: true },
      { id: catTravel, user_id: DEMO_USER_ID, name: 'เดินทาง', type: 'EXPENSE', icon: 'car', color: '#f97316', is_default: true },
      { id: catShop, user_id: DEMO_USER_ID, name: 'ช้อปปิ้ง', type: 'EXPENSE', icon: 'shopping-bag', color: '#ec4899', is_default: true },
      { id: catBill, user_id: DEMO_USER_ID, name: 'บิลและสาธารณูปโภค', type: 'EXPENSE', icon: 'receipt', color: '#3b82f6', is_default: true },
      { id: catSalary, user_id: DEMO_USER_ID, name: 'เงินเดือน', type: 'INCOME', icon: 'briefcase', color: '#10b981', is_default: true },
    ],
    transactions: [
      {
        id: 'tx-001',
        user_id: DEMO_USER_ID,
        account_id: kbankAccId,
        to_account_id: null,
        category_id: catSalary,
        type: 'INCOME',
        amount: 45000.0,
        transaction_date: `${currentMonth}-01`,
        note: 'เงินเดือนเข้าบัญชี',
        slip_storage_path: null,
        idempotency_key: 'seed-tx-001',
        source: 'WEB',
        created_at: new Date().toISOString(),
      },
      {
        id: 'tx-002',
        user_id: DEMO_USER_ID,
        account_id: kbankAccId,
        to_account_id: null,
        category_id: catBill,
        type: 'EXPENSE',
        amount: 2735.0,
        transaction_date: `${currentMonth}-05`,
        note: 'ค่าไฟ + อินเทอร์เน็ตบ้าน',
        slip_storage_path: null,
        idempotency_key: 'seed-tx-002',
        source: 'WEB',
        created_at: new Date().toISOString(),
      },
      {
        id: 'tx-003',
        user_id: DEMO_USER_ID,
        account_id: ktcAccId,
        to_account_id: null,
        category_id: catShop,
        type: 'EXPENSE',
        amount: 1890.0,
        transaction_date: `${currentMonth}-12`,
        note: 'ซื้อหูฟังไร้สาย Shopee',
        slip_storage_path: null,
        idempotency_key: 'seed-tx-003',
        source: 'AI_QUICK',
        created_at: new Date().toISOString(),
      },
      {
        id: 'tx-004',
        user_id: DEMO_USER_ID,
        account_id: kbankAccId,
        to_account_id: null,
        category_id: catFood,
        type: 'EXPENSE',
        amount: 85.0,
        transaction_date: today,
        note: 'กาแฟอเมซอน โอนกสิกร',
        slip_storage_path: null,
        idempotency_key: 'seed-tx-004',
        source: 'AI_QUICK',
        created_at: new Date().toISOString(),
      },
      {
        id: 'tx-005',
        user_id: DEMO_USER_ID,
        account_id: cashAccId,
        to_account_id: null,
        category_id: catTravel,
        type: 'EXPENSE',
        amount: 225.0,
        transaction_date: today,
        note: 'วินมอเตอร์ไซค์ + BTS',
        slip_storage_path: null,
        idempotency_key: 'seed-tx-005',
        source: 'WEB',
        created_at: new Date().toISOString(),
      },
    ],
    budgets: [
      {
        id: 'b-overall',
        user_id: DEMO_USER_ID,
        category_id: null,
        month_year: currentMonth,
        amount_limit: 15000.0,
        alert_threshold: 80,
      },
      {
        id: 'b-food',
        user_id: DEMO_USER_ID,
        category_id: catFood,
        month_year: currentMonth,
        amount_limit: 4500.0,
        alert_threshold: 80,
      },
      {
        id: 'b-shop',
        user_id: DEMO_USER_ID,
        category_id: catShop,
        month_year: currentMonth,
        amount_limit: 2000.0,
        alert_threshold: 80,
      },
    ],
    api_keys: [
      {
        id: 'key-demo-1',
        user_id: DEMO_USER_ID,
        name: 'Demo External API & MCP Key',
        key_prefix: 'sk_live_demo...',
        key_hash: demoApiKeyHash,
        scopes: ['transactions:read', 'transactions:write', 'summary:read'],
        is_active: true,
      },
    ],
  };
}

export function readLocalDB(): LocalDB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const seed = getInitialSeed();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as LocalDB;
  } catch {
    return getInitialSeed();
  }
}

export function writeLocalDB(db: LocalDB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * Atomic Transaction Creator (จำลอง PostgreSQL RPC create_transaction_atomic เป๊ะๆ ในโหมด Local/Demo
 * หรือเรียก Supabase RPC จริงเมื่อตั้งค่า NEXT_PUBLIC_SUPABASE_URL แล้ว)
 */
export async function executeCreateTransactionAtomic(params: {
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  transactionDate: string;
  note?: string | null;
  slipStoragePath?: string | null;
  idempotencyKey: string;
  source: 'WEB' | 'AI_QUICK' | 'API' | 'MCP';
}) {
  const amountFixed = Number(Number(params.amount).toFixed(2));
  if (amountFixed <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');

  if (isSupabaseConfigured()) {
    const { createClient: createSupabaseServerClient } = await import('./supabase/server');
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_transaction_atomic', {
      p_account_id: params.accountId,
      p_to_account_id: params.type === 'TRANSFER' ? params.toAccountId : null,
      p_category_id: params.type === 'TRANSFER' ? null : params.categoryId,
      p_type: params.type,
      p_amount: amountFixed,
      p_transaction_date: params.transactionDate,
      p_note: params.note ?? null,
      p_slip_storage_path: params.slipStoragePath ?? null,
      p_idempotency_key: params.idempotencyKey,
      p_source: params.source,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  // Local Atomic Execution
  const db = readLocalDB();

  // 1. Idempotency check
  const existing = db.transactions.find(
    (t) => t.idempotency_key === params.idempotencyKey
  );
  if (existing) return existing;

  const sourceAcc = db.accounts.find((a) => a.id === params.accountId);
  if (!sourceAcc) throw new Error('ไม่พบบัญชีต้นทาง');

  if (params.type === 'TRANSFER') {
    if (!params.toAccountId || params.toAccountId === params.accountId) {
      throw new Error('กรุณาเลือกบัญชีปลายทางที่ต่างจากบัญชีต้นทาง');
    }
    const destAcc = db.accounts.find((a) => a.id === params.toAccountId);
    if (!destAcc) throw new Error('ไม่พบบัญชีปลายทาง');

    sourceAcc.current_balance = Number((sourceAcc.current_balance - amountFixed).toFixed(2));
    destAcc.current_balance = Number((destAcc.current_balance + amountFixed).toFixed(2));
  } else if (params.type === 'INCOME') {
    sourceAcc.current_balance = Number((sourceAcc.current_balance + amountFixed).toFixed(2));
  } else if (params.type === 'EXPENSE') {
    sourceAcc.current_balance = Number((sourceAcc.current_balance - amountFixed).toFixed(2));
  }

  const newTx: TransactionRow = {
    id: crypto.randomUUID(),
    user_id: DEMO_USER_ID,
    account_id: params.accountId,
    to_account_id: params.type === 'TRANSFER' ? params.toAccountId ?? null : null,
    category_id: params.type === 'TRANSFER' ? null : params.categoryId ?? null,
    type: params.type,
    amount: amountFixed,
    transaction_date: params.transactionDate,
    note: params.note ?? null,
    slip_storage_path: params.slipStoragePath ?? null,
    idempotency_key: params.idempotencyKey,
    source: params.source,
    created_at: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);
  writeLocalDB(db);
  return newTx;
}

export async function executeDeleteTransactionAtomic(transactionId: string) {
  if (isSupabaseConfigured()) {
    const { createClient: createSupabaseServerClient } = await import('./supabase/server');
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('delete_transaction_atomic', {
      p_transaction_id: transactionId,
    });
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const idx = db.transactions.findIndex((t) => t.id === transactionId);
  if (idx === -1) throw new Error('ไม่พบรายการที่ต้องการลบ');

  const oldTx = db.transactions[idx];
  const sourceAcc = db.accounts.find((a) => a.id === oldTx.account_id);

  if (oldTx.type === 'INCOME' && sourceAcc) {
    sourceAcc.current_balance = Number((sourceAcc.current_balance - oldTx.amount).toFixed(2));
  } else if (oldTx.type === 'EXPENSE' && sourceAcc) {
    sourceAcc.current_balance = Number((sourceAcc.current_balance + oldTx.amount).toFixed(2));
  } else if (oldTx.type === 'TRANSFER' && sourceAcc) {
    sourceAcc.current_balance = Number((sourceAcc.current_balance + oldTx.amount).toFixed(2));
    const destAcc = db.accounts.find((a) => a.id === oldTx.to_account_id);
    if (destAcc) {
      destAcc.current_balance = Number((destAcc.current_balance - oldTx.amount).toFixed(2));
    }
  }

  db.transactions.splice(idx, 1);
  writeLocalDB(db);
  return true;
}
