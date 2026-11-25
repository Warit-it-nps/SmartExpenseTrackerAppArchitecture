import { formatTHB } from '@/lib/utils/timezone';
import { loadAppState } from '@/lib/store';
import { AccountCategoryForms } from '@/components/accounts/AccountCategoryForms';

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

      {accounts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs">
          ยังไม่มีบัญชีในระบบ กรุณาเพิ่มบัญชีแรกของคุณด้านล่าง (หรือตรวจสอบการรันคำสั่ง GRANT สิทธิ์ใน Supabase SQL Editor)
        </div>
      ) : (
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
      )}

      <AccountCategoryForms />

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
