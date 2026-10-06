"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Store, Menu, LogOut, LogIn } from "lucide-react";
import type { UserProfile } from "./SidebarDrawer";

// Gradasi horizontal: sama persis di setiap ketinggian, sehingga bagian yang
// menempel (sticky) menyatu mulus dengan latar hero.
const GRADIENT = "bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500";

// Tinggi baris atas (px). Harus sama dengan kelas h-14 / -mt-14 di bawah
// dan dengan top-14 pada bar kategori di page.tsx.
const BAR_HEIGHT = 56;

interface HeaderProps {
  userProfile: UserProfile | null;
  onOpenMenu: () => void;
  onLogout: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
}

// ---------- Sub-komponen: tombol menu + logo + brand ----------

function LeftCluster({
  compact,
  onOpenMenu,
}: {
  compact: boolean;
  onOpenMenu: () => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      <button
        onClick={onOpenMenu}
        className="p-2 -ml-2 text-white hover:bg-emerald-800/40 active:bg-emerald-800/60 rounded-xl transition-colors"
        aria-label="Buka Menu"
      >
        <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <div className="flex items-center gap-2">
        {/* Logo: gambar langsung, bingkai transparan (tanpa kotak putih) */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
          <img
            src="/logo.png"
            alt="NECO"
            className="w-full h-full object-contain scale-100"
          />
        </div>

        {/* Teks brand. Saat sejajar dengan pencarian, disembunyikan di layar kecil */}
        <span
          className={`font-extrabold text-lg sm:text-xl tracking-tight text-white ${
            compact ? "hidden sm:inline" : ""
          }`}
        >
          NECO<span className="text-emerald-200">.</span>
        </span>
      </div>
    </div>
  );
}

// ---------- Sub-komponen: Tombol Masuk / Avatar + dropdown profil ----------

interface ProfileMenuProps {
  userProfile: UserProfile | null;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

function ProfileMenu({
  userProfile,
  isOpen,
  onToggle,
  onLogout,
}: ProfileMenuProps) {
  if (!userProfile) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 font-bold text-xs sm:text-sm rounded-xl transition-colors"
      >
        <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span>Masuk</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 p-0.5 rounded-full border-2 border-white hover:opacity-90 transition-opacity focus:outline-hidden"
        aria-label="Menu Profil"
      >
        {userProfile.avatar_url ? (
          <img
            src={userProfile.avatar_url}
            alt={userProfile.full_name || "Profil"}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
            {(userProfile.full_name || "U").substring(0, 2).toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown Menu Profile */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs space-y-1">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="font-bold text-slate-900 truncate">
              {userProfile.full_name || "User"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {userProfile.email}
            </p>
          </div>
          <Link
            href="/mystore"
            className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-slate-500" />
            Toko Saya
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Komponen utama ----------
// Mengembalikan fragment agar tiap bagian yang sticky berada langsung di dalam
// container halaman (sticky hanya bekerja dalam batas parent-nya).

export default function Header({
  userProfile,
  onOpenMenu,
  onLogout,
  searchInput,
  onSearchInputChange,
  onSearch,
}: HeaderProps) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  // true = kotak pencarian sudah naik dan sejajar dengan baris atas
  const [isDocked, setIsDocked] = useState(false);
  // Latar slot pencarian: posisinya menandai kapan pencarian mulai menyatu ke baris atas
  const searchSlotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const el = searchSlotRef.current;
      if (!el) return;
      setIsDocked(el.getBoundingClientRect().top <= BAR_HEIGHT);
    };

    update(); // cek posisi awal (mis. halaman dipulihkan di tengah)
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const handleLogoutClick = () => {
    setIsProfileDropdownOpen(false);
    onLogout();
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch();
  };

  const noop = () => {};

  // Gaya kotak pencarian: besar di hero, ramping saat sejajar dengan baris atas
  const inputClass = isDocked
    ? "h-10 text-sm pl-9 pr-11 sm:pr-20 rounded-xl shadow-none"
    : "h-11 text-sm sm:text-base pl-11 sm:pl-12 pr-12 sm:pr-28 rounded-2xl shadow-md";
  const searchIconClass = isDocked
    ? "left-3 w-4 h-4"
    : "left-4 w-4 h-4 sm:w-5 sm:h-5";
  const buttonClass = isDocked
    ? "right-1 top-1 bottom-1 px-2.5 sm:px-4"
    : "right-1.5 top-1.5 bottom-1.5 px-3 sm:px-6";

  return (
    <>
      {/* 1. Baris atas (menempel): menu, logo, akun.
          z-40 agar dropdown profil tampil di atas bar kategori */}
      <div className={`sticky top-0 z-40 h-14 w-full ${GRADIENT}`}>
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3">
          <LeftCluster compact={isDocked} onOpenMenu={onOpenMenu} />

          <div className="shrink-0">
            <ProfileMenu
              userProfile={userProfile}
              isOpen={isProfileDropdownOpen}
              onToggle={() => setIsProfileDropdownOpen((prev) => !prev)}
              onLogout={handleLogoutClick}
            />
          </div>
        </div>
      </div>

      {/* 2. Teks sambutan: satu-satunya bagian yang ikut tergulung hilang */}
      <div className={`w-full ${GRADIENT}`}>
        <div className="max-w-2xl mx-auto text-center px-4 sm:px-6 pt-2 sm:pt-6 pb-3 sm:pb-5">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Cari toko favoritmu
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-emerald-50">
            Temukan toko terdekat dan pesan langsung.
          </p>
        </div>
      </div>

      {/* 3. Latar slot pencarian (ikut tergulung bersama hero) */}
      <div
        ref={searchSlotRef}
        className={`h-14 w-full ${GRADIENT}`}
        aria-hidden="true"
      />

      {/* 4. Kotak pencarian (menempel).
          Menumpuk tepat di atas slot di atas lewat -mt-14.
          Tata letak memakai grid 3 kolom [1fr | pencarian | 1fr]: kedua kolom
          samping selalu sama lebar, sehingga kotak pencarian benar-benar berada
          di tengah halaman (bukan sekadar di tengah sisa ruang di antara menu
          dan profil yang lebarnya berbeda). Kolom samping tidak bisa lebih
          sempit dari isi "bayangan"-nya, jadi pencarian tidak menimpa menu/profil. */}
      <div className="sticky top-0 z-[41] -mt-14 h-14 w-full pointer-events-none">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 grid grid-cols-[1fr_minmax(0,42rem)_1fr] items-center">
          {/* Bayangan kiri (hanya menyisakan ruang saat menempel) */}
          <div
            aria-hidden="true"
            className={
              isDocked
                ? "invisible col-start-1 row-start-1 justify-self-start pr-2 sm:pr-3"
                : "hidden"
            }
          >
            <LeftCluster compact onOpenMenu={noop} />
          </div>

          {/* Kotak pencarian: selalu di kolom tengah */}
          <div className="pointer-events-auto relative col-start-2 row-start-1 w-full min-w-0">
            <Search
              className={`${searchIconClass} text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none`}
            />
            <input
              type="text"
              placeholder="Cari nama toko..."
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={handleEnter}
              className={`w-full bg-white text-slate-800 border-2 border-transparent focus:border-emerald-300 focus:outline-hidden placeholder:text-slate-400 transition-colors ${inputClass}`}
              aria-label="Cari nama toko"
            />
            <button
              type="button"
              onClick={onSearch}
              aria-label="Cari"
              className={`absolute bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${buttonClass}`}
            >
              <Search className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Cari</span>
            </button>
          </div>

          {/* Bayangan kanan (hanya menyisakan ruang saat menempel) */}
          <div
            aria-hidden="true"
            className={
              isDocked
                ? "invisible col-start-3 row-start-1 justify-self-end pl-2 sm:pl-3"
                : "hidden"
            }
          >
            <ProfileMenu
              userProfile={userProfile}
              isOpen={false}
              onToggle={noop}
              onLogout={noop}
            />
          </div>
        </div>
      </div>

      {/* 5. Ruang napas di bawah pencarian (tergulung bersama hero) */}
      <div className={`h-4 sm:h-8 w-full ${GRADIENT}`} aria-hidden="true" />
    </>
  );
}