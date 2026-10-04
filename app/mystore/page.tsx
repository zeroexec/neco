"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Plus,
  Store,
  MapPin,
  ChevronRight,
  Settings,
  X,
  Loader2,
  AlertCircle,
  Truck,
  ShoppingBag,
} from "lucide-react";

interface MyShop {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  location: string;
  address_detail: string | null;
  avatar_url: string | null;
  is_open: boolean;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  shop_code: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
}

const OTHER_CATEGORY = "Lainnya";

const fieldClass =
  "w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-50 transition-colors";

const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

export default function MyStoresPage() {
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [shops, setShops] = useState<MyShop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState(OTHER_CATEGORY);
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  // ===== Data =====
  const fetchCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (error) throw error;

      const list = (data as Category[]) || [];
      setCategories(list);
      setCategory(list.length > 0 ? list[0].name : OTHER_CATEGORY);
    } catch (err: unknown) {
      console.error("Gagal mengambil kategori:", err instanceof Error ? err.message : err);
      setCategory(OTHER_CATEGORY);
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  const fetchMyShops = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      if (!uid) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setShops((data as MyShop[]) || []);
    } catch (err: unknown) {
      console.error("Gagal mengambil data toko:", err instanceof Error ? err.message : err);
      setLoadError("Gagal memuat daftar toko. Periksa koneksi Anda lalu coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMyShops();
    fetchCategories();
  }, [fetchMyShops, fetchCategories]);

  // ===== Modal =====
  const resetForm = () => {
    setName("");
    setCustomCategory("");
    setLocation("");
    setAddressDetail("");
    setCategory(categories.length > 0 ? categories[0].name : OTHER_CATEGORY);
    setFormError(null);
  };

  const openModal = () => {
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError(null);
  };

  // Auto focus ke nama toko saat modal dibuka
  useEffect(() => {
    if (isModalOpen) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isModalOpen]);

  // Esc menutup modal
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, isSubmitting]);

  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // ===== Simpan toko =====
  const handleCreateStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalCategory =
      category === OTHER_CATEGORY ? customCategory.trim() || OTHER_CATEGORY : category;
    const cleanName = name.trim();
    const cleanLocation = location.trim();

    if (!cleanName || !cleanLocation || !finalCategory) {
      setFormError("Nama toko, kategori, dan wilayah wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      if (!uid) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("shops")
        .insert({
          owner_id: uid,
          name: cleanName,
          category: finalCategory,
          location: cleanLocation,
          address_detail: addressDetail.trim() || null,
          is_open: true,
        })
        .select()
        .single();

      if (error) throw error;

      setShops((prev) => [data as MyShop, ...prev]);
      resetForm();
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat toko baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== UI =====
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Kembali"
            className="shrink-0 w-9 h-9 -ml-1.5 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
              Toko Saya
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {isLoading ? "Memuat..." : `${shops.length} toko`}
            </p>
          </div>

          <button
            onClick={openModal}
            className="shrink-0 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Toko Baru</span>
          </button>
        </div>
      </header>

      {/* Konten */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-10 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-900">Gagal memuat toko</p>
            <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm mx-auto">{loadError}</p>
            <button
              onClick={fetchMyShops}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : shops.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="w-7 h-7" />
            </div>
            <p className="font-bold text-lg text-slate-900">Belum punya toko</p>
            <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
              Buat toko pertama Anda dan mulai berjualan ke pembeli di sekitar.
            </p>
            <button
              onClick={openModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Toko</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <article
                key={shop.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 flex flex-col gap-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {shop.avatar_url ? (
                    <img
                      src={shop.avatar_url}
                      alt={shop.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-slate-900 text-base leading-snug truncate">
                        {shop.name}
                      </h2>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          shop.is_open
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            shop.is_open ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {shop.is_open ? "Buka" : "Tutup"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{shop.category}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="truncate">{shop.location}</p>
                      {shop.address_detail && (
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {shop.address_detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {shop.accepts_delivery && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        <Truck className="w-3 h-3" />
                        Antar
                      </span>
                    )}
                    {shop.accepts_pickup && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        <ShoppingBag className="w-3 h-3" />
                        Ambil sendiri
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400">
                      Kode{" "}
                      <span className="font-mono font-semibold text-slate-600">
                        {shop.shop_code}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <Link
                    href={`/mystore/${shop.id}/dashboard`}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors"
                  >
                    <span>Masuk Toko</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/mystore/${shop.id}/dashboard/settings`}
                    aria-label={`Pengaturan ${shop.name}`}
                    className="shrink-0 w-10 h-10 inline-flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Modal: bottom sheet di mobile, dialog di desktop */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-store-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col"
          >
            {/* Header modal */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
              <h2 id="create-store-title" className="font-extrabold text-lg text-slate-900">
                Buat Toko Baru
              </h2>
              <button
                onClick={closeModal}
                aria-label="Tutup"
                className="w-9 h-9 -mr-2 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="flex flex-col min-h-0">
              {/* Isi form (scroll sendiri) */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-sm text-rose-700"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="store-name" className={labelClass}>
                    Nama Toko
                  </label>
                  <input
                    ref={nameInputRef}
                    id="store-name"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Contoh: Kedai Kopi Mantap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="store-category" className={labelClass}>
                    Kategori
                  </label>
                  {isCategoriesLoading ? (
                    <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Memuat kategori...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        id="store-category"
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={isSubmitting}
                        className={fieldClass}
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                        <option value={OTHER_CATEGORY}>{OTHER_CATEGORY}</option>
                      </select>

                      {category === OTHER_CATEGORY && (
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Sebutkan kategori (opsional)"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          disabled={isSubmitting}
                          className={fieldClass}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="store-location" className={labelClass}>
                    Kota / Wilayah
                  </label>
                  <input
                    id="store-location"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Contoh: Gubeng, Surabaya"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isSubmitting}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="store-address" className={labelClass}>
                    Detail Alamat <span className="font-normal text-slate-400">(opsional)</span>
                  </label>
                  <textarea
                    id="store-address"
                    rows={2}
                    placeholder="Contoh: Jl. Raya No. 12, Lantai 2"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    disabled={isSubmitting}
                    className={`${fieldClass} resize-none`}
                  />
                </div>
              </div>

              {/* Footer modal */}
              <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCategoriesLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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