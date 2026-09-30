"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Loader2,
  Menu,
  X,
} from "lucide-react";

interface ShopDetail {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  location: string;
  address_detail: string | null;
  avatar_url: string | null;
  is_open: boolean;
  rating: number;
}

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

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Fetch Data Toko
  const fetchShopDetail = async () => {
    if (!storeId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", storeId)
        .single();

      if (error) throw error;
      if (data) setShop(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("Gagal mengambil data detail toko:", message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShopDetail();
  }, [storeId]);

  // Tutup drawer otomatis saat pindah halaman
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Tutup drawer dengan tombol Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Kunci scroll halaman saat drawer terbuka (mobile)
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // 2. Toggle Status Buka/Tutup Toko
  const handleToggleStatus = async () => {
    if (!shop || isTogglingStatus) return;

    const newStatus = !shop.is_open;
    setIsTogglingStatus(true);

    try {
      const { error } = await supabase
        .from("shops")
        .update({
          is_open: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shop.id);

      if (error) throw error;

      setShop((prev) => (prev ? { ...prev, is_open: newStatus } : prev));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengubah status toko";
      console.error("Gagal mengubah status toko:", message);
      alert("Gagal mengubah status toko. Silakan coba lagi.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

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
      label: "Produk",
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
      {/* ================= HEADER (Mobile Only) ================= */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-3 flex items-center gap-3 shadow-xs">
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Buka menu"
          className="p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="h-3.5 w-32 bg-slate-200 rounded-md animate-pulse" />
          ) : (
            <h1 className="font-extrabold text-sm text-slate-900 truncate">
              {shop?.name || `Toko #${storeId}`}
            </h1>
          )}
        </div>

        {!isLoading && (
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              shop?.is_open
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop?.is_open ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {shop?.is_open ? "Buka" : "Tutup"}
          </span>
        )}
      </header>

      {/* ================= OVERLAY (Mobile Only) ================= */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ================= SIDEBAR (Drawer di mobile, tetap di desktop) ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200/80 shrink-0 flex flex-col justify-between shadow-xl md:shadow-xs transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:z-30 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Header Sidebar */}
          <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <Link
                href="/mystore"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Semua Toko</span>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Tutup menu"
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-3 pt-1 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-2.5 bg-slate-200 rounded-md w-1/2" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-1">
                {shop?.avatar_url ? (
                  <img
                    src={shop.avatar_url}
                    alt={shop.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-sm text-slate-900 truncate leading-tight">
                    {shop?.name || `Toko #${storeId}`}
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {shop?.category || "Umum"}
                  </p>
                </div>
              </div>
            )}

            {/* Toggle Status Toko */}
            <button
              onClick={handleToggleStatus}
              disabled={isLoading || isTogglingStatus}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                shop?.is_open
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                  : "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100"
              }`}
            >
              <div className="flex items-center gap-2">
                {isTogglingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5" />
                )}
                <span>Status Toko</span>
              </div>
              <span className="font-bold">{shop?.is_open ? "Buka" : "Tutup"}</span>
            </button>
          </div>

          {/* Navigasi Utama */}
          <nav className="p-3 space-y-1 flex-1">
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
        <div className="p-3 border-t border-slate-100 shrink-0">
          <Link
            href="/mystore"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Toko</span>
          </Link>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}