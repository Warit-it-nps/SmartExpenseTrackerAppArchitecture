'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Sparkles, KeyRound } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/transactions', label: 'รายการเดินบัญชี', icon: ArrowLeftRight },
  { href: '/accounts', label: 'บัญชีและหมวดหมู่', icon: Wallet },
  { href: '/budgets', label: 'ตั้งงบประมาณ', icon: PieChart },
  { href: '/coach', label: 'AI Budget Coach', icon: Sparkles },
  { href: '/settings/api-keys', label: 'API & MCP Keys', icon: KeyRound },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200">
      <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-100">
        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
          ฿
        </div>
        <div>
          <span className="font-bold text-slate-900 block leading-tight">Smart Expense</span>
          <span className="text-[11px] text-emerald-600 font-medium">AI Budget Planner</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 text-xs text-slate-400">
        Timezone: Asia/Bangkok (UTC+7)
      </div>
    </aside>
  );
}
