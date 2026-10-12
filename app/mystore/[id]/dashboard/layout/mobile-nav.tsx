"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { checkIsActive, getInitials, type NavItem, type ShopDetail, type UserInfo } from "./utils";

// ================= HEADER (mobile) =================
export function MobileHeader({
  shop,
  storeId,
  userInfo,
  homeHref,
  homeLabel,
  onOpenMenu,
}: {
  shop: ShopDetail | null;
  storeId: string;
  userInfo: UserInfo | null;
  homeHref: string;
  homeLabel: string;
  onOpenMenu: () => void;
}) {
  const firstName = userInfo?.name?.split(" ")[0] || "";

  return (
    <header className="md:hidden relative shrink-0 z-30 h-[var(--mobile-header-h)] overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-4 pt-[env(safe-area-inset-top)] rounded-b-3xl shadow-md shadow-emerald-900/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-8 w-36 h-36 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 left-10 w-28 h-28 rounded-full bg-white/5"
      />

      <div className="relative h-full flex items-center gap-3">
        <Link
          href={homeHref}
          aria-label={homeLabel}
          className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        <div className="min-w-0 flex-1">
          {firstName && <p className="text-[11px] text-emerald-100 leading-none">Halo, {firstName}</p>}
          <h1 className="mt-1 font-extrabold text-base truncate leading-tight">
            {shop?.name || `Toko #${storeId}`}
          </h1>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            shop?.is_open ? "bg-white text-emerald-700" : "bg-rose-500 text-white"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              shop?.is_open ? "bg-emerald-500" : "bg-white"
            }`}
          />
          {shop?.is_open ? "Buka" : "Tutup"}
        </span>

        {/* Avatar: membuka panel akun */}
        <button
          onClick={onOpenMenu}
          aria-label="Buka panel akun"
          className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-white"
        >
          {userInfo?.avatar ? (
            <img
              src={userInfo.avatar}
              alt={userInfo.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-[11px] font-extrabold">
              {getInitials(userInfo?.name || "?")}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

// ================= BOTTOM NAV (mobile) =================
const MAX_TABS = 5;

// Menu yang tidak muat di bottom nav (masuk ke tab "Lainnya")
export const getOverflowItems = (items: NavItem[]): NavItem[] =>
  items.length > MAX_TABS ? items.slice(MAX_TABS - 1) : [];

export function MobileBottomNav({
  items,
  pathname,
  isMenuOpen,
  onOpenMenu,
}: {
  items: NavItem[];
  pathname: string;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
}) {
  // Maksimal 5 tab. Jika menu lebih banyak: 4 menu pertama + tab "Lainnya" (membuka panel).
  const hasOverflow = items.length > MAX_TABS;
  const primary = hasOverflow ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = getOverflowItems(items);
  const totalTabs = primary.length + (hasOverflow ? 1 : 0);

  // Kasir jadi tombol bulat di tengah (hanya jika jumlah tab ganjil, supaya benar-benar di tengah)
  const ordered = [...primary];
  const posIdx = ordered.findIndex((i) => i.key === "pos");
  const raisedKey = posIdx !== -1 && totalTabs >= 3 && totalTabs % 2 === 1 ? "pos" : null;
  if (raisedKey) {
    const [pos] = ordered.splice(posIdx, 1);
    ordered.splice(Math.floor(totalTabs / 2), 0, pos);
  }

  const overflowActive = overflow.some((i) => checkIsActive(pathname, i.href, i.exact));

  const tabBase =
    "relative h-full w-full flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600";

  return (
    <nav
      aria-label="Navigasi utama"
      className="md:hidden relative shrink-0 z-30 bg-white rounded-t-3xl border-t border-slate-100 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.2)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch h-16 px-2">
        {ordered.map((item) => {
          const Icon = item.icon;
          const isActive = checkIsActive(pathname, item.href, item.exact);

          if (item.key === raisedKey) {
            return (
              <li key={item.key} className="relative flex-1 flex justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className="absolute -top-6 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 ring-4 ring-white active:scale-95 transition-transform"
                >
                  <Icon className="w-6 h-6" />
                </Link>
                <span
                  className={`absolute bottom-2 text-[10px] ${
                    isActive ? "font-bold text-emerald-600" : "font-semibold text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </li>
            );
          }

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`${tabBase} ${
                  isActive
                    ? "text-emerald-600 font-bold"
                    : "text-slate-400 font-semibold hover:text-emerald-600"
                }`}
              >
                <span className="relative">
                  <Icon className="w-6 h-6" />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.label}
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600" />
                )}
              </Link>
            </li>
          );
        })}

        {hasOverflow && (
          <li className="flex-1">
            <button
              onClick={onOpenMenu}
              aria-label="Menu lainnya"
              className={`${tabBase} ${
                overflowActive || isMenuOpen
                  ? "text-emerald-600 font-bold"
                  : "text-slate-400 font-semibold hover:text-emerald-600"
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
              Lainnya
              {overflowActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600" />
              )}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}

// ================= PANEL "LAINNYA" (mobile, bottom sheet) =================
export function MobileMoreSheet({
  isOpen,
  onClose,
  items,
  pathname,
  userInfo,
  roleLabel,
  homeHref,
  homeLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[]; // semua menu yang boleh dilihat; yang tampil hanya yang tidak muat di bottom nav
  pathname: string;
  userInfo: UserInfo | null;
  roleLabel: string;
  homeHref: string;
  homeLabel: string;
}) {
  const overflow = getOverflowItems(items);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`md:hidden fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-label="Menu lainnya"
        className={`absolute bottom-0 inset-x-0 bg-white rounded-t-3xl px-4 pt-3 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

        {/* Akun */}
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-3 text-white">
          {userInfo?.avatar ? (
            <img
              src={userInfo.avatar}
              alt={userInfo.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/40 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs font-extrabold shrink-0">
              {getInitials(userInfo?.name || "?")}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold truncate leading-tight">
              {userInfo?.name || "Pengguna"}
            </p>
            {userInfo?.email && (
              <p className="text-[10px] text-emerald-100 truncate mt-0.5">{userInfo.email}</p>
            )}
          </div>
          <span className="shrink-0 max-w-[40%] truncate px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/15 border border-white/25">
            {roleLabel}
          </span>
        </div>

        {/* Menu yang tidak muat di bottom nav */}
        {overflow.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {overflow.map((item) => {
              const Icon = item.icon;
              const isActive = checkIsActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-50 text-slate-800 font-semibold hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                      isActive ? "bg-white/20" : "bg-white text-slate-500 shadow-xs"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Kembali ke daftar toko */}
        <Link
          href={homeHref}
          className="mt-3 flex items-center justify-between rounded-2xl bg-slate-100 hover:bg-slate-200 px-4 py-3 text-xs font-bold text-slate-700 transition-colors"
        >
          {homeLabel}
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}