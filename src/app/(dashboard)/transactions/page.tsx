import { TransactionForm } from '@/components/transactions/TransactionForm';
import { deleteTransactionAction } from '@/actions/transaction.actions';
import { formatTHB } from '@/lib/utils/timezone';
import { readLocalDB } from '@/lib/store';
import { Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const db = readLocalDB();
  const accounts = db.accounts.filter((a) => !a.is_archived);
  const categories = db.categories;
  const transactions = db.transactions.slice(0, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">รายการเดินบัญชี</h1>
        <p className="text-sm text-slate-500">
          บันทึกรายรับ รายจ่าย และโอนเงินระหว่างบัญชี (อัปเดตยอดคงเหลือแบบ Atomic)
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">เพิ่มรายการใหม่</h2>
        <TransactionForm accounts={accounts} categories={categories} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">
            รายการล่าสุด ({transactions.length} รายการ)
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const acc = accounts.find((a) => a.id === tx.account_id);
            const toAcc = accounts.find((a) => a.id === tx.to_account_id);
            const cat = categories.find((c) => c.id === tx.category_id);

            return (
              <div key={tx.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {tx.type === 'TRANSFER'
                        ? `โอนเงิน: ${acc?.name} → ${toAcc?.name}`
                        : cat?.name || 'ไม่ระบุหมวดหมู่'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {acc?.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                      {tx.source}
                    </span>
                  </div>
                  {tx.note && <p className="text-xs text-slate-500 mt-0.5">{tx.note}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">{tx.transaction_date}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold ${
                      tx.type === 'INCOME'
                        ? 'text-emerald-600'
                        : tx.type === 'EXPENSE'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                    {formatTHB(tx.amount)}
                  </span>

                  <form
                    action={async () => {
                      'use server';
                      await deleteTransactionAction(tx.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="ลบรายการและคืนยอดเงินกลับเข้าบัญชี"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
