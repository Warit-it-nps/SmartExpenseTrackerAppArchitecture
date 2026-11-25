import { createAccountAction, createCategoryAction } from '@/actions/account.actions';
import { formatTHB } from '@/lib/utils/timezone';
import { loadAppState } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const db = await loadAppState();
  const accounts = db.accounts.filter((a) => !a.is_archived);
  const categories = db.categories;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">บัญชีและหมวดหมู่</h1>
        <p className="text-sm text-slate-500">
          จัดการกระเป๋าเงิน บัญชีธนาคาร บัตรเครดิต และหมวดหมู่การใช้จ่าย
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                {acc.type}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">{acc.name}</h3>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-4">
              {formatTHB(acc.current_balance)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form
          action={createAccountAction}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-800">เพิ่มบัญชีใหม่</h2>
          <input
            name="name"
            required
            placeholder="ชื่อบัญชี (เช่น กรุงไทย, TrueMoney)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="type"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="CASH">เงินสด (CASH)</option>
              <option value="BANK">ธนาคาร (BANK)</option>
              <option value="CREDIT_CARD">บัตรเครดิต</option>
              <option value="EWALLET">E-Wallet</option>
            </select>
            <input
              name="initial_balance"
              type="number"
              step="0.01"
              defaultValue="0"
              placeholder="ยอดเงินเริ่มต้น"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm cursor-pointer"
          >
            + สร้างบัญชี
          </button>
        </form>

        <form
          action={createCategoryAction}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-800">เพิ่มหมวดหมู่ใหม่</h2>
          <input
            name="name"
            required
            placeholder="ชื่อหมวดหมู่ (เช่น สัตว์เลี้ยง, สุขภาพ)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="type"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="EXPENSE">หมวดหมู่รายจ่าย (EXPENSE)</option>
            <option value="INCOME">หมวดหมู่รายรับ (INCOME)</option>
          </select>
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg text-sm cursor-pointer"
          >
            + สร้างหมวดหมู่
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          หมวดหมู่ทั้งหมด ({categories.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              {c.name} ({c.type})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
