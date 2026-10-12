"use client";

import React, { memo, useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle, PackagePlus, Loader2 } from "lucide-react";
import { useKeyboardInset } from "./useKeyboardInset";
import { formatRp, isSoldOutProduct, type Notice, type Product, type StockPrompt } from "./utils";

/* ---------- Modal dasar (custom, pengganti alert/confirm browser) ---------- */

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { inset } = useKeyboardInset();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      // Saat keyboard HP terbuka, area modal berhenti di atas keyboard
      style={inset > 0 ? { bottom: inset } : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-sm max-h-full overflow-y-auto overscroll-contain bg-white rounded-3xl shadow-xl p-5 space-y-3.5">
        {children}
      </div>
    </div>
  );
}

/* ---------- Modal: stok tidak cukup + tambah stok (dipakai kartu produk & keranjang) ---------- */

function StockPromptModalBase({
  prompt,
  product,
  addQty,
  stockAfter,
  error,
  isSaving,
  onQtyChange,
  onSubmit,
  onClose,
}: {
  prompt: StockPrompt | null;
  product: Product | null;
  addQty: string;
  stockAfter: number;
  error: string;
  isSaving: boolean;
  onQtyChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={!!prompt && !!product} onClose={onClose}>
      {prompt && product && (
        <>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">
                {isSoldOutProduct(product) ? "Stok habis" : "Stok tidak cukup"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-700">{product.name}</span> hanya
                tersisa {product.stock ?? 0} {product.unit || "pcs"}, sedangkan kamu butuh{" "}
                {prompt.target}.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
              Tambah stok
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={addQty}
              onChange={(e) => onQtyChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800"
            />
            <p className="text-[11px] text-slate-400">
              Stok setelah ditambah:{" "}
              <span className="font-bold text-emerald-700">{stockAfter}</span>
            </p>
            {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Tutup
            </button>
            <button
              onClick={onSubmit}
              disabled={isSaving}
              className="flex-1 py-2.5 text-xs font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white flex items-center justify-center gap-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{prompt.increment ? "Simpan & Masukkan" : "Simpan Stok"}</span>
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- Modal: hasil transaksi (pengganti alert) ---------- */

function NoticeModalBase({
  notice,
  onClose,
}: {
  notice: Notice | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!notice} onClose={onClose}>
      {notice && (
        <>
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                notice.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : notice.type === "warning"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : notice.type === "warning" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">{notice.title}</h3>
              {notice.message && (
                <p className="text-xs text-slate-500 mt-0.5 break-words">{notice.message}</p>
              )}
            </div>
          </div>

          {notice.change !== undefined && (
            <div className="flex justify-between items-center px-3.5 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold">
              <span>Kembalian</span>
              <span className="text-base">{formatRp(notice.change)}</span>
            </div>
          )}

          <button
            onClick={onClose}
            autoFocus
            className="w-full py-2.5 text-xs font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            OK
          </button>
        </>
      )}
    </Modal>
  );
}

export const StockPromptModal = memo(StockPromptModalBase);
export const NoticeModal = memo(NoticeModalBase);