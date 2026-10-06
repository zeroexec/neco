"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ClipboardList,
  Search,
  X,
  Loader2,
  ChevronDown,
  Store,
  LogIn,
  RefreshCw,
  MapPin,
} from "lucide-react";

// ---------- Tipe data (sesuai tabel orders, order_items, shops di Supabase) ----------

interface OrderItem {
  id: string;
  product_name: string;
  price: number | string;
  quantity: number;
  subtotal: number | string;
}

interface ShopInfo {
  name: string;
  avatar_url: string | null;
}

interface OrderRow {
  id: string;
  order_number: number;
  source: string;
  service_type: string;
  status: string;
  table_id: string | null;
  delivery_address: string | null;
  delivery_note: string | null;
  delivery_fee: number | string;
  payment_method: string | null;
  payment_status: string;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  total_amount: number | string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  shops: ShopInfo | ShopInfo[] | null;
  order_items: OrderItem[] | null;
}

type FilterKey = "all" | "ongoing" | "done" | "cancelled";

const PAGE_SIZE = 20;

const ORDER_COLUMNS = `id, order_number, source, service_type, status, table_id,
  delivery_address, delivery_note, delivery_fee, payment_method, payment_status,
  subtotal, tax, discount, total_amount, paid_at, notes, created_at, completed_at`;

// ---------- Helper tampilan ----------

const rupiah = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

// Ubah nilai status di sini jika memakai nama status yang berbeda
const DONE_STATUSES = ["completed", "done", "selesai"];
const CANCELLED_STATUSES = ["cancelled", "canceled", "dibatalkan", "rejected"];

function getStatusGroup(status: string): Exclude<FilterKey, "all"> {
  const s = status.toLowerCase();
  if (DONE_STATUSES.includes(s)) return "done";
  if (CANCELLED_STATUSES.includes(s)) return "cancelled";
  return "ongoing";
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Menunggu", className: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Dikonfirmasi", className: "bg-sky-50 text-sky-700" },
  accepted: { label: "Diterima", className: "bg-sky-50 text-sky-700" },
  processing: { label: "Diproses", className: "bg-sky-50 text-sky-700" },
  preparing: { label: "Disiapkan", className: "bg-sky-50 text-sky-700" },
  ready: { label: "Siap", className: "bg-emerald-50 text-emerald-700" },
  delivering: { label: "Diantar", className: "bg-violet-50 text-violet-700" },
  completed: { label: "Selesai", className: "bg-emerald-50 text-emerald-700" },
  done: { label: "Selesai", className: "bg-emerald-50 text-emerald-700" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Dibatalkan", className: "bg-rose-50 text-rose-600" },
  canceled: { label: "Dibatalkan", className: "bg-rose-50 text-rose-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-rose-50 text-rose-600" },
  rejected: { label: "Ditolak", className: "bg-rose-50 text-rose-600" },
};

function getStatusBadge(status: string) {
  const found = STATUS_CONFIG[status.toLowerCase()];
  if (found) return found;
  // Status tak dikenal: tampilkan apa adanya
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return { label, className: "bg-slate-100 text-slate-600" };
}

const SERVICE_LABEL: Record<string, string> = {
  walk_in: "Langsung di Toko",
  dine_in: "Makan di Tempat",
  pickup: "Ambil Sendiri",
  delivery: "Diantar",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Belum Dibayar", className: "text-amber-600" },
  paid: { label: "Lunas", className: "text-emerald-600" },
  refunded: { label: "Dikembalikan", className: "text-slate-500" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "ongoing", label: "Berlangsung" },
  { key: "done", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

const getShop = (o: OrderRow): ShopInfo | null =>
  Array.isArray(o.shops) ? o.shops[0] ?? null : o.shops;

// order_number bertipe integer
const getOrderCode = (o: OrderRow) => `#${o.order_number}`;

// ---------- Halaman ----------

export default function OrdersPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  // id meja -> nomor meja (dari tabel shop_tables)
  const [tableMap, setTableMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 1. Cek sesi pengguna
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Ambil pesanan milik pengguna (bertahap, PAGE_SIZE per permintaan)
  const fetchOrders = useCallback(
    async (offset: number) => {
      if (!userId) return;
      const isFirstPage = offset === 0;

      if (isFirstPage) setIsLoading(true);
      else setIsLoadingMore(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `${ORDER_COLUMNS},
           shops ( name, avatar_url ),
           order_items ( id, product_name, price, quantity, subtotal )`
        )
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Gagal mengambil pesanan:", error.message);
        setErrorMsg("Gagal memuat daftar pesanan. Coba lagi nanti.");
      } else {
        const rows = (data ?? []) as unknown as OrderRow[];
        setOrders((prev) => (isFirstPage ? rows : [...prev, ...rows]));
        setHasMore(rows.length === PAGE_SIZE);

        // Ambil nomor meja untuk pesanan makan di tempat (query terpisah,
        // sehingga tidak bergantung pada foreign key orders.table_id)
        const tableIds = Array.from(
          new Set(rows.map((r) => r.table_id).filter((v): v is string => !!v))
        );
        if (tableIds.length > 0) {
          const { data: tables } = await supabase
            .from("shop_tables")
            .select("id, table_number")
            .in("id", tableIds);
          if (tables) {
            setTableMap((prev) => ({
              ...prev,
              ...Object.fromEntries(
                tables.map((t) => [t.id as string, t.table_number as string])
              ),
            }));
          }
        }
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [userId]
  );

  useEffect(() => {
    if (!authChecked) return;
    if (!userId) {
      setOrders([]);
      setHasMore(false);
      return;
    }
    fetchOrders(0);
  }, [authChecked, userId, fetchOrders]);

  // Jumlah pesanan per kelompok status (untuk badge di tab)
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: orders.length,
      ongoing: 0,
      done: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      c[getStatusGroup(o.status)] += 1;
    });
    return c;
  }, [orders]);

  // Filter tab + pencarian (nama toko, nomor pesanan, nama produk)
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((o) => {
      if (filter !== "all" && getStatusGroup(o.status) !== filter) return false;
      if (!q) return true;
      const shopName = getShop(o)?.name.toLowerCase() ?? "";
      const code = String(o.order_number);
      const inItems = (o.order_items ?? []).some((i) =>
        i.product_name.toLowerCase().includes(q)
      );
      return shopName.includes(q) || code.includes(q) || inItems;
    });
  }, [orders, filter, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-[max(3rem,env(safe-area-inset-bottom))] font-sans">
      {/* Header hijau gradasi */}
      <header className="bg-linear-to-br from-emerald-500 to-emerald-700 text-white sticky top-0 z-30 shadow-md shadow-emerald-700/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="p-2 -ml-2 rounded-xl hover:bg-white/15 active:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ClipboardList className="w-5 h-5 shrink-0" />
            <h1 className="font-bold text-base sm:text-lg truncate">
              Daftar Pesanan
            </h1>
          </div>
          {userId && (
            <button
              type="button"
              onClick={() => fetchOrders(0)}
              disabled={isLoading}
              aria-label="Muat ulang"
              className="p-2 -mr-2 rounded-xl hover:bg-white/15 active:bg-white/25 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          )}
        </div>
      </header>

      {/* Tab status + pencarian: menempel di bawah header.
          top-14 = tinggi header (56px). Ubah jika tinggi header diubah. */}
      {authChecked && userId && (
        <div className="sticky top-14 z-20 bg-slate-50/95 border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Tab status (bisa digeser di mobile) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    filter === f.key
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-px rounded-full ${
                      filter === f.key
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Pencarian */}
            <div className="relative w-full sm:w-72 lg:w-80 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {/* text-base di mobile (16px) mencegah iOS memperbesar layar saat fokus */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari toko, no. pesanan, produk..."
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-10 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4">
        {/* Menunggu pengecekan sesi */}
        {!authChecked ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !userId ? (
          /* Belum login */
          <div className="max-w-md mx-auto bg-white rounded-2xl p-10 text-center border border-slate-200 flex flex-col items-center gap-3">
            <ClipboardList className="w-12 h-12 text-slate-300" />
            <p className="font-semibold text-slate-700">
              Masuk untuk melihat pesananmu
            </p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-64">
              Riwayat pesanan tersimpan di akunmu dan bisa dilihat dari
              perangkat mana saja.
            </p>
            <Link
              href="/auth/login"
              className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Masuk Ke Akun
            </Link>
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              Memuat pesanan...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-10 border border-slate-200 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-rose-600 font-medium">{errorMsg}</p>
            <button
              type="button"
              onClick={() => fetchOrders(0)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-12 border border-slate-200 text-center flex flex-col items-center gap-2">
            <ClipboardList className="w-12 h-12 text-slate-300" />
            <p className="font-semibold text-slate-700">Belum ada pesanan</p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-64">
              Pesanan yang kamu buat dari toko akan muncul di sini.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
            >
              <Store className="w-4 h-4" />
              Jelajahi Toko
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-12 border border-slate-200 text-center flex flex-col items-center gap-2">
            <Search className="w-10 h-10 text-slate-300" />
            <p className="font-semibold text-slate-700">
              Pesanan tidak ditemukan
            </p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-64">
              Coba ganti tab status atau gunakan kata kunci lain.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-slate-500 px-0.5">
              Menampilkan <strong>{filteredOrders.length} pesanan</strong>
            </p>

            {/* Mobile: 1 kolom. Desktop (lg): 2 kolom; items-start agar kartu yang
                dibuka tidak ikut memanjangkan kartu di sebelahnya */}
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
              {filteredOrders.map((order) => {
                const shop = getShop(order);
                const badge = getStatusBadge(order.status);
                const items = order.order_items ?? [];
                const isExpanded = expandedId === order.id;
                const paymentStatus =
                  PAYMENT_STATUS_CONFIG[order.payment_status] ?? null;
                const tax = Number(order.tax ?? 0);
                const discount = Number(order.discount ?? 0);
                const deliveryFee = Number(order.delivery_fee ?? 0);
                const tableNumber = order.table_id
                  ? tableMap[order.table_id]
                  : null;

                const previewText = items
                  .slice(0, 2)
                  .map((i) => `${i.quantity}× ${i.product_name}`)
                  .join(", ");
                const moreCount = items.length - 2;

                return (
                  <li
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Ringkasan: klik untuk membuka/menutup detail */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : order.id)
                      }
                      aria-expanded={isExpanded}
                      className="w-full p-4 sm:p-5 text-left hover:bg-slate-50/70 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                          {shop?.avatar_url ? (
                            <img
                              src={shop.avatar_url}
                              alt={shop.name}
                              className="w-full h-full object-cover"
                            />
                          ) : shop ? (
                            shop.name.substring(0, 2).toUpperCase()
                          ) : (
                            <Store className="w-5 h-5 text-emerald-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-sm sm:text-base text-slate-900 truncate">
                              {shop?.name ?? "Toko tidak diketahui"}
                            </p>
                            <span
                              className={`shrink-0 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                            {getOrderCode(order)} •{" "}
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>

                      {previewText && (
                        <p className="mt-3 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {previewText}
                          {moreCount > 0 && (
                            <span className="text-slate-400">
                              {" "}
                              +{moreCount} lainnya
                            </span>
                          )}
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] sm:text-xs text-slate-400">
                            Total
                          </p>
                          <p className="font-bold text-sm sm:text-base text-slate-900">
                            {rupiah(order.total_amount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate">
                            {SERVICE_LABEL[order.service_type] ??
                              order.service_type}
                            {tableNumber ? ` • Meja ${tableNumber}` : ""}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Detail pesanan */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 border-t border-slate-100 pt-3 bg-slate-50/50">
                        {/* Daftar item */}
                        <div className="space-y-2">
                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400">
                              Rincian item tidak tersedia.
                            </p>
                          ) : (
                            items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-3 text-xs sm:text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate">
                                    {item.product_name}
                                  </p>
                                  <p className="text-slate-400 text-xs">
                                    {item.quantity} × {rupiah(item.price)}
                                  </p>
                                </div>
                                <p className="font-semibold text-slate-700 shrink-0">
                                  {rupiah(item.subtotal)}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Rincian biaya */}
                        <div className="pt-3 border-t border-dashed border-slate-200 space-y-1.5 text-xs sm:text-sm">
                          <div className="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>{rupiah(order.subtotal)}</span>
                          </div>
                          {tax > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Pajak</span>
                              <span>{rupiah(tax)}</span>
                            </div>
                          )}
                          {deliveryFee > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Ongkos kirim</span>
                              <span>{rupiah(deliveryFee)}</span>
                            </div>
                          )}
                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Diskon</span>
                              <span>-{rupiah(discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-slate-900 text-sm sm:text-base pt-1">
                            <span>Total</span>
                            <span>{rupiah(order.total_amount)}</span>
                          </div>
                        </div>

                        {/* Pembayaran */}
                        <div className="pt-3 border-t border-dashed border-slate-200 space-y-1.5 text-xs sm:text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">
                              Pembayaran
                              {order.payment_method && (
                                <>
                                  {" "}
                                  •{" "}
                                  <span className="font-semibold text-slate-700">
                                    {PAYMENT_METHOD_LABEL[
                                      order.payment_method
                                    ] ?? order.payment_method}
                                  </span>
                                </>
                              )}
                            </span>
                            {paymentStatus && (
                              <span
                                className={`font-bold ${paymentStatus.className}`}
                              >
                                {paymentStatus.label}
                              </span>
                            )}
                          </div>
                          {order.paid_at && (
                            <p className="text-slate-400 text-xs">
                              Dibayar pada {formatDate(order.paid_at)}
                            </p>
                          )}
                          {order.completed_at && (
                            <p className="text-slate-400 text-xs">
                              Selesai pada {formatDate(order.completed_at)}
                            </p>
                          )}
                        </div>

                        {/* Alamat antar */}
                        {order.service_type === "delivery" &&
                          order.delivery_address && (
                            <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 pt-3 border-t border-dashed border-slate-200">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                              <div className="min-w-0">
                                <p className="leading-relaxed">
                                  {order.delivery_address}
                                </p>
                                {order.delivery_note && (
                                  <p className="text-slate-400 text-xs mt-0.5">
                                    {order.delivery_note}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Catatan */}
                        {order.notes && (
                          <p className="text-xs sm:text-sm text-slate-500 italic pt-3 border-t border-dashed border-slate-200">
                            Catatan: {order.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Muat lebih banyak */}
            {hasMore && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => fetchOrders(orders.length)}
                  disabled={isLoadingMore}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isLoadingMore && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isLoadingMore ? "Memuat..." : "Muat Lebih Banyak"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}