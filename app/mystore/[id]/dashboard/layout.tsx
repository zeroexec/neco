"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Store,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  Power,
  LogOut,
  Calculator,
  Users,
} from "lucide-react";

// Mock Data untuk Toko berdasarkan ID
const MOCK_STORES_DATA: Record<
  string,
  { name: string; category: string; location: string; isOpen: boolean }
> = {
  "1": {
    name: "Kopi Kenangan Senja Rungkut",
    category: "Kopi & Minuman",
    location: "Rungkut, Surabaya",
    isOpen: true,
  },
  "2": {
    name: "Matcha & Pastry Hub",
    category: "Snack & Dessert",
    location: "Mulyorejo, Surabaya",
    isOpen: true,
  },
};

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;
  const pathname = usePathname();

  const currentStore = MOCK_STORES_DATA[storeId] || {
    name: `Toko #${storeId}`,
    category: "Umum",
    location: "Surabaya",
    isOpen: true,
  };

  const [isOpenStatus, setIsOpenStatus] = useState(currentStore.isOpen);

  // Daftar Menu Navigasi Lengkap (Pesanan digabung menjadi satu)
  const navItems = [
    {
      label: "Ringkasan",
      href: `/mystore/${storeId}/dashboard`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Kasir (POS)",
      href: `/mystore/${storeId}/dashboard/pos`,
      icon: Calculator,
    },
    {
      label: "Pesanan",
      href: `/mystore/${storeId}/dashboard/orders`,
      icon: ShoppingBag,
      badge: "3",
    },
    {
      label: "Produk & Stok",
      href: `/mystore/${storeId}/dashboard/products`,
      icon: Package,
    },
    {
      label: "Karyawan",
      href: `/mystore/${storeId}/dashboard/employees`,
      icon: Users,
    },
    {
      label: "Pengaturan",
      href: `/mystore/${storeId}/dashboard/settings`,
      icon: Settings,
    },
  ];

  const checkIsActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      {/* ================= SIDEBAR NAVIGATION (Desktop) ================= */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 shrink-0 flex flex-col justify-between sticky top-0 md:h-screen z-30 shadow-xs">
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Header Sidebar: Link Kembali & Store Profile */}
          <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
            <Link
              href="/mystore"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Semua Toko</span>
            </Link>

            <div className="flex items-center gap-3 pt-1">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-sm text-slate-900 truncate leading-tight">
                  {currentStore.name}
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentStore.category}
                </p>
              </div>
            </div>

            {/* Toggle Status Toko */}
            <button
              onClick={() => setIsOpenStatus(!isOpenStatus)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isOpenStatus
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                  : "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Power className="w-3.5 h-3.5" />
                <span>Status Toko</span>
              </div>
              <span className="font-bold">
                {isOpenStatus ? "Buka" : "Tutup"}
              </span>
            </button>
          </div>

          {/* Navigasi Utama */}
          <nav className="p-3 space-y-1 flex-1 hidden md:block">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Menu Utama
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = checkIsActive(item.href, item.exact);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white text-emerald-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-slate-100 hidden md:block shrink-0">
          <Link
            href="/mystore"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Toko</span>
          </Link>
        </div>
      </aside>

      {/* ================= BOTTOM NAVIGATION (Mobile Only) ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-1 py-1.5 flex items-center justify-around shadow-lg overflow-x-auto no-scrollbar">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = checkIsActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative shrink-0 ${
                isActive ? "text-emerald-600 font-bold" : "text-slate-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] whitespace-nowrap">{item.label}</span>
              {item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </Link>
          );
        })}
      </div>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}