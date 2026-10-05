"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Header from "./components/Header";
import ShopMenuModal from "./components/ShopMenuModal";
import ShopDetailModal from "./components/ShopDetailModal";
import SidebarDrawer, { UserProfile } from "./components/SidebarDrawer";
import {
  Store,
  ChevronRight,
  UtensilsCrossed,
  Clock,
  Loader2,
} from "lucide-react";

// Jam operasional per hari (tabel shop_operating_hours)
// day_of_week: 0 = Minggu, 1 = Senin, ... 6 = Sabtu
interface OperatingHour {
  day_of_week: number;
  open_time: string | null; // "HH:mm:ss"
  close_time: string | null; // "HH:mm:ss"
  is_closed: boolean;
}

// Interface sesuai tabel shops di Supabase
interface ShopItem {
  id: string;
  name: string;
  category: string;
  location: string;
  is_open: boolean;
  avatar_url: string | null; // logo toko
  cover_url: string | null; // sepanduk toko
  address_detail: string | null;
  created_at: string;
  shop_operating_hours: OperatingHour[] | null;
}

// ---------- Helper: waktu & status buka ----------

const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Ambil hari & menit sekarang berdasarkan zona waktu Asia/Jakarta (WIB)
function getJakartaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return { dow: WEEKDAY_TO_DOW[weekday] ?? 0, minutes: hour * 60 + minute };
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
};

const toHHmm = (time: string) => time.slice(0, 5);

interface ShopStatus {
  label: string;
  isOpenNow: boolean;
  todayHours: string | null; // contoh: "08:00–22:00"
}

function getShopStatus(
  shop: ShopItem,
  now: { dow: number; minutes: number }
): ShopStatus {
  const today = shop.shop_operating_hours?.find(
    (h) => h.day_of_week === now.dow
  );

  const hasHours =
    !!today && !today.is_closed && !!today.open_time && !!today.close_time;
  const todayHours = hasHours
    ? `${toHHmm(today!.open_time!)}–${toHHmm(today!.close_time!)}`
    : null;

  // Pemilik menutup toko secara manual lewat toggle is_open
  if (!shop.is_open) {
    return { label: "Tutup Sementara", isOpenNow: false, todayHours };
  }

  // Belum ada jadwal untuk hari ini: ikuti status is_open
  if (!today) {
    return { label: "Buka Sekarang", isOpenNow: true, todayHours: null };
  }

  // Libur di hari ini
  if (!hasHours) {
    return { label: "Libur Hari Ini", isOpenNow: false, todayHours: null };
  }

  const openAt = toMinutes(today!.open_time!);
  const closeAt = toMinutes(today!.close_time!);

  if (now.minutes < openAt) {
    return {
      label: `Buka pukul ${toHHmm(today!.open_time!)}`,
      isOpenNow: false,
      todayHours,
    };
  }
  if (now.minutes >= closeAt) {
    return { label: "Tutup", isOpenNow: false, todayHours };
  }
  return { label: "Buka Sekarang", isOpenNow: true, todayHours };
}

export default function NecoMobileDirectory() {
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  // Teks yang sedang diketik di kotak input (belum memfilter)
  const [searchInput, setSearchInput] = useState("");
  // Kata kunci yang sudah dikonfirmasi lewat tombol Cari (dipakai untuk filter)
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // State Data Real dari Supabase
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Toko yang sedang dibuka menunya di modal
  const [menuShop, setMenuShop] = useState<ShopItem | null>(null);
  // Toko yang sedang dilihat detailnya di modal
  const [detailShop, setDetailShop] = useState<ShopItem | null>(null);

  // Waktu sekarang (WIB), diperbarui tiap menit untuk status Buka/Tutup
  const [now, setNow] = useState(getJakartaNow());

  useEffect(() => {
    const interval = setInterval(() => setNow(getJakartaNow()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // 1. Fetch Session & Profile User dari Supabase
  useEffect(() => {
    const fetchUserSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          setUserProfile(profile);
        } else {
          // Fallback dari Auth metadata jika profiles belum rampung
          setUserProfile({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || "Pengguna",
            email: session.user.email || null,
            avatar_url: session.user.user_metadata?.avatar_url || null,
          });
        }
      }
    };

    fetchUserSession();

    // Listen Perubahan Auth State (Login/Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();

        setUserProfile(
          profile || {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || "Pengguna",
            email: session.user.email || null,
            avatar_url: session.user.user_metadata?.avatar_url || null,
          }
        );
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch Data Toko + Jam Operasional dari Supabase
  useEffect(() => {
    const fetchShops = async () => {
      setIsLoadingShops(true);
      const { data, error } = await supabase
        .from("shops")
        .select(
          `id, name, category, location, is_open, avatar_url, cover_url, address_detail, created_at,
           shop_operating_hours ( day_of_week, open_time, close_time, is_closed )`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil daftar toko:", error.message);
      } else if (data) {
        setShops(data as ShopItem[]);
      }
      setIsLoadingShops(false);
    };

    fetchShops();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setIsMenuOpen(false);
  };

  // Pencarian hanya dijalankan lewat tombol "Cari" / Enter
  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  // Daftar kategori diambil dari kolom shops.category
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(shops.map((s) => s.category).filter(Boolean))
    ).sort();
    return ["Semua", ...unique];
  }, [shops]);

  const filteredShops = shops.filter((shop) => {
    const matchesCategory =
      selectedCategory === "Semua" || shop.category === selectedCategory;
    const matchesSearch = shop.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Status toko yang sedang dibuka di modal detail
  const detailStatus = detailShop ? getShopStatus(detailShop, now) : null;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans relative">
      {/* Header (komponen terpisah): baris atas menempel; pencarian naik dan
          sejajar dengan baris atas saat di-scroll; teks sambutan tergulung hilang */}
<Header
  userProfile={userProfile}
  onOpenMenu={() => setIsMenuOpen(true)}
  onLogout={handleLogout}
  searchInput={searchInput}
  onSearchInputChange={setSearchInput}
  onSearch={handleSearch}

/>
      {/* Categories Bar (dari kolom shops.category).
          top-14 = tinggi baris atas di Header (56px). Ubah jika tinggi itu diubah. */}
      <div className="sticky top-14 z-20 bg-white border-b border-slate-200 shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto py-2.5 no-scrollbar w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar (komponen terpisah) */}
      <SidebarDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userProfile={userProfile}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        <div className="flex items-center text-xs sm:text-sm text-slate-500 px-0.5">
          <span>
            Menampilkan <strong>{filteredShops.length} toko</strong>
            {searchQuery && (
              <>
                {" "}untuk &ldquo;<strong>{searchQuery}</strong>&rdquo;
              </>
            )}
          </span>
        </div>

        {/* Loading Indicator */}
        {isLoadingShops ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs font-medium text-slate-600">
              Memuat daftar toko...
            </p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base text-slate-700">
              Toko tidak ditemukan
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Belum ada toko yang terdaftar atau coba gunakan kata kunci pencarian lain.
            </p>
          </div>
        ) : (
          /* Grid Card Responsive */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredShops.map((shop) => {
              const status = getShopStatus(shop, now);

              return (
                <div
                  key={shop.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between w-full group"
                >
                  <div>
                    {/* Sepanduk toko (cover_url) */}
                    <div className="relative h-28 sm:h-36 w-full bg-slate-200 overflow-hidden">
                      {shop.cover_url ? (
                        <img
                          src={shop.cover_url}
                          alt={`Sepanduk ${shop.name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                          <Store className="w-10 h-10 text-emerald-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white px-2.5 py-1 rounded-md shadow-xs">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span
                          className={
                            status.isOpenNow
                              ? "text-emerald-600"
                              : "text-rose-500"
                          }
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Card Detail */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Logo toko (avatar_url) */}
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                            {shop.avatar_url ? (
                              <img
                                src={shop.avatar_url}
                                alt={shop.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              shop.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-slate-900 text-sm leading-snug truncate group-hover:text-emerald-600 transition-colors">
                              {shop.name}
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                              {shop.category} • {shop.location}
                            </p>
                          </div>
                        </div>

                        {/* Jam operasional hari ini */}
                        {status.todayHours && (
                          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className="text-[11px] font-semibold text-slate-600">
                              {status.todayHours}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {shop.address_detail || "Alamat belum diatur."}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="p-4 pt-0">
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setDetailShop(shop)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors min-w-0 cursor-pointer"
                      >
                        <span className="truncate">Lihat Toko</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMenuShop(shop)}
                        className="flex-1 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors min-w-0 cursor-pointer"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Menu & Pesan</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Detail Toko */}
      <ShopDetailModal
        isOpen={!!detailShop}
        onClose={() => setDetailShop(null)}
        shopId={detailShop?.id ?? null}
        statusLabel={detailStatus?.label ?? ""}
        isOpenNow={detailStatus?.isOpenNow ?? false}
        todayDow={now.dow}
        onOpenMenu={() => {
          // Tutup detail, lalu buka menu toko yang sama
          const target = detailShop;
          setDetailShop(null);
          setMenuShop(target);
        }}
      />

      {/* Modal Menu Produk & Pemesanan */}
      <ShopMenuModal
        isOpen={!!menuShop}
        onClose={() => setMenuShop(null)}
        shopId={menuShop?.id ?? null}
        shopName={menuShop?.name ?? ""}
        canOrder={menuShop ? getShopStatus(menuShop, now).isOpenNow : false}
      />
    </div>
  );
}