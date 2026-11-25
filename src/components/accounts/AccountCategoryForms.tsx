'use client';

import { useState, useTransition } from 'react';
import { createAccountAction, createCategoryAction } from '@/actions/account.actions';
import { Loader2 } from 'lucide-react';

export function AccountCategoryForms() {
  const [accError, setAccError] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [accSuccess, setAccSuccess] = useState(false);
  const [catSuccess, setCatSuccess] = useState(false);
  const [isAccPending, startAccTransition] = useTransition();
  const [isCatPending, startCatTransition] = useTransition();

  const handleAccountSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setAccError(null);
    setAccSuccess(false);

    startAccTransition(async () => {
      const res = await createAccountAction(formData);
      if (res?.error) {
        setAccError(res.error);
      } else {
        setAccSuccess(true);
        form.reset();
      }
    });
  };

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setCatError(null);
    setCatSuccess(false);

    startCatTransition(async () => {
      const res = await createCategoryAction(formData);
      if (res?.error) {
        setCatError(res.error);
      } else {
        setCatSuccess(true);
        form.reset();
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <form
        onSubmit={handleAccountSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-800">เพิ่มบัญชีใหม่</h2>
        {accError && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
            {accError}
          </div>
        )}
        {accSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
            สร้างบัญชีสำเร็จ!
          </div>
        )}
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
          disabled={isAccPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {isAccPending && <Loader2 className="h-4 w-4 animate-spin" />}
          + สร้างบัญชี
        </button>
      </form>

      <form
        onSubmit={handleCategorySubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-800">เพิ่มหมวดหมู่ใหม่</h2>
        {catError && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
            {catError}
          </div>
        )}
        {catSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
            สร้างหมวดหมู่สำเร็จ!
          </div>
        )}
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
          disabled={isCatPending}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {isCatPending && <Loader2 className="h-4 w-4 animate-spin" />}
          + สร้างหมวดหมู่
        </button>
      </form>
    </div>
  );
}
