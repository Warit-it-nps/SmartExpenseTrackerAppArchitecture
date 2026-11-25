'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/transactions', label: 'รายการ', icon: ArrowLeftRight },
  { href: '/accounts', label: 'บัญชี', icon: Wallet },
  { href: '/budgets', label: 'งบประมาณ', icon: PieChart },
  { href: '/coach', label: 'AI Coach', icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
      <div className="grid grid-cols-5 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
