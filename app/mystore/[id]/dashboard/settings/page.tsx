"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Store,
  Clock,
  Save,
  MapPin,
  Phone,
  Upload,
  CheckCircle2,
  Power,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

// day_of_week: 0 = Minggu, 1 = Senin, ... 6 = Sabtu (sama dengan Date.getDay())
const DAYS = [
  { label: "Senin", dow: 1 },
  { label: "Selasa", dow: 2 },
  { label: "Rabu", dow: 3 },
  { label: "Kamis", dow: 4 },
  { label: "Jumat", dow: 5 },
  { label: "Sabtu", dow: 6 },
  { label: "Minggu", dow: 0 },
];

const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "22:00";

interface HourRow {
  day_of_week: number;
  is_closed: boolean;
  open_time: string; // format "HH:mm"
  close_time: string; // format "HH:mm"
}

const buildDefaultHours = (): HourRow[] =>
  DAYS.map((d) => ({
    day_of_week: d.dow,
    is_closed: false,
    open_time: DEFAULT_OPEN,
    close_time: DEFAULT_CLOSE,
  }));

// Postgres mengembalikan "08:00:00", input type="time" butuh "08:00"
const toHHmm = (value: string | null | undefined, fallback: string) =>
  value ? value.slice(0, 5) : fallback;

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

  const [activeTab, setActiveTab] = useState<"profile" | "hours" | "danger">(
    "profile"
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Modal Konfirmasi Hapus Toko
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State (sesuai kolom tabel `shops`)
  const [shopData, setShopData] = useState({
    id: storeId,
    owner_id: "",
    name: "",
    category: "",
    location: "",
    address_detail: "",
    avatar_url: "",
    is_open: true,
    whatsapp_number: "",
  });

  // State jam operasional (sesuai tabel `shop_operating_hours`)
  const [hours, setHours] = useState<HourRow[]>(buildDefaultHours());

  const updateHour = (dow: number, patch: Partial<HourRow>) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dow ? { ...h, ...patch } : h))
    );
  };

  // 1. Fetch Data Toko & Jam Operasional dari Supabase
  useEffect(() => {
    async function fetchShopData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Data toko
        const { data: shop, error: shopError } = await supabase
          .from("shops")
          .select("*")
          .eq("id", storeId)
          .single();

        if (shopError) throw shopError;

        setShopData({
          id: shop.id,
          owner_id: shop.owner_id || "",
          name: shop.name || "",
          category: shop.category || "",
          location: shop.location || "",
          address_detail: shop.address_detail || "",
          avatar_url: shop.avatar_url || "",
          is_open: shop.is_open ?? true,
          whatsapp_number: shop.whatsapp_number || "",
        });

        // Jam operasional
        const { data: hoursData, error: hoursError } = await supabase
          .from("shop_operating_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("shop_id", storeId);

        if (hoursError) throw hoursError;

        // Gabungkan data dari DB dengan default (hari yang belum ada baris tetap tampil)
        const merged = buildDefaultHours().map((def) => {
          const found = hoursData?.find((h) => h.day_of_week === def.day_of_week);
          if (!found) return def;
          return {
            day_of_week: def.day_of_week,
            is_closed: found.is_closed,
            open_time: toHHmm(found.open_time, DEFAULT_OPEN),
            close_time: toHHmm(found.close_time, DEFAULT_CLOSE),
          };
        });
        setHours(merged);
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

  // 2. Simpan / Update Data Toko & Jam Operasional ke Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi jam operasional: jam tutup harus lebih besar dari jam buka
    const invalidDay = hours.find(
      (h) => !h.is_closed && (!h.open_time || !h.close_time || h.close_time <= h.open_time)
    );
    if (invalidDay) {
      const label = DAYS.find((d) => d.dow === invalidDay.day_of_week)?.label;
      setErrorMessage(
        `Jam operasional hari ${label} tidak valid: jam tutup harus lebih besar dari jam buka.`
      );
      setActiveTab("hours");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // Update tabel `shops`
      const { error: shopUpdateError } = await supabase
        .from("shops")
        .update({
          name: shopData.name,
          category: shopData.category,
          location: shopData.location,
          address_detail: shopData.address_detail.trim() || null,
          is_open: shopData.is_open,
          avatar_url: shopData.avatar_url || null,
          whatsapp_number: shopData.whatsapp_number.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (shopUpdateError) throw shopUpdateError;

      // Upsert tabel `shop_operating_hours` (unik per shop_id + day_of_week)
      const hoursPayload = hours.map((h) => ({
        shop_id: storeId,
        day_of_week: h.day_of_week,
        is_closed: h.is_closed,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
      }));

      const { error: hoursError } = await supabase
        .from("shop_operating_hours")
        .upsert(hoursPayload, { onConflict: "shop_id,day_of_week" });

      if (hoursError) throw hoursError;

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

      // Jam operasional ikut terhapus otomatis (ON DELETE CASCADE)
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", storeId);

      if (error) throw error;

      setIsDeleteModalOpen(false);
      router.push("/mystore");
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
    { id: "danger", label: "Hapus Toko", icon: Trash2 },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-xs">Memuat data toko...</span>
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
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm">
                Informasi Utama Toko
              </h2>
              <p className="text-[11px] text-slate-400">
                Pengaturan identitas dan kontak toko
              </p>
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
                    Status Toko
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
                  Nama Toko
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
                  Kategori
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
                  Kota / Area
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
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Contoh: 6281234567890"
                    value={shopData.whatsapp_number}
                    onChange={(e) =>
                      setShopData({
                        ...shopData,
                        whatsapp_number: e.target.value.replace(/[^\d+]/g, ""),
                      })
                    }
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Gunakan format kode negara tanpa spasi, misalnya 62812xxxxxxx
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Alamat Detail
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
                Centang hari toko buka, lalu atur jam buka dan tutupnya
              </p>
            </div>

            <div className="space-y-2.5">
              {DAYS.map((day) => {
                const row = hours.find((h) => h.day_of_week === day.dow)!;
                const isOpenDay = !row.is_closed;

                return (
                  <div
                    key={day.dow}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-2 text-xs"
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOpenDay}
                        onChange={(e) =>
                          updateHour(day.dow, { is_closed: !e.target.checked })
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="font-semibold text-slate-700">
                        {day.label}
                      </span>
                      {!isOpenDay && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-500">
                          Libur
                        </span>
                      )}
                    </label>

                    <div
                      className={`flex items-center gap-2 pl-7 sm:pl-0 ${
                        !isOpenDay ? "opacity-40" : ""
                      }`}
                    >
                      <input
                        type="time"
                        value={row.open_time}
                        disabled={!isOpenDay}
                        onChange={(e) =>
                          updateHour(day.dow, { open_time: e.target.value })
                        }
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs disabled:cursor-not-allowed"
                      />
                      <span className="text-slate-400">-</span>
                      <input
                        type="time"
                        value={row.close_time}
                        disabled={!isOpenDay}
                        onChange={(e) =>
                          updateHour(day.dow, { close_time: e.target.value })
                        }
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Danger Zone (Hapus Toko) */}
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
                    Setelah toko dihapus, semua produk, jam operasional, riwayat transaksi, dan data kasir terkait akan <strong>dihapus secara permanen</strong> dan tidak dapat dikembalikan lagi.
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