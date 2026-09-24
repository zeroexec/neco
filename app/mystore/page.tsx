"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Store,
  MapPin,
  Star,
  ChevronRight,
  Package,
  Settings,
  X,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

interface MyShop {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  productsCount: number;
  isOpen: boolean;
  avatar: string;
}

const INITIAL_MY_SHOPS: MyShop[] = [
  {
    id: "1",
    name: "Kopi Kenangan Senja Rungkut",
    category: "Kopi & Minuman",
    location: "Rungkut, Surabaya",
    rating: 4.8,
    productsCount: 24,
    isOpen: true,
    avatar:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "2",
    name: "Matcha & Pastry Hub",
    category: "Snack & Dessert",
    location: "Mulyorejo, Surabaya",
    rating: 4.9,
    productsCount: 12,
    isOpen: true,
    avatar:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80",
  },
];

export default function MyStoresPage() {
  const [shops, setShops] = useState<MyShop[]>(INITIAL_MY_SHOPS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreCategory, setNewStoreCategory] = useState("Kopi & Minuman");
  const [newStoreLocation, setNewStoreLocation] = useState("");

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreLocation) return;

    const createdStore: MyShop = {
      id: Date.now().toString(),
      name: newStoreName,
      category: newStoreCategory,
      location: newStoreLocation,
      rating: 0.0,
      productsCount: 0,
      isOpen: true,
      avatar:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80",
    };

    setShops([createdStore, ...shops]);
    setNewStoreName("");
    setNewStoreLocation("");
    setIsModalOpen(false);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans antialiased">
      {/* 
        1. HEADER UTAMA (Full Width Sticky Header)
        Ditaruh di tingkat teratas agar memanjang sempurna di layar desktop tanpa terkena pangkas/negative margin.
      */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Sisi Kiri: Back Button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-xl text-slate-900 leading-tight truncate">
                Toko Saya
              </h1>
              <p className="text-xs text-slate-500 truncate hidden xs:block">
                Kelola usaha dan daftar produk Anda
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm py-2.5 px-3.5 sm:px-5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Buat Toko Baru</span>
              <span className="sm:hidden">Toko Baru</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. KONTEN UTAMA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <main className="space-y-6">
          {/* Banner CTA Buka Toko */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700 text-white rounded-2xl md:rounded-3xl p-5 sm:p-7 md:p-8 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Mitra UMKM NECO</span>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold leading-snug">
                  Ingin Menjangkau Lebih Banyak Pelanggan?
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                  Buka toko baru Anda secara gratis dan mulai memasarkan produk
                  lokal ke ribuan pembeli di sekitar Anda.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full md:w-auto shrink-0 bg-white hover:bg-emerald-50 active:bg-slate-100 text-emerald-700 font-bold text-xs sm:text-sm py-3 px-6 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Toko Baru</span>
              </button>
            </div>
          </div>

          {/* Header Section List */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-600 uppercase tracking-wider">
              Daftar Toko Anda ({shops.length})
            </h3>
          </div>

          {/* List Toko (Grid Responsif) */}
          {shops.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center text-slate-500 border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-3">
                <Store className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-bold text-base text-slate-800">
                Belum Memiliki Toko
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
                Anda belum mendaftarkan toko apapun saat ini. Mulai jualan
                sekarang!
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-xl inline-flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Toko Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <img
                        src={shop.avatar}
                        alt={shop.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-1">
                            {shop.name}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                              shop.isOpen
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {shop.isOpen ? "Aktif" : "Tutup"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {shop.category}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{shop.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Mini */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100/80 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200/60 shrink-0">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            Total Produk
                          </p>
                          <p className="font-bold text-slate-700 truncate">
                            {shop.productsCount} Produk
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200/60 shrink-0">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            Rating Toko
                          </p>
                          <p className="font-bold text-slate-700 truncate">
                            {shop.rating > 0 ? shop.rating : "Baru"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/mystore/${shop.id}/dashboard`}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>Masuk Toko</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/mystore/${shop.id}/dashboard/settings`}
                      className="p-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl active:bg-slate-100 transition-colors flex items-center justify-center"
                      aria-label="Pengaturan Toko"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal / Bottom Sheet Dialog Form Buat Toko Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-all">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Grab Handle untuk Mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Buat Toko Baru
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Toko
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kedai Kopi Mantap"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Kategori Utama
                </label>
                <select
                  value={newStoreCategory}
                  onChange={(e) => setNewStoreCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="Kopi & Minuman">Kopi & Minuman</option>
                  <option value="Makanan Berat">Makanan Berat</option>
                  <option value="Snack & Dessert">Snack & Dessert</option>
                  <option value="Pakaian">Pakaian</option>
                  <option value="Kecantikan">Kecantikan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Lokasi / Alamat Toko
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gubeng, Surabaya"
                  value={newStoreLocation}
                  onChange={(e) => setNewStoreLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 bg-slate-100 text-slate-600 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Simpan Toko
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}