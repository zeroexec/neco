"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Search,
  MapPin,
  Star,
  Store,
  ChevronRight,
  Heart,
  MessageCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Menu,
  X,
  Home,
  User,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  Loader2,
} from "lucide-react";

// Interface sesuai tabel shops & profiles di Supabase
interface ShopItem {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  is_open: boolean;
  avatar_url: string | null;
  address_detail: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const CATEGORIES = [
  "Semua",
  "Kopi & Minuman",
  "Makanan Berat",
  "Snack & Dessert",
  "Pakaian",
  "Kecantikan",
];

export default function NecoMobileDirectory() {
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // State Data Real dari Supabase
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
          .single();

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
          .single();

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

  // 2. Fetch Data Toko Real dari Tabel `shops` Supabase
  useEffect(() => {
    const fetchShops = async () => {
      setIsLoadingShops(true);
      const { data, error } = await supabase
        .from("shops")
        .select(
          "id, name, category, location, rating, is_open, avatar_url, address_detail, created_at"
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        setShops(data);
      }
      setIsLoadingShops(false);
    };

    fetchShops();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setIsProfileDropdownOpen(false);
    setIsMenuOpen(false);
  };

  const filteredShops = shops.filter((shop) => {
    const matchesCategory =
      selectedCategory === "Semua" || shop.category === selectedCategory;
    const matchesSearch = shop.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans relative">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Header Top */}
          <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-3 shrink-0">
              {/* Tombol Menu Hamburger */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Buka Menu"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-xl text-white">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  NECO<span className="text-emerald-600">.</span>
                </span>
              </div>
            </div>

            {/* Hidden Input Search for Large Screens */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari toko atau menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 text-slate-800 text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full min-w-0">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="font-medium truncate max-w-[120px] sm:max-w-[180px]">
                  Surabaya
                </span>
              </div>

              {/* Area Auth: Tombol Login atau Bulatan Profile */}
              {userProfile ? (
                <div className="relative">
                  <button
                    onClick={() =>
                      setIsProfileDropdownOpen(!isProfileDropdownOpen)
                    }
                    className="flex items-center gap-2 p-0.5 rounded-full border-2 border-emerald-600 hover:opacity-90 transition-opacity focus:outline-hidden"
                  >
                    {userProfile.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.full_name || "Profil"}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        {(userProfile.full_name || "U")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Dropdown Menu Profile */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 text-xs space-y-1">
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
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Masuk</span>
                </Link>
              )}
            </div>
          </div>

          {/* Search Box - Mobile Only */}
          <div className="relative flex md:hidden items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Cari toko atau menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 text-slate-800 text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all truncate"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button className="p-2 bg-slate-100 rounded-xl text-slate-600 active:bg-slate-200 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto py-2.5 no-scrollbar w-full">
            {CATEGORIES.map((cat) => (
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
      </header>

      {/* Navigation Drawer Overlay - Tanpa Blur */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-out Menu Side Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-slate-900">
              NECO<span className="text-emerald-600">.</span> Navigation
            </span>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic User Profile Area in Drawer */}
        {userProfile ? (
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
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
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Selamat datang! Silakan masuk untuk mengakses fitur lengkap.
            </p>
            <Link
              href="/auth/login"
              onClick={() => setIsMenuOpen(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Ke Akun</span>
            </Link>
          </div>
        )}

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Beranda
          </button>

          <Link
            href="/mystore"
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Store className="w-4 h-4 text-slate-500" />
            Toko Saya
          </Link>

          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Heart className="w-4 h-4 text-slate-500" />
            Favorit Saya
          </button>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <User className="w-4 h-4 text-slate-500" />
            Profil
          </button>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Pengaturan
          </button>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            Bantuan
          </button>
        </nav>

        {userProfile && (
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        )}
      </aside>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-0.5">
          <span>
            Menampilkan <strong>{filteredShops.length} toko</strong>
          </span>
          <span className="text-emerald-600 font-medium">Terdekat</span>
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
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between w-full group"
              >
                <div>
                  {/* Cover Banner */}
                  <div className="relative h-28 sm:h-36 w-full bg-slate-200 overflow-hidden">
                    <img
                      src={
                        shop.avatar_url ||
                        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80"
                      }
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <button
                      onClick={() => toggleFavorite(shop.id)}
                      className="absolute top-2.5 right-2.5 p-2 bg-white rounded-full text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-xs"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites[shop.id]
                            ? "fill-rose-500 text-rose-500"
                            : "text-slate-600"
                        }`}
                      />
                    </button>

                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white px-2.5 py-1 rounded-md shadow-xs">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span
                        className={
                          shop.is_open ? "text-emerald-600" : "text-rose-500"
                        }
                      >
                        {shop.is_open ? "Buka Sekarang" : "Tutup"}
                      </span>
                    </div>
                  </div>

                  {/* Card Detail */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
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

                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/50 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-amber-700">
                          {Number(shop.rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {shop.address_detail || "Alamat belum diatur."}
                    </p>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Link
                      href={`/pos/${shop.id}`}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors min-w-0"
                    >
                      <span className="truncate">Lihat Toko</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                    <button className="p-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}