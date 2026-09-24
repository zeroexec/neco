"use client";

import React, { useState } from "react";
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
} from "lucide-react";

const CATEGORIES = [
  "Semua",
  "Kopi & Minuman",
  "Makanan Berat",
  "Snack & Dessert",
  "Pakaian",
  "Kecantikan",
];

const SHOPS = [
  {
    id: "1",
    name: "Kopi Kenangan Senja Rungkut Madya Surabaya",
    category: "Kopi & Minuman",
    location: "Rungkut, Surabaya",
    distance: "0.8 km",
    rating: 4.8,
    reviews: 2400,
    isOpen: true,
    isOfficial: true,
    cover:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&auto=format&fit=crop&q=80",
    description: "Nikmati aneka varian kopi susu kekinian dan camilan lezat.",
    featuredProducts: ["Kopi Kenangan Mantan", "Butter Croissant"],
  },
  {
    id: "2",
    name: "Ayam Geprek Sambal Korek Super Pedas Pak Boss",
    category: "Makanan Berat",
    location: "Wonocolo, Surabaya",
    distance: "1.2 km",
    rating: 4.9,
    reviews: 10200,
    isOpen: true,
    isOfficial: true,
    cover:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=150&auto=format&fit=crop&q=80",
    description:
      "Ayam geprek crispy dengan pilihan level pedas sambal korek asli.",
    featuredProducts: ["Paket Geprek Hemat", "Kulit Crispy"],
  },
  {
    id: "3",
    name: "Matcha & Pastry Hub",
    category: "Snack & Dessert",
    location: "Mulyorejo, Surabaya",
    distance: "2.1 km",
    rating: 4.9,
    reviews: 1500,
    isOpen: true,
    isOfficial: true,
    cover:
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&auto=format&fit=crop&q=80",
    description: "Spesialis matcha impor Jepang dan aneka dessert artisan.",
    featuredProducts: ["Uji Matcha Latte", "Matcha Choux"],
  },
  {
    id: "4",
    name: "Boutique Hijab Elegance",
    category: "Pakaian",
    location: "Gubeng, Surabaya",
    distance: "3.5 km",
    rating: 4.7,
    reviews: 850,
    isOpen: false,
    isOfficial: false,
    cover:
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=500&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=150&auto=format&fit=crop&q=80",
    description:
      "Menyediakan busana muslimah, pashmina, dan pashmina instan berkualitas.",
    featuredProducts: ["Pashmina Silk", "Gamis Casual"],
  },
];

export default function NecoMobileDirectory() {
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredShops = SHOPS.filter((shop) => {
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
          <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4">
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

            {/* Hidden Input Search & Location for Large Screens */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari toko atau menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 text-slate-800 text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full min-w-0">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span className="font-medium truncate max-w-[120px] sm:max-w-[180px]">
                Rungkut, Surabaya
              </span>
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
                className="w-full bg-slate-100 text-slate-800 text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all truncate"
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

      {/* Navigation Drawer Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity"
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

        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            JD
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">John Doe</p>
            <p className="text-xs text-slate-500">john.doe@example.com</p>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Beranda
          </button>

          {/* Diperbarui dari /toko-saya menjadi /mystore */}
          <a
            href="/mystore"
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Store className="w-4 h-4 text-slate-500" />
            Toko Saya
          </a>

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

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-0.5">
          <span>
            Menampilkan <strong>{filteredShops.length} toko</strong>
          </span>
          <span className="text-emerald-600 font-medium">Terdekat</span>
        </div>

        {filteredShops.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base text-slate-700">
              Toko tidak ditemukan
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Coba gunakan kata kunci pencarian lain.
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
                      src={shop.cover}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <button
                      onClick={() => toggleFavorite(shop.id)}
                      className="absolute top-2.5 right-2.5 p-2 bg-white/80 backdrop-blur-xs rounded-full text-slate-600 hover:bg-white active:scale-95 transition-all"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites[shop.id]
                            ? "fill-rose-500 text-rose-500"
                            : "text-slate-600"
                        }`}
                      />
                    </button>

                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span
                        className={
                          shop.isOpen ? "text-emerald-600" : "text-rose-500"
                        }
                      >
                        {shop.isOpen ? "Buka Sekarang" : "Tutup"}
                      </span>
                    </div>
                  </div>

                  {/* Card Detail */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={shop.avatar}
                          alt={shop.name}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h2 className="font-bold text-slate-900 text-sm leading-snug truncate group-hover:text-emerald-600 transition-colors">
                            {shop.name}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                            {shop.category} • {shop.distance}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/50 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-amber-700">
                          {shop.rating}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {shop.description}
                    </p>

                    {/* Menu Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 w-full">
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        Menu:
                      </span>
                      {shop.featuredProducts.map((prod, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] sm:text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md shrink-0 border border-slate-200/60"
                        >
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors min-w-0">
                      <span className="truncate">Lihat Toko</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
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