"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Star,
  Plus,
  AlertCircle,
  ChevronRight,
  Calculator,
} from "lucide-react";

export default function StoreDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Ringkasan Toko
          </h1>
          <p className="text-xs text-slate-500">
            Pantau performa dan aktivitas transaksi harian toko Anda
          </p>
        </div>
      </div>

      {/* Quick Action Cards (Kasir POS & Daftar Pesanan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/mystore/${storeId}/dashboard/pos`}
          className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all shadow-xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/10 rounded-xl shrink-0">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Buka Kasir POS</p>
              <p className="text-xs text-emerald-100">
                Transaksi langsung di tempat
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href={`/mystore/${storeId}/dashboard/orders`}
          className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl transition-all shadow-xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Daftar Pesanan</p>
              <p className="text-xs text-slate-400">
                Kelola Dine-in, Delivery, & Pick-up
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Penjualan Hari Ini
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-black text-slate-900">
              Rp 1.250.000
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              +12% dari kemarin
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Pesanan Masuk
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-black text-slate-900">18</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">
              3 perlu diproses
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Total Produk
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-black text-slate-900">24</p>
            <p className="text-[11px] text-slate-400 mt-0.5">2 stok habis</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Rating Toko
            </span>
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-black text-slate-900">
              4.8 / 5.0
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              dari 240 ulasan
            </p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pesanan Terbaru (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              Pesanan Terbaru
            </h2>
            <Link
              href={`/mystore/${storeId}/dashboard/orders`}
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "ORD-001",
                type: "Pesan Meja (Meja 04)",
                items: "2x Kopi Kenangan Mantan",
                total: "Rp 36.000",
                status: "Perlu Diproses",
                time: "10 menit lalu",
                statusBg: "bg-amber-50 text-amber-700 border-amber-200",
              },
              {
                id: "ORD-002",
                type: "Pesan Antar (Delivery)",
                items: "1x Butter Croissant, 1x Americano",
                total: "Rp 45.000",
                status: "Sedang Diantar",
                time: "25 menit lalu",
                statusBg: "bg-blue-50 text-blue-700 border-blue-200",
              },
              {
                id: "ORD-003",
                type: "Pick Up (Ambil Mandiri)",
                items: "3x Uji Matcha Latte",
                total: "Rp 84.000",
                status: "Selesai",
                time: "1 jam lalu",
                statusBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
            ].map((order) => (
              <div
                key={order.id}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {order.id}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {order.time}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                    {order.type}
                  </p>
                  <p className="text-xs font-medium text-slate-700 truncate mt-0.5">
                    {order.items}
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {order.total}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${order.statusBg}`}
                  >
                    {order.status}
                  </span>
                  <Link
                    href={`/mystore/${storeId}/dashboard/orders`}
                    className="text-xs text-emerald-600 font-semibold hover:underline"
                  >
                    Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info & Attention */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-base">Katalog Produk</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Atur stok, ubah harga, atau tambahkan varian menu baru toko Anda.
            </p>
            <Link
              href={`/mystore/${storeId}/dashboard/products`}
              className="w-full bg-white text-emerald-700 font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
              Perlu Perhatian
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-900">
                    2 Produk Stok Menipis
                  </p>
                  <p className="text-amber-700 mt-0.5">
                    Kopi Susu Aren (Sisa 2), Cheese Croissant (Habis)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}