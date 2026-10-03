"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { Store, MapPin, ShoppingBag, Landmark, Clock, Trash2 } from "lucide-react";
import { ToastProvider } from "./_lib/toast";

const TABS = [
  { segment: null, path: "", label: "Profil Toko", shortLabel: "Profil", icon: Store },
  { segment: "location", path: "/location", label: "Alamat & Lokasi", shortLabel: "Lokasi", icon: MapPin },
  { segment: "ordering", path: "/ordering", label: "Pemesanan", shortLabel: "Pesanan", icon: ShoppingBag },
  { segment: "bank", path: "/bank", label: "Rekening", shortLabel: "Rekening", icon: Landmark },
  { segment: "hours", path: "/hours", label: "Jam Operasional", shortLabel: "Jam", icon: Clock },
  { segment: "danger", path: "/danger", label: "Hapus Toko", shortLabel: "Hapus", icon: Trash2 },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeSegment = useSelectedLayoutSegment();

  // Base path = URL saat ini tanpa segmen tab aktif
  const base = (
    activeSegment
      ? pathname.replace(new RegExp(`/${activeSegment}/?$`), "")
      : pathname
  ).replace(/\/$/, "");

  return (
    <ToastProvider>
      {/* pb-24 di mobile = ruang untuk navbar bawah agar konten tidak tertutup */}
      <div className="w-full max-w-4xl mx-auto space-y-5 pb-24 md:pb-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengaturan Toko
          </h1>
          <p className="text-xs text-slate-500">
            Kelola identitas toko, lokasi, pemesanan, rekening, dan jam operasional
          </p>
        </div>

        {/* Navigasi tab: desktop (atas) */}
        <nav
          aria-label="Pengaturan toko"
          className="hidden md:block border-b border-slate-200 overflow-x-auto"
        >
          <div className="flex items-center gap-2 min-w-max pb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSegment === tab.segment;
              const isDanger = tab.segment === "danger";

              return (
                <Link
                  key={tab.label}
                  href={`${base}${tab.path}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                    isActive
                      ? isDanger
                        ? "border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-lg"
                        : "border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg"
                      : isDanger
                      ? "border-transparent text-rose-500 hover:text-rose-700 hover:border-rose-200"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {children}
      </div>

      {/* Navigasi tab: mobile (navbar bawah) */}
      <nav
        aria-label="Pengaturan toko"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSegment === tab.segment;
            const isDanger = tab.segment === "danger";

            return (
              <Link
                key={tab.label}
                href={`${base}${tab.path}`}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 transition-colors ${
                  isActive
                    ? isDanger
                      ? "text-rose-600"
                      : "text-emerald-600"
                    : isDanger
                    ? "text-rose-400 active:text-rose-600"
                    : "text-slate-400 active:text-slate-700"
                }`}
              >
                {/* Indikator aktif */}
                {isActive && (
                  <span
                    className={`absolute top-0 h-0.5 w-8 rounded-b-full ${
                      isDanger ? "bg-rose-600" : "bg-emerald-600"
                    }`}
                  />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-semibold leading-none">
                  {tab.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </ToastProvider>
  );
}