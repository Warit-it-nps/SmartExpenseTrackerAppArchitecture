'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import { isSupabaseConfigured, readLocalDB, writeLocalDB } from '@/lib/store';
import { createClient } from '@/lib/supabase/server';

const AccountSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อบัญชี'),
  type: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'EWALLET']),
  initial_balance: z.coerce.number().min(-9999999999).max(9999999999),
  color: z.string().default('#10b981'),
});

const CategorySchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อหมวดหมู่'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().default('#6366f1'),
});

export async function createAccountAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = AccountSchema.parse({
      name: formData.get('name'),
      type: formData.get('type'),
      initial_balance: formData.get('initial_balance') || 0,
      color: formData.get('color') || '#10b981',
    });

    const balanceFixed = Number(parsed.initial_balance.toFixed(2));

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อนสร้างบัญชี' };

      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: parsed.name,
        type: parsed.type,
        initial_balance: balanceFixed,
        current_balance: balanceFixed,
        color: parsed.color,
      });
      if (error) return { error: `Supabase Error (${error.code}): ${error.message}` };
    } else {
      const db = readLocalDB();
      db.accounts.push({
        id: crypto.randomUUID(),
        user_id: '00000000-0000-0000-0000-000000000001',
        name: parsed.name,
        type: parsed.type,
        initial_balance: balanceFixed,
        current_balance: balanceFixed,
        color: parsed.color,
        icon: 'wallet',
        is_archived: false,
      });
      writeLocalDB(db);
    }

    revalidatePath('/accounts');
    revalidatePath('/transactions');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'ไม่สามารถสร้างบัญชีได้' };
  }
}

export async function createCategoryAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = CategorySchema.parse({
      name: formData.get('name'),
      type: formData.get('type'),
      color: formData.get('color') || '#6366f1',
    });

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อนสร้างหมวดหมู่' };

      const { error } = await supabase.from('categories').insert({
        user_id: user.id,
        name: parsed.name,
        type: parsed.type,
        color: parsed.color,
      });
      if (error) return { error: `Supabase Error (${error.code}): ${error.message}` };
    } else {
      const db = readLocalDB();
      db.categories.push({
        id: crypto.randomUUID(),
        user_id: '00000000-0000-0000-0000-000000000001',
        name: parsed.name,
        type: parsed.type,
        color: parsed.color,
        icon: 'tag',
        is_default: false,
      });
      writeLocalDB(db);
    }

    revalidatePath('/accounts');
    revalidatePath('/transactions');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'ไม่สามารถสร้างหมวดหมู่ได้' };
  }
}
