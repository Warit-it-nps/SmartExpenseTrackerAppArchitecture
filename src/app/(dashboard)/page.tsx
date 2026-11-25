import { QuickAddAIBar } from '@/components/ai/QuickAddAIBar';
import { ExpenseCharts } from '@/components/dashboard/ExpenseCharts';
import { calculateSafeToSpend } from '@/lib/utils/budget-calculator';
import {
  formatTHB,
  getBangkokDateString,
  getBangkokMonthYear,
} from '@/lib/utils/timezone';
import { readLocalDB } from '@/lib/store';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const todayStr = getBangkokDateString();
  const currentMonth = getBangkokMonthYear();
  const db = readLocalDB();

  const accounts = db.accounts.filter((a) => !a.is_archived);
  const categories = db.categories;
  const monthTransactions = db.transactions.filter((t) =>
    t.transaction_date.startsWith(currentMonth)
  );
  const budgets = db.budgets.filter((b) => b.month_year === currentMonth);

  const totalNetWorth = accounts.reduce(
    (sum, acc) => sum + Number(acc.current_balance),
    0
  );

  let totalIncomeMonth = 0;
  let totalExpenseMonth = 0;
  let expenseToday = 0;

  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  const dailyMap = new Map<string, { day: string; income: number; expense: number }>();

  for (const tx of monthTransactions) {
    const amt = Number(tx.amount);
    const dayLabel = tx.transaction_date.slice(8, 10);

    if (!dailyMap.has(dayLabel)) {
      dailyMap.set(dayLabel, { day: dayLabel, income: 0, expense: 0 });
    }
    const dayEntry = dailyMap.get(dayLabel)!;

    if (tx.type === 'INCOME') {
      totalIncomeMonth += amt;
      dayEntry.income += amt;
    } else if (tx.type === 'EXPENSE') {
      totalExpenseMonth += amt;
      dayEntry.expense += amt;
      if (tx.transaction_date === todayStr) {
        expenseToday += amt;
      }

      const catObj = categories.find((c) => c.id === tx.category_id);
      const catName = catObj?.name || 'อื่นๆ';
      const catColor = catObj?.color || '#64748b';
      const existing = categoryMap.get(catName) ?? {
        name: catName,
        value: 0,
        color: catColor,
      };
      existing.value = Number((existing.value + amt).toFixed(2));
      categoryMap.set(catName, existing);
    }
  }

  const overallBudgetRow = budgets.find((b) => b.category_id === null);
  const totalBudgetLimit = overallBudgetRow
    ? Number(overallBudgetRow.amount_limit)
    : budgets.reduce((sum, b) => sum + Number(b.amount_limit), 0);

  const safeToSpend = calculateSafeToSpend(
    totalBudgetLimit,
    totalExpenseMonth,
    expenseToday
  );

  const sortedDailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
    a.day.localeCompare(b.day)
  );

  return (
    <div className="space-y-6">
      <QuickAddAIBar accounts={accounts} categories={categories} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Daily Safe-to-Spend (วันนี้ใช้ได้อีก)
            </span>
            <span className="text-xs text-slate-400">
              เหลืออีก {safeToSpend.remainingDays} วันในเดือนนี้
            </span>
          </div>

          {totalBudgetLimit > 0 ? (
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-slate-900">
                {formatTHB(safeToSpend.safeToSpendRemainingToday)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                โควต้าวันนี้ {formatTHB(safeToSpend.dailyQuotaForToday)} • ใช้ไปแล้ววันนี้{' '}
                <span
                  className={
                    safeToSpend.isOverBudgetToday
                      ? 'text-red-600 font-semibold'
                      : 'text-slate-700 font-medium'
                  }
                >
                  {formatTHB(safeToSpend.expenseToday)}
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                ยังไม่ได้ตั้งงบประมาณประจำเดือน {currentMonth}
              </p>
              <Link
                href="/budgets"
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                ตั้งงบตอนนี้ →
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>ทรัพย์สินสุทธิรวม</span>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">
            {formatTHB(totalNetWorth)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            จากทั้งหมด {accounts.length} บัญชี
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> รายรับเดือนนี้
            </span>
            <span className="font-bold text-emerald-600">
              {formatTHB(totalIncomeMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" /> รายจ่ายเดือนนี้
            </span>
            <span className="font-bold text-red-600">
              {formatTHB(totalExpenseMonth)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">คงเหลือจากงบเดือนนี้</span>
            <span className="font-bold text-slate-900">
              {totalBudgetLimit > 0
                ? formatTHB(safeToSpend.remainingMonthBudget)
                : '-'}
            </span>
          </div>
        </div>
      </div>

      <ExpenseCharts
        categoryBreakdown={Array.from(categoryMap.values())}
        dailyTrend={sortedDailyTrend}
      />
    </div>
  );
}
