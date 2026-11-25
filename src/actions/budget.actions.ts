'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getBangkokMonthYear } from '@/lib/utils/timezone';
import { isSupabaseConfigured, readLocalDB, writeLocalDB } from '@/lib/store';
import { z } from 'zod';
import crypto from 'crypto';

const UpsertBudgetSchema = z.object({
  categoryId: z.string().nullable(),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/),
  amountLimit: z.coerce.number().positive('วงเงินงบประมาณต้องมากกว่า 0'),
  alertThreshold: z.coerce.number().min(10).max(100).default(80),
});

export async function upsertBudgetAction(formData: FormData) {
  const rawCategoryId = formData.get('categoryId') as string;
  const parsed = UpsertBudgetSchema.parse({
    categoryId: rawCategoryId === 'OVERALL' || !rawCategoryId ? null : rawCategoryId,
    monthYear: formData.get('monthYear') || getBangkokMonthYear(),
    amountLimit: formData.get('amountLimit'),
    alertThreshold: formData.get('alertThreshold') || 80,
  });

  const limitFixed = Number(parsed.amountLimit.toFixed(2));

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase.from('budgets').upsert(
      {
        user_id: user.id,
        category_id: parsed.categoryId,
        month_year: parsed.monthYear,
        amount_limit: limitFixed,
        alert_threshold: parsed.alertThreshold,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,category_id,month_year' }
    );
    if (error) throw new Error(error.message);
  } else {
    const db = readLocalDB();
    const existingIdx = db.budgets.findIndex(
      (b) =>
        b.category_id === parsed.categoryId && b.month_year === parsed.monthYear
    );
    if (existingIdx >= 0) {
      db.budgets[existingIdx].amount_limit = limitFixed;
      db.budgets[existingIdx].alert_threshold = parsed.alertThreshold;
    } else {
      db.budgets.push({
        id: crypto.randomUUID(),
        user_id: '00000000-0000-0000-0000-000000000001',
        category_id: parsed.categoryId,
        month_year: parsed.monthYear,
        amount_limit: limitFixed,
        alert_threshold: parsed.alertThreshold,
      });
    }
    writeLocalDB(db);
  }

  revalidatePath('/budgets');
  revalidatePath('/');
}
