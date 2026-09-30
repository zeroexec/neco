"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Store,
  Clock,
  CreditCard,
  ShieldCheck,
  Save,
  MapPin,
  Phone,
  Mail,
  Upload,
  CheckCircle2,
  Star,
  Power,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    "profile" | "hours" | "payment" | "security" | "danger"
  >("profile");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Modal Konfirmasi Hapus Toko
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [shopData, setShopData] = useState({
    id: storeId,
    owner_id: "",
    name: "",
    category: "",
    location: "",
    address_detail: "",
    avatar_url: "",
    is_open: true,
    rating: 5.0,
    owner_email: "",
    owner_phone: "",
  });

  // 1. Fetch Data Toko & Profil Pemilik dari Supabase
  useEffect(() => {
    async function fetchShopData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Fetch data toko
        const { data: shop, error: shopError } = await supabase
          .from("shops")
          .select("*")
          .eq("id", storeId)
          .single();

        if (shopError) throw shopError;

        let ownerEmail = "";
        let ownerPhone = "";

        // Fetch data profil pemilik jika owner_id ada
        if (shop?.owner_id) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("email, phone_number")
            .eq("id", shop.owner_id)
            .maybeSingle();

          if (!profileError && profile) {
            ownerEmail = profile.email || "";
            ownerPhone = profile.phone_number || "";
          }
        }

        setShopData({
          id: shop.id,
          owner_id: shop.owner_id || "",
          name: shop.name || "",
          category: shop.category || "",
          location: shop.location || "",
          address_detail: shop.address_detail || "",
          avatar_url: shop.avatar_url || "",
          is_open: shop.is_open ?? true,
          rating: shop.rating ?? 5.0,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
        });
      } catch (err: any) {
        console.error("Gagal mengambil data toko:", err);
        setErrorMessage(err.message || "Gagal memuat data toko.");
      } finally {
        setIsLoading(false);
      }
    }

    if (storeId) {
      fetchShopData();
    }
  }, [storeId]);

  // Handler Upload Logo Toko ke Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran berkas maksimal 2MB!");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `store-logos/${storeId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("shops")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("shops")
        .getPublicUrl(filePath);

      setShopData((prev) => ({
        ...prev,
        avatar_url: publicUrlData.publicUrl,
      }));
    } catch (err: any) {
      console.error("Gagal mengunggah logo:", err);
      alert(`Gagal unggah logo: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Simpan / Update Data Toko ke Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage(null);

      // Update data pada tabel `shops`
      const { error: shopUpdateError } = await supabase
        .from("shops")
        .update({
          name: shopData.name,
          category: shopData.category,
          location: shopData.location,
          address_detail: shopData.address_detail,
          is_open: shopData.is_open,
          avatar_url: shopData.avatar_url,
        })
        .eq("id", storeId);

      if (shopUpdateError) throw shopUpdateError;

      // Update profil pemilik jika `owner_id` ada
      if (shopData.owner_id) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            email: shopData.owner_email,
            phone_number: shopData.owner_phone,
          })
          .eq("id", shopData.owner_id);

        if (profileUpdateError) throw profileUpdateError;
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error("Gagal menyimpan data:", err);
      setErrorMessage(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Hapus Toko dari Supabase
  const handleDeleteStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== shopData.name) return;

    try {
      setIsDeleting(true);
      setErrorMessage(null);

      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", storeId);

      if (error) throw error;

      setIsDeleteModalOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Gagal menghapus toko:", err);
      alert(`Gagal menghapus toko: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profil Toko", icon: Store },
    { id: "hours", label: "Jam Operasional", icon: Clock },
    { id: "payment", label: "Pembayaran & QRIS", icon: CreditCard },
    { id: "security", label: "Keamanan", icon: ShieldCheck },
    { id: "danger", label: "Hapus Toko", icon: Trash2 },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-xs">Memuat data toko dari Supabase...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-10">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengaturan Toko
          </h1>
          <p className="text-xs text-slate-500">
            Kelola identitas toko, status operasional, dan informasi kontak
          </p>
        </div>

        {/* Toast Notifikasi / Status */}
        {isSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Perubahan berhasil disimpan!</span>
          </div>
        )}
      </div>

      {/* Alert Error jika terjadi kendala Supabase */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === "danger";

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? isDanger
                      ? "border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-lg"
                      : "border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg"
                    : isDanger
                    ? "border-transparent text-rose-500 hover:text-rose-700 hover:border-rose-200"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-6"
      >
        {/* Tab 1: Profil Toko */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">
                  Informasi Utama Toko
                </h2>
                <p className="text-[11px] text-slate-400">
                  Pengaturan identitas yang tersimpan pada tabel `shops`
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="text-xs font-bold text-amber-700">
                  {Number(shopData.rating || 0).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Status Toko (Toggle Switch) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl gap-3">
              <div className="flex items-center gap-3">
                <Power
                  className={`w-4 h-4 shrink-0 ${
                    shopData.is_open ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Status Toko (`is_open`)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {shopData.is_open
                      ? "Toko sedang BUKA dan siap menerima pesanan"
                      : "Toko sedang TUTUP sementara"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={shopData.is_open}
                  onChange={(e) =>
                    setShopData({ ...shopData, is_open: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Avatar / Logo Upload */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
                {shopData.avatar_url ? (
                  <img
                    src={shopData.avatar_url}
                    alt={shopData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (shopData.name || "TK").substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploading ? "Mengunggah..." : "Unggah Logo"}</span>
                </button>
                <p className="text-[10px] text-slate-400">Format JPG, PNG max 2MB</p>
              </div>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Nama Toko (`name`)
                </label>
                <input
                  type="text"
                  required
                  value={shopData.name}
                  onChange={(e) =>
                    setShopData({ ...shopData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Kategori (`category`)
                </label>
                <input
                  type="text"
                  required
                  value={shopData.category}
                  onChange={(e) =>
                    setShopData({ ...shopData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Kota / Area (`location`)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={shopData.location}
                    onChange={(e) =>
                      setShopData({ ...shopData, location: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Telepon Pemilik (`profiles.phone_number`)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={shopData.owner_phone}
                    onChange={(e) =>
                      setShopData({ ...shopData, owner_phone: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Email Kontak Toko (`profiles.email`)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={shopData.owner_email}
                  onChange={(e) =>
                    setShopData({ ...shopData, owner_email: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Alamat Detail (`address_detail`)
              </label>
              <textarea
                rows={2}
                value={shopData.address_detail}
                onChange={(e) =>
                  setShopData({
                    ...shopData,
                    address_detail: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Jam Operasional */}
        {activeTab === "hours" && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm">
                Jam Operasional Toko
              </h2>
              <p className="text-[11px] text-slate-400">
                Atur jadwal Buka/Tutup harian kasir
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                "Senin",
                "Selasa",
                "Rabu",
                "Kamis",
                "Jumat",
                "Sabtu",
                "Minggu",
              ].map((day) => (
                <div
                  key={day}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">{day}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-7 sm:pl-0">
                    <input
                      type="time"
                      defaultValue="08:00"
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Pembayaran & QRIS */}
        {activeTab === "payment" && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm">
                Metode Pembayaran Kasir
              </h2>
              <p className="text-[11px] text-slate-400">
                Pilihan pembayaran yang tersedia saat checkout order
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Tunai (Cash)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Menerima pembayaran tunai di meja kasir
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      QRIS (Statis / Dinamis)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Menerima e-Wallet & Mobile Banking
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 4: Keamanan */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm">
                PIN & Otorisasi Toko
              </h2>
              <p className="text-[11px] text-slate-400">
                Gunakan PIN ini untuk verifikasi void atau diskon khusus di kasir
              </p>
            </div>

            <div className="space-y-3 max-w-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  PIN Toko (6 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  defaultValue="123456"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs tracking-widest text-center font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Danger Zone (Hapus Toko) */}
        {activeTab === "danger" && (
          <div className="space-y-4">
            <div className="border-b border-rose-100 pb-3">
              <h2 className="font-bold text-rose-600 text-sm">
                Zona Bahaya (Danger Zone)
              </h2>
              <p className="text-[11px] text-slate-400">
                Tindakan berisiko tinggi yang dapat mempengaruhi seluruh data toko Anda
              </p>
            </div>

            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-rose-900">
                    Hapus Toko Ini Permanen
                  </h3>
                  <p className="text-[11px] text-rose-700/80 leading-relaxed">
                    Setelah toko dihapus dari Supabase, semua produk, riwayat transaksi, dan data kasir terkait akan **dihapus secara permanen** dan tidak dapat dikembalikan lagi.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Toko Ini</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button (Kecuali Tab Danger) */}
        {activeTab !== "danger" && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Modal Konfirmasi Hapus Toko */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Konfirmasi Hapus Toko
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Untuk melanjutkan, silakan ketikkan nama toko{" "}
              <strong className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all">
                {shopData.name}
              </strong>{" "}
              di bawah ini:
            </p>

            <form onSubmit={handleDeleteStore} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Ketikkan nama toko persis..."
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={confirmName !== shopData.name || isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isDeleting ? "Menghapus..." : "Saya Paham, Hapus Toko"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}