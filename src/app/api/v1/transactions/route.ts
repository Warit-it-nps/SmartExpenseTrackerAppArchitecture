import { NextResponse } from 'next/server.js';
import { getBangkokDateString, getBangkokMonthYear } from '../../../../lib/utils/timezone.ts';
import { executeCreateTransactionAtomic, readLocalDB } from '../../../../lib/store.ts';
import crypto from 'crypto';

function verifyDemoOrRealApiKey(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const rawKey = authHeader.replace('Bearer ', '').trim();
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const db = readLocalDB();
  return db.api_keys.some((k) => k.key_hash === keyHash && k.is_active);
}

export async function GET(request: Request) {
  if (!verifyDemoOrRealApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized API Key. Use Bearer sk_live_demo_smart_expense_2026' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || getBangkokMonthYear();
  const format = searchParams.get('format') || 'json';

  const db = readLocalDB();
  const transactions = db.transactions
    .filter((t) => t.transaction_date.startsWith(month))
    .map((t) => ({
      ...t,
      account_name: db.accounts.find((a) => a.id === t.account_id)?.name ?? '',
      category_name: db.categories.find((c) => c.id === t.category_id)?.name ?? '',
    }));

  if (format === 'csv') {
    const header = 'id,date,type,amount,account,category,note,source\n';
    const rows = transactions
      .map((t) =>
        [
          t.id,
          t.transaction_date,
          t.type,
          t.amount,
          `"${t.account_name}"`,
          `"${t.category_name}"`,
          `"${(t.note || '').replace(/"/g, '""')}"`,
          t.source,
        ].join(',')
      )
      .join('\n');

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions-${month}.csv"`,
      },
    });
  }

  return NextResponse.json({ month, count: transactions.length, transactions });
}

export async function POST(request: Request) {
  if (!verifyDemoOrRealApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized API Key. Use Bearer sk_live_demo_smart_expense_2026' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const db = readLocalDB();

    const tx = await executeCreateTransactionAtomic({
      accountId: body.accountId || db.accounts[0]?.id,
      toAccountId: body.toAccountId ?? null,
      categoryId: body.categoryId || db.categories[0]?.id,
      type: body.type ?? 'EXPENSE',
      amount: Number(body.amount),
      transactionDate: body.transactionDate || getBangkokDateString(),
      note: body.note ?? 'บันทึกผ่าน External REST API v1',
      slipStoragePath: null,
      idempotencyKey: body.idempotencyKey ?? crypto.randomUUID(),
      source: 'API',
    });

    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
