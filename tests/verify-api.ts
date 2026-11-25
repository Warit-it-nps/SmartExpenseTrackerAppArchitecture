import assert from 'node:assert/strict';
import { POST as parseExpenseRoute } from '../src/app/api/ai/parse-expense/route.ts';
import { POST as budgetCoachRoute } from '../src/app/api/ai/budget-coach/route.ts';
import {
  GET as getExternalTransactions,
  POST as postExternalTransaction,
} from '../src/app/api/v1/transactions/route.ts';
import { POST as mcpRoute } from '../src/app/api/mcp/route.ts';

async function testApiRoutes() {
  console.log('\n=== เริ่มต้นทดสอบ API Routes & MCP Server Endpoint ===\n');

  // 1. ทดสอบ POST /api/ai/parse-expense
  const aiParseReq = new Request('http://localhost:3000/api/ai/parse-expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'กาแฟ 85 บาท โอนกสิกร',
    }),
  });
  const aiParseRes = await parseExpenseRoute(aiParseReq);
  assert.equal(aiParseRes.status, 200);
  const aiParseJson = await aiParseRes.json();
  assert.equal(aiParseJson.mapped.type, 'EXPENSE');
  assert.equal(aiParseJson.mapped.amount, 85);
  console.log('✅ [API Test 1] POST /api/ai/parse-expense แปลงข้อความธรรมชาติเป็น Structured JSON:', aiParseJson.mapped);

  // 2. ทดสอบ POST /api/ai/budget-coach
  const coachRes = await budgetCoachRoute();
  assert.equal(coachRes.status, 200);
  const coachJson = await coachRes.json();
  assert.ok(coachJson.healthScore >= 0 && coachJson.healthScore <= 100);
  assert.ok(Array.isArray(coachJson.riskCategories));
  console.log('✅ [API Test 2] POST /api/ai/budget-coach วิเคราะห์พฤติกรรมการใช้จ่าย:', {
    healthScore: coachJson.healthScore,
    headline: coachJson.headline,
    recommendedDailyLimit: coachJson.recommendedDailyLimit,
  });

  // 3. ทดสอบ External REST API v1 (GET CSV & POST Ingest)
  const csvReq = new Request('http://localhost:3000/api/v1/transactions?format=csv', {
    method: 'GET',
    headers: { Authorization: 'Bearer sk_live_demo_smart_expense_2026' },
  });
  const csvRes = await getExternalTransactions(csvReq);
  assert.equal(csvRes.status, 200);
  const csvText = await csvRes.text();
  assert.ok(csvText.startsWith('id,date,type,amount,account,category,note,source'));
  console.log('✅ [API Test 3.1] GET /api/v1/transactions?format=csv ส่งออก CSV สำเร็จ (' + csvText.split('\n').length + ' บรรทัด)');

  const extPostReq = new Request('http://localhost:3000/api/v1/transactions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk_live_demo_smart_expense_2026',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'EXPENSE',
      amount: 60,
      note: 'ข้าวมันไก่ (จาก iOS Shortcut)',
      idempotencyKey: 'ext-api-test-001',
    }),
  });
  const extPostRes = await postExternalTransaction(extPostReq);
  assert.equal(extPostRes.status, 201);
  const extPostJson = await extPostRes.json();
  assert.equal(extPostJson.transaction.amount, 60);
  assert.equal(extPostJson.transaction.source, 'API');
  console.log('✅ [API Test 3.2] POST /api/v1/transactions รับข้อมูลจากภายนอกสำเร็จ:', {
    id: extPostJson.transaction.id,
    amount: extPostJson.transaction.amount,
    note: extPostJson.transaction.note,
  });

  // 4. ทดสอบ MCP JSON-RPC 2.0 Endpoint (tools/list & tools/call)
  const mcpListReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk_live_demo_smart_expense_2026',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }),
  });
  const mcpListRes = await mcpRoute(mcpListReq);
  const mcpListJson = await mcpListRes.json();
  assert.equal(mcpListJson.result.tools.length, 2);

  const mcpCallReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk_live_demo_smart_expense_2026',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_accounts_balance',
        arguments: {},
      },
    }),
  });
  const mcpCallRes = await mcpRoute(mcpCallReq);
  const mcpCallJson = await mcpCallRes.json();
  const balances = JSON.parse(mcpCallJson.result.content[0].text);
  assert.ok(Array.isArray(balances) && balances.length >= 3);
  console.log('✅ [API Test 4] POST /api/mcp (MCP Server JSON-RPC 2.0) ดึงยอดคงเหลือทุกบัญชีสำเร็จ:', balances.map((b: any) => `${b.name}: ฿${b.current_balance}`));

  console.log('\n🎉 การทดสอบ API Routes & MCP ทั้งหมดผ่าน 100%!');
}

testApiRoutes().catch((err) => {
  console.error('❌ API Test failed:', err);
  process.exit(1);
});
