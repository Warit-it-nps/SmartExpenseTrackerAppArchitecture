import { KeyRound, Terminal } from 'lucide-react';

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          External REST API & MCP Server
        </h1>
        <p className="text-sm text-slate-500">
          เชื่อมต่อข้อมูลรายรับ-รายจ่ายกับ iOS Shortcuts, n8n หรือ AI Agent ผ่าน Model Context Protocol (MCP)
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <KeyRound className="h-4 w-4 text-emerald-600" />
          <span>Demo API Key (พร้อมใช้งานทันที)</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
          sk_live_demo_smart_expense_2026
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Terminal className="h-4 w-4 text-slate-700" />
          <span>ตัวอย่างการเรียกใช้งาน External API & MCP</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            1. ส่งออกข้อมูลรายเดือนเป็น CSV หรือ JSON (GET /api/v1/transactions)
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 text-xs overflow-x-auto">
{`curl -H "Authorization: Bearer sk_live_demo_smart_expense_2026" \\
  "http://localhost:3000/api/v1/transactions?format=csv"`}
          </pre>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            2. เรียกใช้งานผ่าน MCP JSON-RPC 2.0 (POST /api/mcp)
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 text-xs overflow-x-auto">
{`curl -X POST http://localhost:3000/api/mcp \\
  -H "Authorization: Bearer sk_live_demo_smart_expense_2026" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_accounts_balance","arguments":{}}}'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
