'use client';

import { useState, useTransition } from 'react';
import { createTransactionAction } from '@/actions/transaction.actions';
import { getBangkokDateString } from '@/lib/utils/timezone';
import { Loader2, Check } from 'lucide-react';

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  current_balance: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

interface TransactionFormProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
  initialValues?: {
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount?: number;
    accountId?: string;
    toAccountId?: string;
    categoryId?: string;
    transactionDate?: string;
    note?: string;
    slipStoragePath?: string | null;
    source?: 'WEB' | 'AI_QUICK';
  };
  onSuccess?: () => void;
}

export function TransactionForm({
  accounts,
  categories,
  initialValues,
  onSuccess,
}: TransactionFormProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>(
    initialValues?.type ?? 'EXPENSE'
  );
  const [amount, setAmount] = useState<string>(
    initialValues?.amount ? String(initialValues.amount) : ''
  );
  const [accountId, setAccountId] = useState<string>(
    initialValues?.accountId ?? accounts[0]?.id ?? ''
  );
  const [toAccountId, setToAccountId] = useState<string>(
    initialValues?.toAccountId ?? accounts[1]?.id ?? ''
  );
  const [categoryId, setCategoryId] = useState<string>(
    initialValues?.categoryId ?? ''
  );
  const [transactionDate, setTransactionDate] = useState<string>(
    initialValues?.transactionDate ?? getBangkokDateString()
  );
  const [note, setNote] = useState<string>(initialValues?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => `idemp-${Date.now()}`
  );
  const [isPending, startTransition] = useTransition();

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createTransactionAction({
        type,
        amount: parseFloat(amount),
        accountId: accountId || accounts[0]?.id || '',
        toAccountId: type === 'TRANSFER' ? toAccountId : null,
        categoryId:
          type === 'TRANSFER'
            ? null
            : categoryId || filteredCategories[0]?.id || null,
        transactionDate,
        note,
        slipStoragePath: initialValues?.slipStoragePath ?? null,
        idempotencyKey,
        source: initialValues?.source ?? 'WEB',
      });

      if (res?.error) {
        setError(res.error);
        return;
      }

      setAmount('');
      setNote('');
      setSuccessMsg('บันทึกรายการสำเร็จ!');
      setIdempotencyKey(`idemp-${Date.now()}-${Math.random()}`);
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
        {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              type === t
                ? t === 'EXPENSE'
                  ? 'bg-red-600 text-white shadow-sm'
                  : t === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t === 'EXPENSE' ? 'รายจ่าย' : t === 'INCOME' ? 'รายรับ' : 'โอนเงิน'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            จำนวนเงิน (บาท) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            วันที่ (เวลาไทย) *
          </label>
          <input
            type="date"
            required
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {type === 'TRANSFER' ? 'โอนจากบัญชี *' : 'บัญชี *'}
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (฿{Number(acc.current_balance).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {type === 'TRANSFER' ? (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ไปยังบัญชี *
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {accounts
                .filter((acc) => acc.id !== accountId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              หมวดหมู่ *
            </label>
            <select
              value={categoryId || filteredCategories[0]?.id || ''}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          บันทึกช่วยจำ
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น กาแฟอเมซอน, ค่ารถไฟฟ้า"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังบันทึก...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            ยืนยันและบันทึกรายการ
          </>
        )}
      </button>
    </form>
  );
}
