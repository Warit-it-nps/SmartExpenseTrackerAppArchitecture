import { NextResponse } from 'next/server.js';
import { getBangkokDateString } from '../../../lib/utils/timezone.ts';
import { executeCreateTransactionAtomic, readLocalDB } from '../../../lib/store.ts';
import crypto from 'crypto';

function verifyMcpKey(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const rawKey = authHeader.replace('Bearer ', '').trim();
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const db = readLocalDB();
  return db.api_keys.some((k) => k.key_hash === keyHash && k.is_active);
}

export async function POST(request: Request) {
  if (!verifyMcpKey(request)) {
    return NextResponse.json({ error: 'Unauthorized MCP Key' }, { status: 401 });
  }

  const rpc = await request.json();
  const db = readLocalDB();

  if (rpc.method === 'tools/list') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpc.id,
      result: {
        tools: [
          {
            name: 'get_accounts_balance',
            description: 'ดึงยอดเงินคงเหลือของทุกบัญชีของผู้ใช้',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'record_transaction',
            description: 'บันทึกรายรับหรือรายจ่ายใหม่พร้อมอัปเดตยอดบัญชีอัตโนมัติ (Atomic)',
            inputSchema: {
              type: 'object',
              required: ['type', 'amount'],
              properties: {
                accountId: { type: 'string' },
                categoryId: { type: 'string' },
                type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                amount: { type: 'number' },
                note: { type: 'string' },
              },
            },
          },
        ],
      },
    });
  }

  if (rpc.method === 'tools/call') {
    const { name, arguments: args } = rpc.params;

    if (name === 'get_accounts_balance') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: rpc.id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(db.accounts, null, 2) }],
        },
      });
    }

    if (name === 'record_transaction') {
      try {
        const tx = await executeCreateTransactionAtomic({
          accountId: args.accountId || db.accounts[0]?.id,
          toAccountId: null,
          categoryId: args.categoryId || db.categories[0]?.id,
          type: args.type || 'EXPENSE',
          amount: Number(args.amount),
          transactionDate: getBangkokDateString(),
          note: args.note ?? 'บันทึกผ่าน MCP Agent',
          slipStoragePath: null,
          idempotencyKey: crypto.randomUUID(),
          source: 'MCP',
        });

        return NextResponse.json({
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            content: [{ type: 'text', text: `บันทึกสำเร็จ: ${JSON.stringify(tx)}` }],
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: rpc.id,
          error: { code: -32000, message: err.message },
        });
      }
    }
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id: rpc.id ?? null,
    error: { code: -32601, message: 'Method not found' },
  });
}
