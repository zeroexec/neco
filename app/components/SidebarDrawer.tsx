"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FavoriteShopsModal from "./FavoriteShopsModal";
import {
  Store,
  X,
  Home,
  User,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  BadgeCheck,
  ChevronRight,
  ClipboardList,
  Heart,
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

// Item navigasi: berisi href (pindah halaman) ATAU action (buka modal)
interface NavItem {
  label: string;
  Icon: LucideIcon;
  href?: string;
  action?: "favorites";
}

// Ubah href di sini jika nama route di project kamu berbeda
const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/", Icon: Home },
  { label: "Toko Saya", href: "/mystore", Icon: Store },
  { label: "Daftar Pesanan", href: "/orders", Icon: ClipboardList },
  { label: "Toko Favorit", action: "favorites", Icon: Heart },
  { label: "Dashboard Karyawan", href: "/employee", Icon: BadgeCheck },
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
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Kunci scroll halaman di belakang saat sidebar terbuka.
  // position: fixed dipakai (bukan hanya overflow: hidden) agar juga bekerja di iOS Safari.
  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    // Cegah konten bergeser saat scrollbar desktop menghilang
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      // Kembalikan posisi scroll semula
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
    };
  }, [isOpen]);

  // Tutup sidebar dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Tutup sidebar, lalu buka modal toko favorit
  const openFavorites = () => {
    onClose();
    setIsFavoritesOpen(true);
  };

  const itemClass = (active: boolean) =>
    `group relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm text-left transition-all ${
      active
        ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25"
        : "bg-slate-50 text-slate-800 font-semibold hover:bg-emerald-50 hover:text-emerald-700"
    }`;

  const iconWrapClass = (active: boolean) =>
    `flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
      active
        ? "bg-white/20 text-white"
        : "bg-white text-slate-500 shadow-xs group-hover:text-emerald-600"
    }`;

  const chevronClass = (active: boolean) =>
    `w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
      active ? "text-white/80" : "text-slate-300"
    }`;

  return (
    <>
      {/* Overlay - Tanpa Blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 transition-opacity touch-none"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu Side Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5"
            aria-label="Ke beranda"
          >
            {/* Logo: gambar di dalam bingkai hijau (latar sidebar putih,
                sedangkan logo berwarna putih sehingga perlu latar berwarna) */}
            <div className="w-9 h-9 rounded-lg bg-emerald-600 overflow-hidden shadow-sm shadow-emerald-600/20">
              <img
                src="/logo.png"
                alt=""
                className="w-full h-full object-contain scale-100"
              />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              NECO<span className="text-emerald-600">.</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigasi - pusat perhatian */}
        <nav className="px-4 pb-4 flex-1 overflow-y-auto overscroll-contain">
          <p className="px-2 mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Menu Navigasi
          </p>
          <div className="space-y-2">
            {NAV_ITEMS.map(({ label, href, action, Icon }) => {
              // Item berupa aksi (modal): tombol, bukan link
              if (action === "favorites") {
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={openFavorites}
                    className={`${itemClass(false)} cursor-pointer`}
                  >
                    <span className={iconWrapClass(false)}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="flex-1">{label}</span>
                    <ChevronRight className={chevronClass(false)} />
                  </button>
                );
              }

              const active = href ? isActive(href) : false;
              return (
                <Link
                  key={href}
                  href={href ?? "/"}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active)}
                >
                  <span className={iconWrapClass(active)}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight className={chevronClass(active)} />
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Area profil pengguna - di bawah, dalam card hijau */}
        <div className="p-4">
          {userProfile ? (
            <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 p-3 text-white shadow-lg shadow-emerald-600/20">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl p-1 hover:bg-white/10 transition-colors"
              >
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name || "User"}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white/70"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/20 text-white font-bold text-sm flex items-center justify-center border-2 border-white/70">
                    {(userProfile.full_name || "U")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">
                    {userProfile.full_name || "Pengguna"}
                  </p>
                  <p className="text-xs text-emerald-100 truncate">
                    {userProfile.email}
                  </p>
                </div>
              </Link>

              <button
                onClick={onLogout}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-lg shadow-emerald-600/20 space-y-3">
              <p className="text-xs text-emerald-50 font-medium leading-relaxed">
                Selamat datang! Silakan masuk untuk mengakses fitur lengkap.
              </p>
              <Link
                href="/auth/login"
                onClick={onClose}
                className="w-full py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Ke Akun</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Modal Toko Favorit: sengaja di luar <aside> (aside punya transform,
          yang akan merusak posisi elemen fixed di dalamnya) */}
      <FavoriteShopsModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        userId={userProfile?.id ?? null}
      />
    </>
  );
}