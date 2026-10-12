"use client";

import React from "react";
import {
  ShoppingBag,
  QrCode,
  Bike,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  ChevronDown,
  ArrowLeft,
  Calculator,
  X,
} from "lucide-react";
import type { OrderStatus, OrderType } from "./utils";

/* ---------- Badge tipe pesanan ---------- */

const TYPE_META: Record<OrderType, { icon: React.ElementType; label: string; cls: string }> = {
  dine_in: { icon: QrCode, label: "Pesan Meja", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  delivery: { icon: Bike, label: "Pesan Antar", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pickup: { icon: ShoppingBag, label: "Pick Up", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  pos: { icon: Calculator, label: "Kasir (POS)", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

/**
 * iconOnly = hanya ikon (dipakai di kartu). Untuk pesan meja, nomor meja tetap ditampilkan
 * di samping ikon agar meja bisa dikenali tanpa membuka detail. Label lengkap ada di tooltip.
 */
export function TypeBadge({
  type,
  tableNumber,
  iconOnly = false,
}: {
  type: OrderType;
  tableNumber?: string | null;
  iconOnly?: boolean;
}) {
  const { icon: Icon, label, cls } = TYPE_META[type];
  const fullLabel = type === "dine_in" ? `Meja ${tableNumber || "-"}` : label;

  if (iconOnly) {
    return (
      <span
        title={fullLabel}
        aria-label={fullLabel}
        className={`inline-flex items-center justify-center gap-1 h-8 min-w-8 px-2 rounded-full border text-[11px] font-bold shrink-0 ${cls}`}
      >
        <Icon className="w-4 h-4" />
        {type === "dine_in" && <span>{tableNumber || "-"}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {fullLabel}
    </span>
  );
}

/* ---------- Badge status pesanan ---------- */

export function StatusBadge({ status }: { status: OrderStatus }) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0";
  switch (status) {
    case "pending":
      return (
        <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}>
          <Clock className="w-3.5 h-3.5" />
          Baru Masuk
        </span>
      );
    case "processing":
      return (
        <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
          <ChefHat className="w-3.5 h-3.5" />
          Diproses
        </span>
      );
    case "ready":
      return (
        <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Siap Diambil/Kirim
        </span>
      );
    case "completed":
      return (
        <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Selesai
        </span>
      );
    case "cancelled":
      return (
        <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
          <XCircle className="w-3.5 h-3.5" />
          Dibatalkan
        </span>
      );
    default:
      return (
        <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>
          {String(status)}
        </span>
      );
  }
}

/* ---------- Dropdown filter ---------- */

export function FilterSelect({
  label,
  icon: Icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl pl-9 pr-8 py-2.5 truncate focus:bg-white focus:outline-emerald-500 transition-all cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </label>
  );
}

/* ---------- Modal (bottom sheet di HP, di tengah di desktop) ----------
   Jika onBack diberikan: tombol kembali di kiri (tanpa tombol X). */

export function Modal({
  title,
  subtitle,
  onClose,
  onBack,
  children,
  footer,
  layer = "z-50",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  layer?: "z-50" | "z-[60]";
}) {
  return (
    <div
      className={`fixed inset-0 ${layer} flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4`}
      onClick={onBack ?? onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Kembali"
              className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-base text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>

          {!onBack && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">{children}</div>

        {footer && (
          <div className="px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 shrink-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}