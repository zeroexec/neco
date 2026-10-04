"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  PackageX,
  AlertCircle,
  ChevronRight,
  Calculator,
} from "lucide-react";

// ===== Tipe data =====
interface OrderRow {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  service_type?: string | null;
  order_type?: string | null;
  created_at: string;
}

interface ProductRow {
  id: string;
  name: string;
  stock: number;
  min_stock: number | null;
  track_stock: boolean;
  is_available: boolean;
}

// Status yang dianggap "perlu diproses" (sesuaikan dengan nilai di kolom orders.status)
const PENDING_STATUSES = ["pending"];

// ===== Helper =====
const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "Baru saja";
  if (diff < 60) return `${diff} menit lalu`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
};

const SERVICE_LABEL: Record<string, string> = {
  walk_in: "Di Tempat",
  dine_in: "Makan di Tempat",
  pickup: "Ambil Sendiri",
  delivery: "Diantar",
};

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Perlu Diproses", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "Diproses", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  preparing: { label: "Disiapkan", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ready: { label: "Siap", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivering: { label: "Diantar", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Dibatalkan", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const getStatus = (status?: string | null) =>
  STATUS_STYLE[status || ""] || {
    label: status || "-",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  };

export default function StoreDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [todayOrders, setTodayOrders] = useState<OrderRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      try {
        const [todayRes, recentRes, pendingRes, productRes] = await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .eq("shop_id", storeId)
            .gte("created_at", startOfDay.toISOString()),
          supabase
            .from("orders")
            .select("*")
            .eq("shop_id", storeId)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", storeId)
            .in("status", PENDING_STATUSES),
          supabase
            .from("products")
            .select("id, name, stock, min_stock, track_stock, is_available")
            .eq("shop_id", storeId),
        ]);

        if (todayRes.error) throw todayRes.error;
        if (recentRes.error) throw recentRes.error;
        if (productRes.error) throw productRes.error;

        if (cancelled) return;
        setTodayOrders((todayRes.data as OrderRow[]) || []);
        setRecentOrders((recentRes.data as OrderRow[]) || []);
        setPendingCount(pendingRes.count || 0);
        setProducts((productRes.data as ProductRow[]) || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        console.error("Gagal memuat ringkasan toko:", message);
        if (!cancelled) setError("Data ringkasan gagal dimuat. Coba muat ulang halaman.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  // ===== Hitungan ringkasan =====
  const validToday = todayOrders.filter((o) => o.status !== "cancelled");
  const salesToday = validToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const outOfStock = products.filter((p) => p.track_stock && p.stock <= 0);
  const lowStock = products.filter(
    (p) => p.track_stock && p.stock > 0 && p.stock <= (p.min_stock ?? 0)
  );
  const attentionProducts = [...outOfStock, ...lowStock].slice(0, 5);

  const base = `/mystore/${storeId}/dashboard`;

  const stats = [
    {
      label: "Penjualan Hari Ini",
      value: formatRupiah(salesToday),
      note: `${validToday.length} transaksi`,
      icon: TrendingUp,
      iconCls: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pesanan Hari Ini",
      value: String(validToday.length),
      note: pendingCount > 0 ? `${pendingCount} perlu diproses` : "Semua sudah ditangani",
      noteCls: pendingCount > 0 ? "text-amber-600 font-medium" : "text-slate-400",
      icon: ShoppingBag,
      iconCls: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Produk",
      value: String(products.length),
      note: `${outOfStock.length} stok habis`,
      icon: Package,
      iconCls: "bg-purple-50 text-purple-600",
    },
    {
      label: "Stok Menipis",
      value: String(outOfStock.length + lowStock.length),
      note: "Habis atau di bawah minimum",
      icon: PackageX,
      iconCls: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto">
      {/* Judul */}
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
          Ringkasan Toko
        </h1>
        <p className="text-xs text-slate-500">
          Pantau penjualan dan aktivitas toko Anda hari ini
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Aksi Cepat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`${base}/pos`}
          className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/10 rounded-xl shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Buka Kasir (POS)</p>
              <p className="text-xs text-emerald-100">Transaksi langsung di tempat</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href={`${base}/orders`}
          className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Daftar Pesanan</p>
              <p className="text-xs text-slate-400">Kelola pesanan masuk</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                <div className={`p-2 rounded-xl shrink-0 ${stat.iconCls}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 w-24 bg-slate-200 rounded-md" />
                  <div className="h-3 w-20 bg-slate-100 rounded-md" />
                </div>
              ) : (
                <div>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">
                    {stat.value}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${stat.noteCls || "text-slate-400"}`}>
                    {stat.note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Konten Bawah */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Pesanan Terbaru */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              Pesanan Terbaru
            </h2>
            <Link
              href={`${base}/orders`}
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Belum ada pesanan</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Pesanan dari pembeli dan kasir akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => {
                const status = getStatus(order.status);
                const service =
                  SERVICE_LABEL[order.service_type || order.order_type || ""] ||
                  order.service_type ||
                  order.order_type ||
                  "-";

                return (
                  <Link
                    key={order.id}
                    href={`${base}/orders`}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-between gap-3 transition-colors"
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
                        {order.customer_name || "Pelanggan"} · {service}
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
                );
              })}
            </div>
          )}
        </div>

        {/* Perlu Perhatian (stok) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 self-start">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
              Perlu Perhatian
            </h3>
            <Link
              href={`${base}/products`}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Kelola Produk
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
          ) : attentionProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              Stok semua produk aman.
            </p>
          ) : (
            <div className="space-y-2">
              {attentionProducts.map((p) => {
                const isEmpty = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
                      isEmpty
                        ? "bg-rose-50 border-rose-100"
                        : "bg-amber-50 border-amber-100"
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
                      className={`font-bold shrink-0 ${
                        isEmpty ? "text-rose-700" : "text-amber-700"
                      }`}
                    >
                      {isEmpty ? "Habis" : `Sisa ${p.stock}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}