import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { isSupabaseConfigured } from '@/lib/store';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLiveSupabase = isSupabaseConfigured();

  if (isLiveSupabase) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="md:pl-64 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          {!isLiveSupabase && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Sandbox / Local Testing Mode:</strong> ข้อมูลถูกบันทึกแบบ Atomic ลงไฟล์จำลอง (`.local-demo-db.json`) เพื่อให้ทดสอบทุกฟีเจอร์ได้ทันทีโดยไม่ต้องต่อ Supabase
              </span>
              <span className="font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded">
                NUMERIC(12,2) • Asia/Bangkok
              </span>
            </div>
          )}
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
