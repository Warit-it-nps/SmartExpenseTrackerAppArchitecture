'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getBangkokDateString } from '@/lib/utils/timezone';
import {
  executeCreateTransactionAtomic,
  executeDeleteTransactionAtomic,
} from '@/lib/store';

const TransactionInputSchema = z.object({
  accountId: z.string().min(1, 'กรุณาเลือกบัญชี'),
  toAccountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.coerce.number().positive('จำนวนเงินต้องมากกว่า 0'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
  slipStoragePath: z.string().nullable().optional(),
  idempotencyKey: z.string().min(4),
  source: z.enum(['WEB', 'AI_QUICK', 'API', 'MCP']).default('WEB'),
});

export type CreateTransactionInput = z.infer<typeof TransactionInputSchema>;

export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsed = TransactionInputSchema.parse({
      ...input,
      transactionDate: input.transactionDate || getBangkokDateString(),
    });

    await executeCreateTransactionAtomic(parsed);

    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/budgets');
    return { success: true };
  } catch (err: any) {
    return {
      error: err?.message || 'เกิดข้อผิดพลาดในการบันทึกรายการ',
    };
  }
}

export async function deleteTransactionAction(
  transactionId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await executeDeleteTransactionAtomic(transactionId);

    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/budgets');
    return { success: true };
  } catch (err: any) {
    return {
      error: err?.message || 'ไม่สามารถลบรายการได้',
    };
  }
}
