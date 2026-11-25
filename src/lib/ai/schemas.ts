import { z } from 'zod';

export const ParsedExpenseSchema = z.object({
  type: z
    .enum(['INCOME', 'EXPENSE', 'TRANSFER'])
    .describe('ประเภทรายการ: EXPENSE (รายจ่าย/สลิปจ่ายเงิน), INCOME (รายรับ), TRANSFER (โอนย้ายระหว่างบัญชีตัวเอง)'),
  amount: z
    .number()
    .positive()
    .describe('จำนวนเงินเป็นตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 85 หรือ 1250.50'),
  categoryName: z
    .string()
    .describe('ชื่อหมวดหมู่ที่ตรงหรือใกล้เคียงที่สุดจากรายการหมวดหมู่ของผู้ใช้ที่กำหนดให้'),
  accountName: z
    .string()
    .describe('ชื่อบัญชีต้นทางที่ตรงหรือใกล้เคียงที่สุดจากรายการบัญชีของผู้ใช้ (เช่น เงินสด, กสิกรไทย)'),
  toAccountName: z
    .string()
    .nullable()
    .optional()
    .describe('ชื่อบัญชีปลายทาง (ระบุเฉพาะกรณี type เป็น TRANSFER เท่านั้น)'),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('วันที่ทำรายการในรูปแบบ YYYY-MM-DD (ยึดตามเวลาประเทศไทย Asia/Bangkok และแปลง พ.ศ. เป็น ค.ศ. เสมอ)'),
  note: z
    .string()
    .describe('รายละเอียดสั้นๆ เช่น ชื่อร้านค้า รายการสินค้า หรือผู้รับโอนจากสลิป'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('ระดับความมั่นใจในการสกัดข้อมูล (0.0 - 1.0)'),
});

export type ParsedExpenseResult = z.infer<typeof ParsedExpenseSchema>;
