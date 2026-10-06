"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ShopMenuModal from "./ShopMenuModal";
import ShopDetailModal from "./ShopDetailModal";
import {
  Heart,
  Store,
  X,
  Loader2,
  ChevronDown,
  LogIn,
  Search,
  Clock,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react";

// ---------- Tipe data ----------

// Jam operasional per hari (tabel shop_operating_hours)
interface OperatingHour {
  day_of_week: number; // 0 = Minggu ... 6 = Sabtu
  open_time: string | null; // "HH:mm:ss"
  close_time: string | null; // "HH:mm:ss"
  is_closed: boolean;
}

interface FavoriteShop {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  avatar_url: string | null;
  is_open: boolean;
  shop_operating_hours: OperatingHour[] | null;
}

interface FavoriteShopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // null jika pengguna belum login
  userId: string | null;
}

// ---------- Helper: waktu & status buka (sama dengan beranda) ----------

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
  shop: FavoriteShop,
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

// ---------- Komponen ----------

export default function FavoriteShopsModal({
  isOpen,
  onClose,
  userId,
}: FavoriteShopsModalProps) {
  const [shops, setShops] = useState<FavoriteShop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Pencarian & dropdown
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal turunan (sama seperti di beranda)
  const [detailShop, setDetailShop] = useState<FavoriteShop | null>(null);
  const [menuShop, setMenuShop] = useState<FavoriteShop | null>(null);

  // Waktu sekarang (WIB) untuk status Buka/Tutup
  const [now, setNow] = useState(getJakartaNow());

  const isChildOpen = !!detailShop || !!menuShop;

  const fetchFavorites = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("shop_favorites")
      .select(
        `shop_id, created_at,
         shops ( id, name, category, location, avatar_url, is_open,
                 shop_operating_hours ( day_of_week, open_time, close_time, is_closed ) )`
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil toko favorit:", error.message);
      setErrorMsg("Gagal memuat toko favorit. Coba lagi nanti.");
      setShops([]);
    } else {
      const rows = (data ?? []) as unknown as {
        shops: FavoriteShop | FavoriteShop[] | null;
      }[];
      const list = rows
        .map((r) => (Array.isArray(r.shops) ? r.shops[0] : r.shops))
        .filter((s): s is FavoriteShop => !!s);
      setShops(list);
    }
    setIsLoading(false);
  }, [userId]);

  // Setiap kali modal dibuka: reset pencarian/dropdown, ambil data terbaru
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setExpandedId(null);
      setNow(getJakartaNow());
      fetchFavorites();
    } else {
      setDetailShop(null);
      setMenuShop(null);
    }
  }, [isOpen, fetchFavorites]);

  // Perbarui waktu tiap menit selama modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(getJakartaNow()), 60_000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Tutup dengan tombol Escape (hanya jika tidak ada modal turunan yang terbuka)
  useEffect(() => {
    if (!isOpen || isChildOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isChildOpen, onClose]);

  const handleRemove = async (shopId: string) => {
    if (!userId) return;
    setRemovingId(shopId);

    const { error } = await supabase
      .from("shop_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("shop_id", shopId);

    if (error) {
      console.error("Gagal menghapus favorit:", error.message);
      setErrorMsg("Gagal menghapus dari favorit. Coba lagi.");
    } else {
      setShops((prev) => prev.filter((s) => s.id !== shopId));
      setExpandedId((prev) => (prev === shopId ? null : prev));
      // Beri tahu beranda agar status hati ikut diperbarui
      window.dispatchEvent(new Event("neco:favorites-changed"));
    }
    setRemovingId(null);
  };

  // Filter pencarian: nama, kategori, atau lokasi
  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q) ||
        (s.location ?? "").toLowerCase().includes(q)
    );
  }, [shops, searchQuery]);

  // Status toko yang sedang dibuka di modal detail
  const detailStatus = detailShop ? getShopStatus(detailShop, now) : null;

  if (!isOpen) return null;

  return (
    <>
      {/* Daftar favorit disembunyikan sementara saat modal detail/menu terbuka
          (state tetap tersimpan, muncul lagi setelah modal turunan ditutup) */}
      {!isChildOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-6 overscroll-none"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Toko Favorit"
        >
          {/* Mobile: bottom sheet selebar layar. Desktop: modal di tengah. */}
          <div
            className="w-full sm:max-w-lg lg:max-w-xl max-h-[90dvh] sm:max-h-[min(80dvh,720px)] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar (hanya mobile) */}
            <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
              <span className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-4 sm:px-6 pt-3 sm:pt-6 pb-4 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-rose-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base sm:text-lg text-slate-900 leading-tight truncate">
                    Toko Favorit
                  </h2>
                  {userId && !isLoading && !errorMsg && (
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      {searchQuery.trim()
                        ? `${filteredShops.length} dari ${shops.length} toko`
                        : `${shops.length} toko tersimpan`}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pencarian */}
            {userId && !isLoading && !errorMsg && shops.length > 0 && (
              <div className="px-4 sm:px-6 pb-3 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {/* text-base di mobile (16px) mencegah iOS memperbesar layar saat fokus */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari toko favorit..."
                    className="w-full bg-slate-100 focus:bg-white border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-10 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Hapus pencarian"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Isi (area yang bisa di-scroll) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
              {!userId ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <Heart className="w-12 h-12 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm sm:text-base">
                    Masuk untuk melihat toko favorit
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-64">
                    Toko favorit tersimpan di akunmu dan bisa dibuka dari
                    perangkat mana saja.
                  </p>
                  <Link
                    href="/auth/login"
                    onClick={onClose}
                    className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Masuk Ke Akun
                  </Link>
                </div>
              ) : isLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-xs sm:text-sm font-medium text-slate-600">
                    Memuat toko favorit...
                  </p>
                </div>
              ) : errorMsg ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <p className="text-sm text-rose-600 font-medium">
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={fetchFavorites}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : shops.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2">
                  <Store className="w-12 h-12 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm sm:text-base">
                    Belum ada toko favorit
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-64">
                    Toko yang kamu tandai sebagai favorit akan muncul di sini.
                  </p>
                </div>
              ) : filteredShops.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2">
                  <Search className="w-10 h-10 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm sm:text-base">
                    Toko tidak ditemukan
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-64">
                    Coba kata kunci lain untuk mencari di toko favoritmu.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {filteredShops.map((shop) => {
                    const status = getShopStatus(shop, now);
                    const isExpanded = expandedId === shop.id;

                    return (
                      <li
                        key={shop.id}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                      >
                        {/* Baris toko: klik untuk membuka/menutup dropdown */}
                        <div className="flex items-center gap-1 pr-1.5 sm:pr-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : shop.id)
                            }
                            aria-expanded={isExpanded}
                            className="flex items-center gap-3 min-w-0 flex-1 p-3 sm:p-3.5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
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
                              <p className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                {shop.name}
                              </p>
                              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                                {[shop.category, shop.location]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </p>
                              <p
                                className={`flex items-center gap-1 text-[11px] sm:text-xs font-semibold min-w-0 ${
                                  status.isOpenNow
                                    ? "text-emerald-600"
                                    : "text-rose-500"
                                }`}
                              >
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate">{status.label}</span>
                                {status.todayHours && (
                                  <span className="hidden sm:inline shrink-0 font-medium text-slate-400">
                                    · {status.todayHours}
                                  </span>
                                )}
                              </p>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Area sentuh min. 40px agar mudah ditekan di mobile */}
                          <button
                            type="button"
                            onClick={() => handleRemove(shop.id)}
                            disabled={removingId === shop.id}
                            aria-label={`Hapus ${shop.name} dari favorit`}
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 active:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            {removingId === shop.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart className="w-4 h-4 fill-rose-500" />
                            )}
                          </button>
                        </div>

                        {/* Dropdown: tombol seperti di beranda */}
                        {isExpanded && (
                          <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5">
                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setDetailShop(shop)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors min-w-0 cursor-pointer"
                              >
                                <span className="truncate">Lihat Toko</span>
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setMenuShop(shop)}
                                className="flex-1 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-semibold text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors min-w-0 cursor-pointer"
                              >
                                <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Menu & Pesan</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}