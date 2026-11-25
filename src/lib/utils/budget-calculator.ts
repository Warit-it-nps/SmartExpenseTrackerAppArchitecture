import { getBangkokDateString } from './timezone.ts';

/**
 * คำนวณ Daily Safe-to-Spend ของเดือนปัจจุบันตามเวลาประเทศไทย (Asia/Bangkok)
 */
export function calculateSafeToSpend(
  totalBudgetLimit: number,
  totalExpenseThisMonth: number,
  expenseToday: number,
  referenceDate: Date = new Date()
) {
  const todayStr = getBangkokDateString(referenceDate); // YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = todayStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const currentDay = Number(dayStr);

  const daysInMonth = new Date(year, month, 0).getDate();
  const remainingDaysIncludingToday = Math.max(1, daysInMonth - currentDay + 1);

  const remainingPoolAtStartOfToday =
    totalBudgetLimit - (totalExpenseThisMonth - expenseToday);

  const dailyQuotaForToday =
    totalBudgetLimit > 0
      ? Math.max(0, remainingPoolAtStartOfToday / remainingDaysIncludingToday)
      : 0;

  const safeToSpendRemainingToday = Math.max(0, dailyQuotaForToday - expenseToday);
  const remainingMonthBudget = totalBudgetLimit - totalExpenseThisMonth;

  return {
    totalBudgetLimit: Number(totalBudgetLimit.toFixed(2)),
    totalExpenseThisMonth: Number(totalExpenseThisMonth.toFixed(2)),
    remainingMonthBudget: Number(remainingMonthBudget.toFixed(2)),
    dailyQuotaForToday: Number(dailyQuotaForToday.toFixed(2)),
    safeToSpendRemainingToday: Number(safeToSpendRemainingToday.toFixed(2)),
    expenseToday: Number(expenseToday.toFixed(2)),
    remainingDays: remainingDaysIncludingToday,
    daysInMonth,
    isOverBudgetToday: totalBudgetLimit > 0 && expenseToday > dailyQuotaForToday,
  };
}
