"use client";

import React, { memo } from "react";
import { Search, ShoppingBag, Filter, ChevronRight, Loader2, User } from "lucide-react";
import { FilterSelect, StatusBadge, TypeBadge } from "./ui";
import {
  GREEN_BTN,
  STATUS_LABEL,
  STATUS_ORDER,
  TYPE_OPTIONS,
  displayOrderId,
  timeAgo,
  type Order,
  type OrderStatus,
  type StatusFilter,
  type TypeFilter,
} from "./utils";

/* ---------- Pencarian & filter ---------- */

export function OrderFilters({
  searchQuery,
  onSearch,
  selectedType,
  onType,
  statusFilter,
  onStatus,
  activeCount,
  totalCount,
  statusCounts,
}: {
  searchQuery: string;
  onSearch: (v: string) => void;
  selectedType: TypeFilter;
  onType: (v: TypeFilter) => void;
  statusFilter: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  activeCount: number;
  totalCount: number;
  statusCounts: Record<OrderStatus, number>;
}) {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative lg:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor pesanan atau nama pelanggan..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-emerald-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 lg:w-[28rem] shrink-0">
          <FilterSelect
            label="Filter tipe pesanan"
            icon={ShoppingBag}
            value={selectedType}
            onChange={(v) => onType(v as TypeFilter)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Filter status pesanan"
            icon={Filter}
            value={statusFilter}
            onChange={(v) => onStatus(v as StatusFilter)}
          >
            <option value="active">Pesanan Aktif ({activeCount})</option>
            <option value="all">Semua Status ({totalCount})</option>
            <optgroup label="Per status">
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]} ({statusCounts[s]})
                </option>
              ))}
            </optgroup>
          </FilterSelect>
        </div>
      </div>

      {statusFilter === "active" && (
        <p className="text-[11px] text-slate-400 mt-2">
          Menampilkan semua status kecuali Selesai &amp; Dibatalkan.
        </p>
      )}
    </div>
  );
}

/* ---------- Kartu pesanan ---------- */

const OrderCard = memo(function OrderCard({
  order,
  onOpen,
}: {
  order: Order;
  onOpen: (id: string) => void;
}) {
  return (
    <article className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition flex flex-col gap-3">
      {/* Nomor + waktu, status */}
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-slate-900 leading-none">
            {displayOrderId(order)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{timeAgo(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {/* Pelanggan + metode pemesanan (ikon) */}
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 min-w-0 text-xs font-extrabold text-slate-800">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{order.customerName}</span>
        </p>
        <TypeBadge type={order.type} tableNumber={order.tableNumber} iconOnly />
      </div>

      {order.notes && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg line-clamp-2">
          Catatan: {order.notes}
        </p>
      )}

      {/* Item & total hanya ada di detail */}
      <button
        onClick={() => onOpen(order.id)}
        className={`mt-auto w-full py-2.5 ${GREEN_BTN} font-bold text-xs rounded-xl flex items-center justify-center gap-1`}
      >
        <span>Detail</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </article>
  );
});

/* ---------- Daftar + keadaan kosong / memuat / galat ---------- */

export function OrderGrid({
  orders,
  totalCount,
  isLoading,
  loadError,
  statusFilter,
  onRetry,
  onShowAll,
  onOpen,
}: {
  orders: Order[];
  totalCount: number;
  isLoading: boolean;
  loadError: string | null;
  statusFilter: StatusFilter;
  onRetry: () => void;
  onShowAll: () => void;
  onOpen: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center gap-2 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
        <p className="text-xs font-medium">Memuat pesanan...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
        <p className="text-xs font-medium text-rose-600">{loadError}</p>
        <button
          onClick={onRetry}
          className={`px-4 py-2 ${GREEN_BTN} font-bold text-xs rounded-xl`}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-12 text-center space-y-3">
        <div className="p-3 bg-slate-100 text-slate-400 w-fit rounded-full mx-auto">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <p className="font-bold text-slate-800 text-sm">
          {totalCount === 0 ? "Belum ada pesanan" : "Tidak ada pesanan ditemukan"}
        </p>
        <p className="text-xs text-slate-400">
          {totalCount === 0
            ? "Pesanan yang masuk akan muncul di sini secara otomatis."
            : "Coba ubah kata kunci pencarian atau filter yang dipilih."}
        </p>
        {totalCount > 0 && statusFilter === "active" && (
          <button
            onClick={onShowAll}
            className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl transition-colors"
          >
            Lihat Semua Status
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onOpen={onOpen} />
      ))}
    </div>
  );
}