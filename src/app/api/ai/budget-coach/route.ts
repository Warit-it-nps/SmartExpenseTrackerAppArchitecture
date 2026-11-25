import { NextResponse } from 'next/server.js';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getBangkokDateString, getBangkokMonthYear } from '../../../../lib/utils/timezone.ts';
import { isSupabaseConfigured, readLocalDB } from '../../../../lib/store.ts';

export const maxDuration = 10;

const BudgetCoachAdviceSchema = z.object({
  healthScore: z.number().min(0).max(100),
  headline: z.string(),
  riskCategories: z.array(
    z.object({
      categoryName: z.string(),
      spentAmount: z.number(),
      issue: z.string(),
      actionableTip: z.string(),
    })
  ),
  recommendedDailyLimit: z.number(),
  encouragement: z.string(),
});

export async function POST() {
  try {
    const currentMonth = getBangkokMonthYear();
    const todayStr = getBangkokDateString();
    const db = readLocalDB();

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      let transactions: any[] = db.transactions;
      let budgets: any[] = db.budgets;

      if (isSupabaseConfigured()) {
        const { createClient } = await import('../../../../lib/supabase/server.ts');
        const supabase = await createClient();
        const [txRes, bRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('type, amount, transaction_date, note, category:categories(name)')
            .gte('transaction_date', `${currentMonth}-01`),
          supabase
            .from('budgets')
            .select('amount_limit, category:categories(name)')
            .eq('month_year', currentMonth),
        ]);
        transactions = txRes.data ?? [];
        budgets = bRes.data ?? [];
      }

      const { object: advice } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: BudgetCoachAdviceSchema,
        system: `คุณคือ AI Financial & Budget Coach ส่วนตัวสำหรับคนไทย วันที่ปัจจุบัน: ${todayStr}`,
        prompt: JSON.stringify({ budgets, transactions }),
      });

      return NextResponse.json(advice);
    }

    // Fallback dynamic analysis from actual transactions in store
    const expenses = db.transactions.filter(
      (t) => t.type === 'EXPENSE' && t.transaction_date.startsWith(currentMonth)
    );
    const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const overallBudget =
      db.budgets.find((b) => b.category_id === null)?.amount_limit ?? 15000;

    const byCat = new Map<string, number>();
    for (const tx of expenses) {
      const cat =
        db.categories.find((c) => c.id === tx.category_id)?.name ?? 'อื่นๆ';
      byCat.set(cat, (byCat.get(cat) ?? 0) + Number(tx.amount));
    }

    const sortedCats = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);

    return NextResponse.json({
      healthScore: totalSpent <= overallBudget ? 86 : 58,
      headline: `เดือนนี้คุณใช้จ่ายไปแล้ว ฿${totalSpent.toLocaleString()} จากงบรวม ฿${overallBudget.toLocaleString()} (${Math.round((totalSpent / overallBudget) * 100)}%)`,
      riskCategories: sortedCats.slice(0, 3).map(([categoryName, spentAmount]) => ({
        categoryName,
        spentAmount: Number(spentAmount.toFixed(2)),
        issue: `มียอดใช้จ่ายสะสมในหมวด "${categoryName}" สูงเป็นอันดับต้นๆ ของเดือนนี้`,
        actionableTip:
          categoryName.includes('ช้อป')
            ? 'ตั้งกฎรอ 48 ชั่วโมงก่อนกดสั่งซื้อสินค้าออนไลน์ทุกครั้ง จะช่วยลดรายจ่ายไม่จำเป็นได้ 30-40%'
            : categoryName.includes('อาหาร')
            ? 'ลดการสั่งเครื่องดื่ม/กาแฟนอกบ้านสัปดาห์ละ 2-3 แก้ว จะช่วยประหยัดได้กว่า 800-1,000 บาท/เดือน'
            : 'ตรวจสอบแพ็กเกจรายเดือนและวางแผนรวมรอบการเดินทางเพื่อลดค่าใช้จ่ายแฝง',
      })),
      recommendedDailyLimit: Number(
        Math.max(150, (overallBudget - totalSpent) / 10).toFixed(2)
      ),
      encouragement:
        'วินัยทางการเงินของคุณอยู่ในเกณฑ์ดีมาก! รักษาระดับการใช้จ่ายตาม Daily Safe-to-Spend ต่อไปนะครับ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถวิเคราะห์งบประมาณได้' },
      { status: 500 }
    );
  }
}
