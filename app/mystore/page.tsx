"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Loader2,
  AlertCircle,
} from "lucide-react";

// Interface untuk toko
interface MyShop {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  location: string;
  address_detail: string | null;
  avatar_url: string | null;
  is_open: boolean;
  rating: number;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

// Interface untuk kategori dari Supabase
interface Category {
  id: string;
  name: string;
  slug?: string;
}

export default function MyStoresPage() {
  const router = useRouter();
  const [shops, setShops] = useState<MyShop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreCategory, setNewStoreCategory] = useState("");
  const [customCategory, setCustomCategory] = useState(""); // State untuk kategori kustom jika memilih "Lainnya"
  const [newStoreLocation, setNewStoreLocation] = useState("");
  const [newStoreAddressDetail, setNewStoreAddressDetail] = useState("");

  // 1. Fetch Kategori dari Supabase
  const fetchCategories = async () => {
    setIsCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data);
        setNewStoreCategory(data[0].name); // Default ke kategori pertama
      } else {
        setNewStoreCategory("Lainnya");
      }
    } catch (err: any) {
      console.error("Gagal mengambil data kategori:", err.message);
      setNewStoreCategory("Lainnya");
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  // 2. Fetch Toko Milik User dari Supabase
  const fetchMyShops = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setShops(data || []);
    } catch (err: any) {
      console.error("Gagal mengambil data toko:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyShops();
    fetchCategories();
  }, []);

  // 3. Simpan Toko Baru ke Supabase sesuai Skema
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();

    // Tentukan kategori yang akan disimpan
    const finalCategory =
      newStoreCategory === "Lainnya"
        ? customCategory.trim() || "Lainnya"
        : newStoreCategory;

    if (!newStoreName || !newStoreLocation || !finalCategory) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth/login");
        return;
      }

      const defaultAvatar =
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80";

      const { data, error } = await supabase
        .from("shops")
        .insert([
          {
            owner_id: session.user.id,
            name: newStoreName,
            category: finalCategory,
            location: newStoreLocation,
            address_detail: newStoreAddressDetail.trim() || null,
            avatar_url: defaultAvatar,
            is_open: true,
            rating: 0.0,
          },
        ])
        .select();

      if (error) throw error;

      if (data) {
        setShops((prev) => [data[0], ...prev]);
        setNewStoreName("");
        setNewStoreLocation("");
        setNewStoreAddressDetail("");
        setCustomCategory("");
        if (categories.length > 0) {
          setNewStoreCategory(categories[0].name);
        } else {
          setNewStoreCategory("Lainnya");
        }
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat toko baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans antialiased">
      {/* HEADER UTAMA */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
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

      {/* KONTEN UTAMA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <main className="space-y-6">
          {/* Banner CTA */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700 text-white rounded-2xl md:rounded-3xl p-5 sm:p-7 md:p-8 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
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

          <div className="flex items-center justify-between pt-2">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-600 uppercase tracking-wider">
              Daftar Toko Anda ({shops.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-medium text-slate-600">
                Memuat toko Anda...
              </p>
            </div>
          ) : shops.length === 0 ? (
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
                        src={
                          shop.avatar_url ||
                          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80"
                        }
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
                              shop.is_open
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {shop.is_open ? "Aktif" : "Tutup"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {shop.category}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{shop.location}</span>
                        </div>
                        {shop.address_detail && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 pl-4.5">
                            {shop.address_detail}
                          </p>
                        )}
                      </div>
                    </div>

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
                            {shop.products_count ?? 0} Produk
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
                            {shop.rating > 0
                              ? Number(shop.rating).toFixed(1)
                              : "Baru"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

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

      {/* Modal / Bottom Sheet Form Buat Toko Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 transition-all">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar">
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
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Toko *
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

              {/* KATEGORI UTAMA (DINAMIS DARI SUPABASE + OPSI LAINNYA) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Kategori Utama *
                </label>
                {isCategoriesLoading ? (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Memuat daftar kategori...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={newStoreCategory}
                      onChange={(e) => setNewStoreCategory(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      {/* Opsi Statis Tambahan */}
                      <option value="Lainnya">Lainnya</option>
                    </select>

                    {/* Input tambahan jika pengguna memilih "Lainnya" */}
                    {newStoreCategory === "Lainnya" && (
                      <input
                        type="text"
                        placeholder="Sebutkan kategori toko Anda (opsional)"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Kota / Wilayah *
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

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Detail Alamat (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Raya Raya No. 12, Lantai 2"
                  value={newStoreAddressDetail}
                  onChange={(e) => setNewStoreAddressDetail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrorMessage(null);
                  }}
                  className="w-1/2 bg-slate-100 text-slate-600 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCategoriesLoading}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Toko</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}