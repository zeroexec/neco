"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Store, Sparkles } from "lucide-react";
import { checkIsActive, getInitials, type NavItem, type ShopDetail, type UserInfo } from "./utils";

interface SidebarProps {
  storeId: string;
  shop: ShopDetail | null;
  userInfo: UserInfo | null;
  items: NavItem[];
  pathname: string;
  homeHref: string;
  homeLabel: string;
  roleLabel: string;
}

export function Sidebar({
  storeId,
  shop,
  userInfo,
  items,
  pathname,
  homeHref,
  homeLabel,
  roleLabel,
}: SidebarProps) {
  return (
    // Hanya tampil di desktop (md ke atas). Di mobile dipakai header + bottom nav.
    <aside className="hidden md:flex md:flex-col md:w-72 md:sticky md:top-0 md:h-screen md:z-30 bg-white border-r border-slate-200/80 shrink-0 shadow-xs">
        {/* Header: [<] [logo toko] [nama & kategori] */}
        <div className="shrink-0 px-3 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
          <Link
            href={homeHref}
            aria-label={homeLabel}
            title={homeLabel}
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {shop?.avatar_url ? (
            <img
              src={shop.avatar_url}
              alt={shop.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Store className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-sm text-slate-900 truncate leading-tight">
              {shop?.name || `Toko #${storeId}`}
            </h2>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {shop?.category || "Umum"}
            </p>
          </div>
        </div>

        {/* Navigasi (scroll sendiri bila menu panjang) */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-4 pt-4 pb-4">
          <p className="px-2 mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Menu Navigasi
          </p>
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = checkIsActive(pathname, item.href, item.exact);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25"
                      : "bg-slate-50 text-slate-800 font-semibold hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-500 shadow-xs group-hover:text-emerald-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`min-w-5 text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white text-emerald-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      isActive ? "text-white/80" : "text-slate-300"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer: kartu akun hijau */}
        <div className="shrink-0 p-3 border-t border-slate-100">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-600/25 p-3 space-y-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-8 -left-6 w-20 h-20 rounded-full bg-white/10"
            />
            <Store
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 -right-1 w-16 h-16 text-white/15 rotate-12"
            />
            <Sparkles
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2.5 right-3 w-4 h-4 text-white/30"
            />

            <div className="relative flex items-center gap-3">
              {userInfo?.avatar ? (
                <img
                  src={userInfo.avatar}
                  alt={userInfo.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/40 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 text-white border-2 border-white/30 flex items-center justify-center text-xs font-extrabold shrink-0">
                  {getInitials(userInfo?.name || "?")}
                </div>
              )}
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-xs font-extrabold text-white truncate leading-tight">
                  {userInfo?.name || "Pengguna"}
                </p>
                {userInfo?.email && (
                  <p className="text-[10px] text-emerald-100 truncate mt-0.5">
                    {userInfo.email}
                  </p>
                )}
              </div>
            </div>

            <span className="relative inline-flex max-w-full items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/25">
              <span className="truncate">{roleLabel}</span>
            </span>
          </div>
        </div>
    </aside>
  );
}