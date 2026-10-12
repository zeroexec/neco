"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  PackageX,
  AlertCircle,
  ChevronRight,
  Calculator,
  RefreshCw,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import {
  formatRupiah,
  formatToday,
  getServiceLabel,
  getStatus,
  timeAgo,
  type OrderRow,
  type ProductRow,
} from "./utils";

const card = "bg-white rounded-3xl border border-slate-200/80";

/* ---------- Judul + tombol muat ulang ---------- */

export function SummaryHeader({
  onRefresh,
  isBusy,
  isSpinning,
}: {
  onRefresh: () => void;
  isBusy: boolean;
  isSpinning: boolean;
}) {
  // Tanggal dihitung di sisi klien agar tidak beda dengan server (zona waktu)
  const [today, setToday] = useState("");
  useEffect(() => setToday(formatToday()), []);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Ringkasan Toko</h1>
        <p className="text-xs text-slate-500 truncate min-h-4">{today}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isBusy}
        aria-label="Muat ulang data"
        className="shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-60 flex items-center justify-center active:scale-95 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

/* ---------- Banner galat ---------- */

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onRetry} className="font-bold hover:underline shrink-0">
        Coba lagi
      </button>
    </div>
  );
}

/* ---------- Aksi cepat ---------- */

export function QuickActions({ base, pendingCount }: { base: string; pendingCount: number }) {
  const itemBase =
    "relative flex flex-col items-center justify-center gap-1.5 rounded-3xl py-3.5 text-xs font-bold active:scale-[0.98] transition-colors";

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      <Link
        href={`${base}/pos`}
        className={`${itemBase} bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-600/25`}
      >
        <Calculator className="w-5 h-5" />
        Buka Kasir
      </Link>

      <Link
        href={`${base}/orders`}
        className={`${itemBase} bg-white border border-slate-200/80 text-slate-700 hover:border-emerald-400`}
      >
        <ShoppingBag className="w-5 h-5 text-emerald-600" />
        Pesanan
        {pendingCount > 0 && (
          <span className="absolute top-2 right-3 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </Link>

      <Link
        href={`${base}/products`}
        className={`${itemBase} bg-white border border-slate-200/80 text-slate-700 hover:border-emerald-400`}
      >
        <Package className="w-5 h-5 text-emerald-600" />
        Produk
      </Link>
    </div>
  );
}

/* ---------- Statistik ---------- */

function StatTile({
  label,
  value,
  note,
  noteCls = "text-slate-400",
  icon: Icon,
  iconCls,
  isLoading,
}: {
  label: string;
  value: string;
  note: string;
  noteCls?: string;
  icon: LucideIcon;
  iconCls: string;
  isLoading: boolean;
}) {
  return (
    <div className={`${card} p-4 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`p-2 rounded-xl shrink-0 ${iconCls}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-7 w-16 bg-slate-200 rounded-md" />
          <div className="h-3 w-24 bg-slate-100 rounded-md" />
        </div>
      ) : (
        <div>
          <p className="text-2xl font-black text-slate-900 truncate">{value}</p>
          <p className={`text-[11px] mt-0.5 ${noteCls}`}>{note}</p>
        </div>
      )}
    </div>
  );
}

export function StatsGrid({
  isLoading,
  salesToday,
  transactionCount,
  pendingCount,
  outOfStockCount,
  lowStockCount,
}: {
  isLoading: boolean;
  salesToday: number;
  transactionCount: number;
  pendingCount: number;
  outOfStockCount: number;
  lowStockCount: number;
}) {
  const needsAttention = outOfStockCount + lowStockCount;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Penjualan hari ini (sorotan utama) */}
      <div className="col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 sm:p-5 text-white shadow-md shadow-emerald-600/25">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 -right-6 w-32 h-32 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 left-1/3 w-24 h-24 rounded-full bg-white/5"
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-100">Penjualan Hari Ini</p>
            {isLoading ? (
              <div className="mt-2 space-y-2 animate-pulse">
                <div className="h-8 w-40 bg-white/25 rounded-md" />
                <div className="h-3 w-20 bg-white/15 rounded-md" />
              </div>
            ) : (
              <>
                <p className="mt-1 text-2xl sm:text-3xl font-black truncate">
                  {formatRupiah(salesToday)}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-100">
                  {transactionCount} transaksi
                </p>
              </>
            )}
          </div>
          <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </span>
        </div>
      </div>

      <StatTile
        label="Pesanan Hari Ini"
        value={String(transactionCount)}
        note={pendingCount > 0 ? `${pendingCount} perlu diproses` : "Semua sudah ditangani"}
        noteCls={pendingCount > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}
        icon={ShoppingBag}
        iconCls="bg-blue-50 text-blue-600"
        isLoading={isLoading}
      />

      <StatTile
        label="Stok Menipis"
        value={String(needsAttention)}
        note={needsAttention > 0 ? `${outOfStockCount} habis, ${lowStockCount} menipis` : "Stok aman"}
        noteCls={needsAttention > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}
        icon={PackageX}
        iconCls="bg-amber-50 text-amber-600"
        isLoading={isLoading}
      />
    </div>
  );
}

/* ---------- Pesanan terbaru ---------- */

export function RecentOrders({
  base,
  orders,
  isLoading,
}: {
  base: string;
  orders: OrderRow[];
  isLoading: boolean;
}) {
  return (
    <section className={`lg:col-span-2 ${card} p-4 sm:p-5 space-y-3.5`}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-sm sm:text-base">Pesanan Terbaru</h2>
        <Link
          href={`${base}/orders`}
          className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-0.5"
        >
          Lihat Semua
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center">
          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Belum ada pesanan</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Pesanan dari pembeli dan kasir akan muncul di sini
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const status = getStatus(order.status);
            return (
              <li key={order.id}>
                <Link
                  href={`${base}/orders`}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-100 border border-slate-100 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {order.order_number || `#${order.id.slice(0, 6).toUpperCase()}`}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        • {timeAgo(order.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {order.customer_name || "Pelanggan"} · {getServiceLabel(order)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-900">
                      {formatRupiah(Number(order.total_amount || 0))}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- Perlu perhatian (stok) ---------- */

export function StockAttention({
  base,
  products,
  productCount,
  isLoading,
}: {
  base: string;
  products: ProductRow[];
  productCount: number;
  isLoading: boolean;
}) {
  return (
    <section className={`${card} p-4 sm:p-5 space-y-3 self-start`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base">Perlu Perhatian</h2>
          {!isLoading && <p className="text-[11px] text-slate-400">{productCount} produk</p>}
        </div>
        <Link
          href={`${base}/products`}
          className="text-xs font-semibold text-emerald-600 hover:underline shrink-0"
        >
          Kelola Produk
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-12 bg-slate-100 rounded-2xl" />
          <div className="h-12 bg-slate-100 rounded-2xl" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Stok semua produk aman.
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => {
            const isEmpty = (p.stock ?? 0) <= 0;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl border text-xs ${
                  isEmpty ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"
                }`}
              >
                <span
                  className={`font-semibold truncate ${
                    isEmpty ? "text-rose-900" : "text-amber-900"
                  }`}
                >
                  {p.name}
                </span>
                <span
                  className={`font-bold shrink-0 ${isEmpty ? "text-rose-700" : "text-amber-700"}`}
                >
                  {isEmpty ? "Habis" : `Sisa ${p.stock}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}