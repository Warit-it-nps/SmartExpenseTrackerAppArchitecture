'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatTHB } from '@/lib/utils/timezone';

export interface CategoryBreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface DailyTrendItem {
  day: string;
  income: number;
  expense: number;
}

interface ExpenseChartsProps {
  categoryBreakdown: CategoryBreakdownItem[];
  dailyTrend: DailyTrendItem[];
}

export function ExpenseCharts({ categoryBreakdown, dailyTrend }: ExpenseChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          สัดส่วนรายจ่ายตามหมวดหมู่ (เดือนนี้)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          วิเคราะห์หมวดหมู่ที่ใช้จ่ายสูงสุด
        </p>

        {categoryBreakdown.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            ยังไม่มีข้อมูลรายจ่ายในเดือนนี้
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {categoryBreakdown.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatTHB(Number(value))}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          แนวโน้มรายรับ - รายจ่ายรายวัน
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          เปรียบเทียบกระแสเงินสดรายวันในเดือนปัจจุบัน
        </p>

        {dailyTrend.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            ยังไม่มีรายการในเดือนนี้
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => formatTHB(Number(value))}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="income" name="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
