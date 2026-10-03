"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  Sparkles,
  X,
  Home,
  User,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  type LucideIcon,
} from "lucide-react";

// Sesuai tabel profiles di Supabase
export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  href: string;
  Icon: LucideIcon;
}

// Ubah href di sini jika nama route di project kamu berbeda
const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/", Icon: Home },
  { label: "Toko Saya", href: "/mystore", Icon: Store },
  { label: "Profil", href: "/profile", Icon: User },
  { label: "Pengaturan", href: "/settings", Icon: Settings },
  { label: "Bantuan", href: "/help", Icon: HelpCircle },
];

export default function SidebarDrawer({
  isOpen,
  onClose,
  userProfile,
  onLogout,
}: SidebarDrawerProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Overlay - Tanpa Blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Menu Side Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2"
            aria-label="Ke beranda"
          >
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-slate-900">
              NECO<span className="text-emerald-600">.</span> Navigation
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Area profil pengguna */}
        {userProfile ? (
          <Link
            href="/profile"
            onClick={onClose}
            className="p-4 bg-slate-50 hover:bg-slate-100 border-b border-slate-100 flex items-center gap-3 transition-colors"
          >
            {userProfile.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt={userProfile.full_name || "User"}
                className="w-10 h-10 rounded-full object-cover border border-emerald-500"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-500">
                {(userProfile.full_name || "U").substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-slate-900 truncate">
                {userProfile.full_name || "Pengguna"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {userProfile.email}
              </p>
            </div>
          </Link>
        ) : (
          <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Selamat datang! Silakan masuk untuk mengakses fitur lengkap.
            </p>
            <Link
              href="/auth/login"
              onClick={onClose}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Ke Akun</span>
            </Link>
          </div>
        )}

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors ${
                  active
                    ? "font-semibold text-emerald-700 bg-emerald-50"
                    : "font-medium text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active ? "text-emerald-700" : "text-slate-500"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {userProfile && (
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        )}
      </aside>
    </>
  );
}