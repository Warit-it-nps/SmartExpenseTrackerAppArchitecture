'use client';

import { useState, useRef } from 'react';
import { Sparkles, ImagePlus, Loader2, X, ShieldCheck } from 'lucide-react';
import { compressSlipImage, CompressedImageResult } from '@/lib/utils/image-compression';
import {
  TransactionForm,
  AccountOption,
  CategoryOption,
} from '@/components/transactions/TransactionForm';

interface QuickAddAIBarProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
}

export function QuickAddAIBar({ accounts, categories }: QuickAddAIBarProps) {
  const [promptText, setPromptText] = useState('');
  const [compressedSlip, setCompressedSlip] = useState<CompressedImageResult | null>(null);
  const [slipFileName, setSlipFileName] = useState<string | null>(null);
  const [keepSlipInStorage, setKeepSlipInStorage] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [verifiedDraft, setVerifiedDraft] = useState<{
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount: number;
    accountId: string;
    toAccountId?: string;
    categoryId: string;
    transactionDate: string;
    note: string;
    slipStoragePath?: string | null;
    mode?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    try {
      const compressed = await compressSlipImage(file, 1024, 0.8);
      setCompressedSlip(compressed);
      setSlipFileName(file.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถบีบอัดรูปสลิปได้');
    }
  };

  const clearSlip = () => {
    setCompressedSlip(null);
    setSlipFileName(null);
    setKeepSlipInStorage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() && !compressedSlip) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: promptText,
          imageBase64: compressedSlip?.base64DataUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล');
      }

      setVerifiedDraft({
        ...data.mapped,
        slipStoragePath: keepSlipInStorage && slipFileName ? `private/slips/${Date.now()}-${slipFileName}` : null,
        mode: data.mode,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อ AI ได้');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmSuccess = () => {
    setVerifiedDraft(null);
    setPromptText('');
    clearSlip();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              AI Quick Entry (Gemini 2.5 Flash)
            </span>
          </div>
          <span className="text-[11px] text-slate-300">
            พิมพ์ภาษาธรรมชาติ หรือ แนบสลิปโอนเงิน (ย่อรูป &le; 1024px อัตโนมัติ)
          </span>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder='ลองพิมพ์ เช่น "กาแฟ 85 บาท โอนกสิกร" หรือ "โอนเงินสดเข้ากสิกร 500"'
                className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium transition cursor-pointer"
              >
                <ImagePlus className="h-4 w-4 text-emerald-300" />
                <span>แนบสลิป</span>
              </button>

              <button
                type="submit"
                disabled={isAnalyzing || (!promptText.trim() && !compressedSlip)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังวิเคราะห์...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>ให้ AI สกัดข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {compressedSlip && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="flex items-center gap-2.5">
                <img
                  src={compressedSlip.base64DataUrl}
                  alt="Slip preview"
                  className="h-10 w-10 rounded-lg object-cover border border-white/20"
                />
                <div>
                  <p className="text-xs font-medium text-white truncate max-w-[200px]">
                    {slipFileName}
                  </p>
                  <p className="text-[11px] text-emerald-300">
                    บีบอัดแล้ว ({compressedSlip.width}x{compressedSlip.height}px,{' '}
                    {Math.round(compressedSlip.blob.size / 1024)} KB)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepSlipInStorage}
                    onChange={(e) => setKeepSlipInStorage(e.target.checked)}
                    className="rounded border-white/30 text-emerald-500 focus:ring-emerald-400"
                  />
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>เก็บสลิปใน Private Bucket (ไม่เลือก = ลบทิ้งหลังวิเคราะห์)</span>
                </label>

                <button
                  type="button"
                  onClick={clearSlip}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-300 bg-red-950/50 border border-red-800/60 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </form>
      </div>

      {verifiedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ตรวจสอบรายการจาก AI ก่อนบันทึก (Human-in-the-loop)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ตรวจสอบความถูกต้องก่อนยืนยันลงฐานข้อมูล ({verifiedDraft.mode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifiedDraft(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <TransactionForm
              accounts={accounts}
              categories={categories}
              initialValues={{
                ...verifiedDraft,
                source: 'AI_QUICK',
              }}
              onSuccess={handleConfirmSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
