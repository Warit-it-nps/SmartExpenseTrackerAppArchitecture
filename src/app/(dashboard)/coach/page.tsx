'use client';

import { useState } from 'react';
import { Sparkles, Loader2, TrendingDown, CheckCircle2 } from 'lucide-react';
import { formatTHB } from '@/lib/utils/timezone';

export default function AIBudgetCoachPage() {
  const [advice, setAdvice] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/budget-coach', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdvice(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase">
            <Sparkles className="h-4 w-4" />
            <span>Gemini 2.5 Flash Financial Advisor</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">AI Budget Coach</h1>
          <p className="text-xs text-slate-300 mt-1">
            วิเคราะห์พฤติกรรมการใช้จ่ายจริงในเดือนนี้และค้นหาจุดที่ช่วยประหยัดเงินได้
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังวิเคราะห์ข้อมูลเดือนนี้...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              เริ่มวิเคราะห์พฤติกรรมการใช้จ่าย
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      {advice && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs text-slate-500">คะแนนสุขภาพการเงิน</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                {advice.healthScore} / 100
              </p>
            </div>
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center">
              <span className="text-xs text-slate-500">สรุปภาพรวมจาก AI</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {advice.headline}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                งบต่อวันที่แนะนำหลังจากนี้: {formatTHB(advice.recommendedDailyLimit)} / วัน
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              จุดที่ควรลดค่าใช้จ่าย (Actionable Insights)
            </h2>
            {advice.riskCategories.map((item: any, idx: number) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    {item.categoryName}
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {formatTHB(item.spentAmount)}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{item.issue}</p>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>คำแนะนำ:</strong> {item.actionableTip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
