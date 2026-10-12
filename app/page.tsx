"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "./components/Header";
import KatalogToko from "./components/KatalogToko";
import ShopMenuModal from "./components/ShopMenuModal";
import ShopDetailModal from "./components/ShopDetailModal";
import SidebarDrawer, { UserProfile } from "./components/SidebarDrawer";
import { GREEN_BTN, type ShopItem } from "./components/KatalogToko/katalogShared";
import { getJakartaNow, getShopStatus } from "./components/KatalogToko/shopStatus";
import { Heart, LogIn, X } from "lucide-react";

// Pemberitahuan berupa modal custom (tanpa alert bawaan browser)
interface NoticeState {
  title: string;
  message: string;
  showLogin?: boolean;
}

export default function NecoMobileDirectory() {
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

  // Favorit: kumpulan id toko yang difavoritkan pengguna
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  // Id toko yang sedang diproses (cegah klik ganda)
  const [pendingFavIds, setPendingFavIds] = useState<Set<string>>(new Set());
  // Modal pemberitahuan (belum login / gagal simpan)
  const [notice, setNotice] = useState<NoticeState | null>(null);

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

  // 3. Fetch daftar favorit milik pengguna (tabel shop_favorites)
  const userId = userProfile?.id ?? null;

  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavoriteIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from("shop_favorites")
      .select("shop_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Gagal mengambil favorit:", error.message);
      return;
    }
    setFavoriteIds(new Set((data ?? []).map((r) => r.shop_id as string)));
  }, [userId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Sinkron saat favorit dihapus lewat modal Toko Favorit di sidebar
  useEffect(() => {
    const onChanged = () => fetchFavorites();
    window.addEventListener("neco:favorites-changed", onChanged);
    return () => window.removeEventListener("neco:favorites-changed", onChanged);
  }, [fetchFavorites]);

  // Tambah / hapus favorit (optimistic update)
  const toggleFavorite = async (shop: ShopItem) => {
    if (!userId) {
      setNotice({
        title: "Masuk untuk menyimpan favorit",
        message: "Toko favorit tersimpan di akunmu. Silakan masuk terlebih dahulu.",
        showLogin: true,
      });
      return;
    }
    if (pendingFavIds.has(shop.id)) return;

    const wasFavorite = favoriteIds.has(shop.id);

    setPendingFavIds((prev) => new Set(prev).add(shop.id));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(shop.id);
      else next.add(shop.id);
      return next;
    });

    const { error } = wasFavorite
      ? await supabase
          .from("shop_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("shop_id", shop.id)
      : await supabase.from("shop_favorites").insert({ user_id: userId, shop_id: shop.id });

    if (error) {
      console.error("Gagal memperbarui favorit:", error.message);
      // Kembalikan ke kondisi semula
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(shop.id);
        else next.delete(shop.id);
        return next;
      });
      setNotice({
        title: "Gagal memperbarui favorit",
        message: "Terjadi kesalahan saat menyimpan. Coba lagi nanti.",
      });
    }

    setPendingFavIds((prev) => {
      const next = new Set(prev);
      next.delete(shop.id);
      return next;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setIsMenuOpen(false);
  };

  // Pencarian hanya dijalankan lewat tombol "Cari" / Enter
  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

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

      {/* Katalog toko (komponen terpisah): bar kategori + daftar kartu toko */}
      <KatalogToko
        shops={shops}
        isLoading={isLoadingShops}
        now={now}
        searchQuery={searchQuery}
        favoriteIds={favoriteIds}
        pendingFavIds={pendingFavIds}
        onToggleFavorite={toggleFavorite}
        onViewShop={setDetailShop}
        onOpenMenu={setMenuShop}
      />

      {/* Sidebar (komponen terpisah) */}
      <SidebarDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userProfile={userProfile}
        onLogout={handleLogout}
      />

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

      {/* Modal Pemberitahuan (belum login / gagal simpan favorit) */}
      {notice && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setNotice(null)}
          role="dialog"
          aria-modal="true"
          aria-label={notice.title}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Tutup"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="mt-3 font-bold text-base text-slate-900">{notice.title}</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{notice.message}</p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {notice.showLogin ? "Nanti Saja" : "Tutup"}
              </button>
              {notice.showLogin && (
                <Link
                  href="/auth/login"
                  className={`flex-1 py-2.5 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 ${GREEN_BTN}`}
                >
                  <LogIn className="w-4 h-4" />
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}