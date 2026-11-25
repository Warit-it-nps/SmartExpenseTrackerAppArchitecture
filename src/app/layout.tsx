import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Expense Tracker & AI Budget Planner',
  description: 'ระบบติดตามรายรับ-รายจ่ายและวางแผนการเงินอัจฉริยะด้วย Gemini 2.5 Flash',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
