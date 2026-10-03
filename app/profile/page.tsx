"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Camera,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  User,
  Store,
  CheckCircle2,
  MapPin,
  Building2,
  Navigation,
  Link2,
  ExternalLink,
  Home,
  ImagePlus,
  Trash2,
} from "lucide-react";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

type Notice = { type: "success" | "error"; text: string } | null;

interface FormState {
  full_name: string;
  whatsapp_number: string;
  city: string;
  address_full: string;
  address_note: string;
  postal_code: string;
  coordinates: string; // satu input: "lat, lng"
  google_maps_url: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  whatsapp_number: "",
  city: "",
  address_full: "",
  address_note: "",
  postal_code: "",
  coordinates: "",
  google_maps_url: "",
};

// ---------- Helper ----------

const ALLOWED_MAPS_HOSTS = [
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
];

function isValidMapsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return ALLOWED_MAPS_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

// Pisahkan "lat, lng" (juga menerima pemisah spasi / titik koma / tanda kurung)
function parseCoords(value: string): { lat: number; lng: number } | null {
  const m = value
    .trim()
    .match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

const formatCoords = (lat: number, lng: number) => `${lat}, ${lng}`;

// Ambil koordinat dari link Google Maps panjang (@lat,lng | q=lat,lng | !3dlat!4dlng)
function extractCoordsFromUrl(url: string): string | null {
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `${m[1]}, ${m[2]}`;
  }
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const houseInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved] = useState<FormState>(EMPTY_FORM);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [housePhotoUrl, setHousePhotoUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHouse, setIsUploadingHouse] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Ambil session + profil
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/auth/login");
        return;
      }

      const user = session.user;
      const { data: p, error } = await supabase
        .from("profiles")
        .select(
          `id, full_name, avatar_url, whatsapp_number, email, created_at,
           city, address_full, address_note, postal_code,
           latitude, longitude, google_maps_url, house_photo_url`
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Gagal mengambil profil:", error.message);
        setNotice({
          type: "error",
          text: "Gagal memuat profil. Coba muat ulang halaman.",
        });
      }

      const loaded: FormState = {
        full_name: p?.full_name ?? user.user_metadata?.full_name ?? "",
        whatsapp_number: p?.whatsapp_number ?? "",
        city: p?.city ?? "",
        address_full: p?.address_full ?? "",
        address_note: p?.address_note ?? "",
        postal_code: p?.postal_code ?? "",
        coordinates:
          p?.latitude != null && p?.longitude != null
            ? formatCoords(p.latitude, p.longitude)
            : "",
        google_maps_url: p?.google_maps_url ?? "",
      };

      setUserId(user.id);
      setEmail(p?.email ?? user.email ?? "");
      setCreatedAt(p?.created_at ?? user.created_at ?? null);
      setForm(loaded);
      setSaved(loaded);
      setAvatarUrl(p?.avatar_url ?? user.user_metadata?.avatar_url ?? null);
      setHousePhotoUrl(p?.house_photo_url ?? null);
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ---------- Validasi ----------

  const waDigits = form.whatsapp_number.replace(/\D/g, "");
  const parsedCoords = parseCoords(form.coordinates);

  const errors = {
    name: form.full_name.trim().length === 0 ? "Nama tidak boleh kosong." : null,
    wa:
      form.whatsapp_number.trim() &&
      (waDigits.length < 9 || waDigits.length > 15)
        ? "Nomor WhatsApp harus 9–15 digit."
        : null,
    postal:
      form.postal_code.trim() && !/^\d{5}$/.test(form.postal_code.trim())
        ? "Kode pos harus 5 digit."
        : null,
    coords: (() => {
      if (!form.coordinates.trim()) return null;
      if (!parsedCoords)
        return "Format koordinat tidak valid. Contoh: -8.102116, 113.852711";
      if (parsedCoords.lat < -90 || parsedCoords.lat > 90)
        return "Latitude (angka pertama) harus antara -90 dan 90.";
      if (parsedCoords.lng < -180 || parsedCoords.lng > 180)
        return "Longitude (angka kedua) harus antara -180 dan 180.";
      return null;
    })(),
    maps:
      form.google_maps_url.trim() && !isValidMapsUrl(form.google_maps_url.trim())
        ? "Gunakan link Google Maps yang valid."
        : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);
  const canSave = isDirty && !hasErrors && !isSaving;

  // ---------- Simpan ----------

  // upsert: profiles.id tidak punya default, jadi baris dibuat jika belum ada
  const saveFields = async (fields: Record<string, unknown>) => {
    if (!userId) return { error: new Error("Tidak ada sesi") };
    return supabase.from("profiles").upsert(
      {
        id: userId,
        email: email || null,
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    setNotice(null);

    const clean = (v: string) => v.trim() || null;
    const { error } = await saveFields({
      full_name: form.full_name.trim(),
      whatsapp_number: clean(form.whatsapp_number),
      city: clean(form.city),
      address_full: clean(form.address_full),
      address_note: clean(form.address_note),
      postal_code: clean(form.postal_code),
      latitude: parsedCoords ? parsedCoords.lat : null,
      longitude: parsedCoords ? parsedCoords.lng : null,
      google_maps_url: clean(form.google_maps_url),
    });

    if (error) {
      console.error("Gagal menyimpan profil:", error.message);
      setNotice({
        type: "error",
        text: "Gagal menyimpan perubahan. Silakan coba lagi.",
      });
    } else {
      const trimmed = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim()])
      ) as unknown as FormState;
      trimmed.coordinates = parsedCoords
        ? formatCoords(parsedCoords.lat, parsedCoords.lng)
        : "";
      setForm(trimmed);
      setSaved(trimmed);
      setNotice({ type: "success", text: "Profil berhasil diperbarui." });
    }
    setIsSaving(false);
  };

  // ---------- Lokasi ----------

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) {
      setNotice({ type: "error", text: "Browser tidak mendukung deteksi lokasi." });
      return;
    }
    setIsLocating(true);
    setNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setForm((prev) => ({
          ...prev,
          coordinates: formatCoords(lat, lng),
          google_maps_url:
            prev.google_maps_url.trim() ||
            `https://www.google.com/maps?q=${lat},${lng}`,
        }));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setNotice({
          type: "error",
          text:
            err.code === err.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser."
              : "Gagal mendapatkan lokasi. Coba lagi atau isi manual.",
        });
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  // Rapikan format koordinat setelah selesai mengetik/menempel
  const handleCoordsBlur = () => {
    const parsed = parseCoords(form.coordinates);
    if (parsed) {
      setField("coordinates", formatCoords(parsed.lat, parsed.lng));
    }
  };

  // Isi koordinat otomatis dari link Maps panjang bila koordinat masih kosong
  const handleMapsBlur = () => {
    const url = form.google_maps_url.trim();
    if (!url || form.coordinates.trim()) return;
    const coords = extractCoordsFromUrl(url);
    if (coords) setField("coordinates", coords);
  };

  const mapsPreviewUrl = (() => {
    const url = form.google_maps_url.trim();
    if (url && isValidMapsUrl(url)) return url;
    if (parsedCoords && !errors.coords) {
      return `https://www.google.com/maps?q=${parsedCoords.lat},${parsedCoords.lng}`;
    }
    return null;
  })();

  // ---------- Upload gambar ----------

  const uploadImage = async (file: File, prefix: "avatar" | "house") => {
    if (!userId) return null;

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", text: "File harus berupa gambar." });
      return null;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setNotice({ type: "error", text: "Ukuran foto maksimal 2 MB." });
      return null;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Gagal upload foto:", error.message);
      setNotice({ type: "error", text: "Gagal mengunggah foto. Silakan coba lagi." });
      return null;
    }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploadingAvatar(true);
    setNotice(null);
    const url = await uploadImage(file, "avatar");
    if (url) {
      const { error } = await saveFields({ avatar_url: url });
      if (error) {
        setNotice({ type: "error", text: "Foto terunggah tetapi gagal disimpan ke profil." });
      } else {
        setAvatarUrl(url);
        setNotice({ type: "success", text: "Foto profil berhasil diperbarui." });
      }
    }
    setIsUploadingAvatar(false);
  };

  const handleHouseChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploadingHouse(true);
    setNotice(null);
    const url = await uploadImage(file, "house");
    if (url) {
      const { error } = await saveFields({ house_photo_url: url });
      if (error) {
        setNotice({ type: "error", text: "Foto terunggah tetapi gagal disimpan ke profil." });
      } else {
        setHousePhotoUrl(url);
        setNotice({ type: "success", text: "Foto rumah berhasil diperbarui." });
      }
    }
    setIsUploadingHouse(false);
  };

  const handleRemoveHouse = async () => {
    setIsUploadingHouse(true);
    setNotice(null);
    const { error } = await saveFields({ house_photo_url: null });
    if (error) {
      setNotice({ type: "error", text: "Gagal menghapus foto rumah." });
    } else {
      setHousePhotoUrl(null);
      setNotice({ type: "success", text: "Foto rumah dihapus." });
    }
    setIsUploadingHouse(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const initials = (saved.full_name || email || "U").substring(0, 2).toUpperCase();

  const memberSince = createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(createdAt))
    : null;

  const inputClass =
    "w-full bg-slate-100 text-slate-800 text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all";
  const plainInputClass =
    "w-full bg-slate-100 text-slate-800 text-sm px-3 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all";
  const labelClass = "text-xs font-semibold text-slate-700";
  const errorClass = "text-[11px] text-rose-600";

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-base text-slate-900">Profil Saya</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs font-medium text-slate-600">Memuat profil...</p>
          </div>
        ) : (
          <>
            {/* Kartu foto & identitas */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col items-center text-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={saved.full_name || "Foto profil"}
                    className="w-24 h-24 rounded-full object-cover border-2 border-emerald-600"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-800 font-bold text-2xl flex items-center justify-center border-2 border-emerald-600">
                    {initials}
                  </div>
                )}

                {isUploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-slate-900/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Ganti foto profil"
                  className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-full shadow-md transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="min-w-0 max-w-full">
                <p className="font-bold text-lg text-slate-900 truncate">
                  {saved.full_name || "Pengguna"}
                </p>
                <p className="text-xs text-slate-500 truncate">{email}</p>
                {memberSince && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Bergabung sejak {memberSince}
                  </p>
                )}
              </div>
            </section>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Data diri */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <h2 className="font-bold text-sm text-slate-900">Data Diri</h2>

                <div className="space-y-1.5">
                  <label htmlFor="full_name" className={labelClass}>
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setField("full_name", e.target.value)}
                      placeholder="Nama lengkap"
                      className={inputClass}
                    />
                  </div>
                  {errors.name && <p className={errorClass}>{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="whatsapp" className={labelClass}>
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="whatsapp"
                      type="tel"
                      inputMode="tel"
                      value={form.whatsapp_number}
                      onChange={(e) => setField("whatsapp_number", e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className={inputClass}
                    />
                  </div>
                  {errors.wa && <p className={errorClass}>{errors.wa}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className={labelClass}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className={`${inputClass} opacity-60 cursor-not-allowed`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Email tidak dapat diubah di sini.
                  </p>
                </div>
              </section>

              {/* Alamat */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <h2 className="font-bold text-sm text-slate-900">Alamat</h2>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="city" className={labelClass}>
                      Kota / Kabupaten
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="city"
                        type="text"
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                        placeholder="Surabaya"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="postal" className={labelClass}>
                      Kode Pos
                    </label>
                    <input
                      id="postal"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={form.postal_code}
                      onChange={(e) =>
                        setField("postal_code", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="60111"
                      className={plainInputClass}
                    />
                  </div>
                </div>
                {errors.postal && <p className={errorClass}>{errors.postal}</p>}

                <div className="space-y-1.5">
                  <label htmlFor="address" className={labelClass}>
                    Alamat Lengkap
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      id="address"
                      value={form.address_full}
                      onChange={(e) => setField("address_full", e.target.value)}
                      placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="note" className={labelClass}>
                    Patokan / Catatan untuk Kurir
                  </label>
                  <input
                    id="note"
                    type="text"
                    value={form.address_note}
                    onChange={(e) => setField("address_note", e.target.value)}
                    placeholder="Contoh: pagar hitam, sebelah warung"
                    className={plainInputClass}
                  />
                </div>
              </section>

              {/* Lokasi peta */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-sm text-slate-900">Lokasi di Peta</h2>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 font-semibold text-xs px-3 py-2 rounded-xl transition-colors"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    Gunakan lokasi saya
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="coords" className={labelClass}>
                    Koordinat
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="coords"
                      type="text"
                      inputMode="decimal"
                      value={form.coordinates}
                      onChange={(e) => setField("coordinates", e.target.value)}
                      onBlur={handleCoordsBlur}
                      placeholder="-8.102116, 113.852711"
                      className={inputClass}
                    />
                  </div>
                  {errors.coords ? (
                    <p className={errorClass}>{errors.coords}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Buka Google Maps, tekan lama di lokasi rumah, lalu salin angka
                      koordinat di bagian atas dan tempel di sini.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="maps" className={labelClass}>
                    Link Google Maps
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="maps"
                      type="url"
                      value={form.google_maps_url}
                      onChange={(e) => setField("google_maps_url", e.target.value)}
                      onBlur={handleMapsBlur}
                      placeholder="https://maps.app.goo.gl/..."
                      className={inputClass}
                    />
                  </div>
                  {errors.maps && <p className={errorClass}>{errors.maps}</p>}
                </div>

                {mapsPreviewUrl && (
                  <a
                    href={mapsPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Cek lokasi di Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </section>

              {/* Foto rumah */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                <div>
                  <h2 className="font-bold text-sm text-slate-900">Foto Rumah</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Membantu kurir menemukan rumahmu. Maksimal 2 MB.
                  </p>
                </div>

                {housePhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={housePhotoUrl}
                      alt="Foto rumah"
                      className="w-full aspect-video object-cover"
                    />
                    {isUploadingHouse && (
                      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => houseInputRef.current?.click()}
                    disabled={isUploadingHouse}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {isUploadingHouse ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-7 h-7" />
                        <span className="text-xs font-medium">Unggah foto rumah</span>
                      </>
                    )}
                  </button>
                )}

                {housePhotoUrl && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => houseInputRef.current?.click()}
                      disabled={isUploadingHouse}
                      className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveHouse}
                      disabled={isUploadingHouse}
                      className="border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                )}

                <input
                  ref={houseInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHouseChange}
                  className="hidden"
                />
              </section>

              {notice && (
                <div
                  role="status"
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-xl ${
                    notice.type === "success"
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-rose-600 bg-rose-50"
                  }`}
                >
                  {notice.type === "success" && (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {notice.text}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSave}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </form>

            {/* Pintasan & keluar */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2">
              <Link
                href="/mystore"
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Store className="w-4 h-4 text-slate-500" />
                Toko Saya
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}