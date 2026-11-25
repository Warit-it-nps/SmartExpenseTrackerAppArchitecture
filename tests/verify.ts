import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getBangkokDateString, getBangkokMonthYear, formatTHB } from '../src/lib/utils/timezone.ts';
import { calculateSafeToSpend } from '../src/lib/utils/budget-calculator.ts';
import { ParsedExpenseSchema } from '../src/lib/ai/schemas.ts';
import {
  readLocalDB,
  executeCreateTransactionAtomic,
  executeDeleteTransactionAtomic,
} from '../src/lib/store.ts';

async function runTests() {
  console.log('=== เริ่มต้นทดสอบระบบ Smart Expense Tracker & AI Budget Planner ===\n');

  // 0. Reset fresh DB for clean deterministic tests
  const dbPath = path.join(process.cwd(), '.local-demo-db.json');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  // 1. ทดสอบ Timezone Asia/Bangkok (UTC+7)
  // สมมติเวลา UTC คือ 2026-11-24T20:30:00Z -> เวลาไทยต้องเป็นวันที่ 2026-11-25 (03:30 น.)
  const lateNightUtc = new Date('2026-11-24T20:30:00.000Z');
  const thaiDate = getBangkokDateString(lateNightUtc);
  const thaiMonth = getBangkokMonthYear(lateNightUtc);
  assert.equal(thaiDate, '2026-11-25', 'Timezone UTC+7 ต้องปัดเป็นวันที่ 2026-11-25');
  assert.equal(thaiMonth, '2026-11', 'MonthYear ต้องเป็น 2026-11');
  console.log('✅ [Test 1] Timezone Asia/Bangkok (UTC+7) ถูกต้อง:', {
    utc: lateNightUtc.toISOString(),
    bangkokDate: thaiDate,
    formattedTHB: formatTHB(1250.5),
  });

  // 2. ทดสอบการคำนวณ Daily Safe-to-Spend
  // วันที่ 25 พ.ย. 2026 (เดือน พ.ย. มี 30 วัน -> เหลือ 6 วันรวมวันนี้: 25,26,27,28,29,30)
  // งบทั้งเดือน 15,000 บาท, ใช้สะสมทั้งเดือน (รวมวันนี้) = 3,300 บาท, โดยเป็นยอดใช้จ่ายวันนี้ = 300 บาท
  // ต้นวันนี้มีงบเหลือ = 15,000 - (3,300 - 300) = 12,000 บาท
  // โควต้าต่อวัน = 12,000 / 6 วัน = 2,000 บาท/วัน
  // วันนี้ใช้ไปแล้ว 300 -> วันนี้ใช้ได้อีก (Safe-to-Spend Remaining Today) = 1,700 บาท
  const safe = calculateSafeToSpend(15000, 3300, 300, lateNightUtc);
  assert.equal(safe.remainingDays, 6);
  assert.equal(safe.dailyQuotaForToday, 2000.0);
  assert.equal(safe.safeToSpendRemainingToday, 1700.0);
  assert.equal(safe.isOverBudgetToday, false);
  console.log('✅ [Test 2] Daily Safe-to-Spend คำนวณถูกต้อง:', safe);

  // 3. ทดสอบ Atomic Transaction + Idempotency Key (ป้องกันการกดเบิ้ล) + การคืนยอดเงินเมื่อลบ
  const initialDb = readLocalDB();
  const kbankBefore = initialDb.accounts.find((a) => a.name.includes('กสิกร'))!;
  const cashBefore = initialDb.accounts.find((a) => a.name === 'เงินสด')!;
  const foodCat = initialDb.categories.find((c) => c.name.includes('อาหาร'))!;

  const idempKey = 'test-double-submit-key-001';

  // ยิงบันทึกจ่ายค่ากาแฟ 85.50 บาท ครั้งที่ 1
  const tx1 = await executeCreateTransactionAtomic({
    accountId: kbankBefore.id,
    categoryId: foodCat.id,
    type: 'EXPENSE',
    amount: 85.5,
    transactionDate: thaiDate,
    note: 'กาแฟ 85.50 บาท โอนกสิกร',
    idempotencyKey: idempKey,
    source: 'AI_QUICK',
  });

  // ยิงซ้ำด้วย Idempotency Key เดิม (จำลองผู้ใช้กดปุ่มเบิ้ล 2 ครั้งติด)
  const txDuplicate = await executeCreateTransactionAtomic({
    accountId: kbankBefore.id,
    categoryId: foodCat.id,
    type: 'EXPENSE',
    amount: 85.5,
    transactionDate: thaiDate,
    note: 'กาแฟ 85.50 บาท โอนกสิกร',
    idempotencyKey: idempKey,
    source: 'AI_QUICK',
  });

  assert.equal(tx1.id, txDuplicate.id, 'Idempotency Key ต้องคืนรายการเดิมและไม่ตัดเงินซ้ำ');

  const dbAfterExpense = readLocalDB();
  const kbankAfterExpense = dbAfterExpense.accounts.find((a) => a.id === kbankBefore.id)!;
  assert.equal(
    kbankAfterExpense.current_balance,
    Number((kbankBefore.current_balance - 85.5).toFixed(2)),
    'ยอดเงินในบัญชีกสิกรต้องลดลง 85.50 บาทครั้งเดียวเท่านั้น'
  );
  console.log('✅ [Test 3.1] Atomic Expense & Double-Submit Protection ทำงานถูกต้อง:', {
    balanceBefore: kbankBefore.current_balance,
    balanceAfterSingleDeduction: kbankAfterExpense.current_balance,
  });

  // ทดสอบ TRANSFER (โอนเงินจากกสิกรเข้าเงินสด 500 บาท)
  const transferTx = await executeCreateTransactionAtomic({
    accountId: kbankBefore.id,
    toAccountId: cashBefore.id,
    type: 'TRANSFER',
    amount: 500,
    transactionDate: thaiDate,
    note: 'กดเงินสดจากตู้กสิกร',
    idempotencyKey: 'test-transfer-key-002',
    source: 'WEB',
  });

  const dbAfterTransfer = readLocalDB();
  const kbankAfterTransfer = dbAfterTransfer.accounts.find((a) => a.id === kbankBefore.id)!;
  const cashAfterTransfer = dbAfterTransfer.accounts.find((a) => a.id === cashBefore.id)!;

  assert.equal(
    kbankAfterTransfer.current_balance,
    Number((kbankAfterExpense.current_balance - 500).toFixed(2))
  );
  assert.equal(
    cashAfterTransfer.current_balance,
    Number((cashBefore.current_balance + 500).toFixed(2))
  );
  console.log('✅ [Test 3.2] Atomic Transfer ระหว่างบัญชีถูกต้อง:', {
    kbank: kbankAfterTransfer.current_balance,
    cash: cashAfterTransfer.current_balance,
  });

  // ทดสอบการลบรายการและคืนยอดเงินกลับเข้าบัญชีอัตโนมัติ
  await executeDeleteTransactionAtomic(transferTx.id);
  await executeDeleteTransactionAtomic(tx1.id);

  const dbAfterRevert = readLocalDB();
  const kbankRestored = dbAfterRevert.accounts.find((a) => a.id === kbankBefore.id)!;
  const cashRestored = dbAfterRevert.accounts.find((a) => a.id === cashBefore.id)!;
  assert.equal(kbankRestored.current_balance, kbankBefore.current_balance);
  assert.equal(cashRestored.current_balance, cashBefore.current_balance);
  console.log('✅ [Test 3.3] Atomic Delete & Balance Revert คืนยอดเงินเดิมครบ 100%');

  // 4. ทดสอบ Zod Schema สำหรับ AI Quick Entry
  const sampleAiOutput = {
    type: 'EXPENSE',
    amount: 85,
    categoryName: 'อาหารและเครื่องดื่ม',
    accountName: 'กสิกรไทย (K-Bank)',
    toAccountName: null,
    transactionDate: '2026-11-25',
    note: 'กาแฟ 85 บาท โอนกสิกร',
    confidence: 0.95,
  };
  const validated = ParsedExpenseSchema.parse(sampleAiOutput);
  assert.equal(validated.amount, 85);
  console.log('✅ [Test 4] Zod Schema Validation สำหรับ Gemini 2.5 Flash ผ่านสมบูรณ์');

  console.log('\n🎉 การทดสอบ Unit & Integration Tests ทั้งหมดผ่าน 100%!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
