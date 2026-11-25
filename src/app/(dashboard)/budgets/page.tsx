import { upsertBudgetAction } from '@/actions/budget.actions';
import { formatTHB, getBangkokMonthYear } from '@/lib/utils/timezone';
import { loadAppState } from '@/lib/store';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const currentMonth = getBangkokMonthYear();
  const db = await loadAppState();

  const categories = db.categories.filter((c) => c.type === 'EXPENSE');
  const budgets = db.budgets.filter((b) => b.month_year === currentMonth);
  const expenses = db.transactions.filter(
    (t) => t.type === 'EXPENSE' && t.transaction_date.startsWith(currentMonth)
  );

  const spentByCategory = new Map<string, number>();
  let totalSpentAll = 0;

  for (const tx of expenses) {
    const amt = Number(tx.amount);
    totalSpentAll += amt;
    if (tx.category_id) {
      spentByCategory.set(
        tx.category_id,
        (spentByCategory.get(tx.category_id) ?? 0) + amt
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          งบประมาณประจำเดือน ({currentMonth})
        </h1>
        <p className="text-sm text-slate-500">
          กำหนดวงเงินรายหมวดหมู่พร้อมระบบแจ้งเตือนเมื่อใกล้เต็มงบ
        </p>
      </div>

      <form
        action={upsertBudgetAction}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
      >
        <input type="hidden" name="monthYear" value={currentMonth} />
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            เลือกหมวดหมู่
          </label>
          <select
            name="categoryId"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="OVERALL">⭐ งบภาพรวมทั้งเดือน</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            วงเงินงบประมาณ (บาท)
          </label>
          <input
            name="amountLimit"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="เช่น 5000"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            แจ้งเตือนเมื่อใช้ถึง (%)
          </label>
          <input
            name="alertThreshold"
            type="number"
            min="10"
            max="100"
            defaultValue="80"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition cursor-pointer"
        >
          บันทึกงบประมาณ
        </button>
      </form>

      <div className="space-y-4">
        {budgets.map((b) => {
          const catObj = categories.find((c) => c.id === b.category_id);
          const spent = b.category_id
            ? spentByCategory.get(b.category_id) ?? 0
            : totalSpentAll;
          const limit = Number(b.amount_limit);
          const percent = Math.min(100, Math.round((spent / limit) * 100));
          const rawPercent = Math.round((spent / limit) * 100);
          const isOver = spent > limit;
          const isWarning = !isOver && rawPercent >= Number(b.alert_threshold);

          const barColor = isOver
            ? 'bg-red-600'
            : isWarning
            ? 'bg-amber-500'
            : 'bg-emerald-500';

          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-900">
                    {catObj?.name ?? '⭐ งบภาพรวมทั้งเดือน'}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ใช้ไปแล้ว {formatTHB(spent)} จาก {formatTHB(limit)} ({rawPercent}%)
                  </p>
                </div>

                {isOver ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    เกินงบ {formatTHB(spent - limit)}
                  </span>
                ) : isWarning ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    ใกล้เต็มงบ ({rawPercent}%)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    คงเหลือ {formatTHB(limit - spent)}
                  </span>
                )}
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
