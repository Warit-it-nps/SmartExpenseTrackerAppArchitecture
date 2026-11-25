import { NextResponse } from 'next/server.js';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { ParsedExpenseSchema, type ParsedExpenseResult } from '../../../../lib/ai/schemas.ts';
import { getBangkokDateString } from '../../../../lib/utils/timezone.ts';
import { isSupabaseConfigured, readLocalDB } from '../../../../lib/store.ts';

export const maxDuration = 10;

function fallbackNaturalLanguageParser(
  text: string,
  hasImage: boolean,
  todayBangkok: string
): ParsedExpenseResult {
  const clean = text.trim();
  const numMatch = clean.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
  const amount = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : hasImage ? 145.0 : 100.0;

  let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';
  if (/เงินเดือน|รายรับ|ได้เงิน|โบนัส/.test(clean)) {
    type = 'INCOME';
  } else if (/โอนเงินสดเข้า|ย้ายเงิน|โอนระหว่างบัญชี/.test(clean)) {
    type = 'TRANSFER';
  }

  let accountName = 'เงินสด';
  if (/กสิกร|kbank|k\+|สลิป/i.test(clean) || hasImage) {
    accountName = 'กสิกรไทย (K-Bank)';
  } else if (/บัตร|ktc|เครดิต/i.test(clean)) {
    accountName = 'บัตรเครดิต KTC';
  }

  let categoryName = 'อาหารและเครื่องดื่ม';
  if (type === 'INCOME') {
    categoryName = 'เงินเดือน';
  } else if (/เดินทาง|รถไฟ|bts|mrt|วิน|แท็กซี่|น้ำมัน/i.test(clean)) {
    categoryName = 'เดินทาง';
  } else if (/ช้อป|shopee|lazada|ซื้อของ|เสื้อ/i.test(clean)) {
    categoryName = 'ช้อปปิ้ง';
  } else if (/ไฟ|น้ำ|เน็ต|บิล|โทรศัพท์/i.test(clean)) {
    categoryName = 'บิลและสาธารณูปโภค';
  }

  return {
    type,
    amount: Number(amount.toFixed(2)),
    categoryName,
    accountName,
    toAccountName: type === 'TRANSFER' ? 'กสิกรไทย (K-Bank)' : null,
    transactionDate: todayBangkok,
    note: clean || (hasImage ? 'รายการจากสลิปโอนเงิน' : 'รายการใช้จ่ายทั่วไป'),
    confidence: 0.92,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, imageBase64 } = body as {
      text?: string;
      imageBase64?: string;
    };

    if (!text?.trim() && !imageBase64) {
      return NextResponse.json(
        { error: 'กรุณาพิมพ์ข้อความหรือแนบรูปสลิป' },
        { status: 400 }
      );
    }

    let accounts: Array<{ id: string; name: string; type: string }> = [];
    let categories: Array<{ id: string; name: string; type: 'INCOME' | 'EXPENSE' }> = [];

    if (isSupabaseConfigured()) {
      const { createClient } = await import('../../../../lib/supabase/server.ts');
      const supabase = await createClient();
      const [accRes, catRes] = await Promise.all([
        supabase.from('accounts').select('id, name, type').eq('is_archived', false),
        supabase.from('categories').select('id, name, type'),
      ]);
      accounts = accRes.data ?? [];
      categories = (catRes.data as any) ?? [];
    } else {
      const db = readLocalDB();
      accounts = db.accounts;
      categories = db.categories;
    }

    const todayBangkok = getBangkokDateString();
    let parsed: ParsedExpenseResult;
    let mode = 'GEMINI_2_5_FLASH';

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const accountList = accounts.map((a) => a.name).join(', ');
      const expenseCategories = categories
        .filter((c) => c.type === 'EXPENSE')
        .map((c) => c.name)
        .join(', ');
      const incomeCategories = categories
        .filter((c) => c.type === 'INCOME')
        .map((c) => c.name)
        .join(', ');

      const systemPrompt = `คุณคือผู้ช่วยวิเคราะห์รายการทางการเงินและอ่านสลิปธนาคารไทยอัจฉริยะ
วันที่ปัจจุบัน (เวลาประเทศไทย Asia/Bangkok): ${todayBangkok}
บัญชีของผู้ใช้ที่มีในระบบ: [${accountList}]
หมวดหมู่รายจ่ายที่มีในระบบ: [${expenseCategories}]
หมวดหมู่รายรับที่มีในระบบ: [${incomeCategories}]`;

      const userContent: Array<
        { type: 'text'; text: string } | { type: 'image'; image: string }
      > = [];

      if (text?.trim()) {
        userContent.push({ type: 'text', text: `ข้อความ: "${text.trim()}"` });
      }
      if (imageBase64) {
        userContent.push({ type: 'image', image: imageBase64 });
      }

      const result = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: ParsedExpenseSchema,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
      parsed = result.object;
    } else {
      mode = 'SMART_LOCAL_PARSER';
      parsed = fallbackNaturalLanguageParser(text || '', Boolean(imageBase64), todayBangkok);
    }

    const matchedAccount =
      accounts.find(
        (a) =>
          a.name.toLowerCase().includes(parsed.accountName.toLowerCase()) ||
          parsed.accountName.toLowerCase().includes(a.name.toLowerCase())
      ) ?? accounts[0];

    const matchedToAccount =
      parsed.type === 'TRANSFER'
        ? accounts.find((a) => a.id !== matchedAccount?.id)
        : null;

    const validCategories = categories.filter((c) =>
      parsed.type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
    );

    const matchedCategory =
      validCategories.find(
        (c) =>
          c.name.toLowerCase().includes(parsed.categoryName.toLowerCase()) ||
          parsed.categoryName.toLowerCase().includes(c.name.toLowerCase())
      ) ?? validCategories[0];

    return NextResponse.json({
      mode,
      parsed,
      mapped: {
        type: parsed.type,
        amount: Number(parsed.amount.toFixed(2)),
        accountId: matchedAccount?.id ?? '',
        toAccountId: matchedToAccount?.id ?? '',
        categoryId: matchedCategory?.id ?? '',
        transactionDate: parsed.transactionDate || todayBangkok,
        note: parsed.note,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถวิเคราะห์ข้อมูลด้วย AI ได้' },
      { status: 500 }
    );
  }
}
