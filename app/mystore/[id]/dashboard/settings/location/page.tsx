"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  Navigation,
} from "lucide-react";
import {
  inputCls,
  inputIconCls,
  labelCls,
  hintCls,
  errorCls,
  isValidMapsUrl,
  parseCoords,
  formatCoords,
  extractCoordsFromUrl,
} from "../_lib/utils";
import { PageLoader, SaveBar, SectionHeader } from "../_lib/ui";
import { useToast } from "../_lib/toast";

interface LocationForm {
  location: string;
  postal_code: string;
  address_detail: string;
  address_note: string;
  coordinates: string; // satu input: "lat, lng"
  google_maps_url: string;
}

const EMPTY: LocationForm = {
  location: "",
  postal_code: "",
  address_detail: "",
  address_note: "",
  coordinates: "",
  google_maps_url: "",
};

export default function ShopLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [form, setForm] = useState<LocationForm>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const set = <K extends keyof LocationForm>(key: K, value: LocationForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("shops")
        .select(
          "location, postal_code, address_detail, address_note, latitude, longitude, google_maps_url"
        )
        .eq("id", storeId)
        .single();

      if (cancelled) return;

      if (error) {
        toast.error(error.message || "Gagal memuat data lokasi.");
      } else if (data) {
        setForm({
          location: data.location ?? "",
          postal_code: data.postal_code ?? "",
          address_detail: data.address_detail ?? "",
          address_note: data.address_note ?? "",
          coordinates:
            data.latitude != null && data.longitude != null
              ? formatCoords(data.latitude, data.longitude)
              : "",
          google_maps_url: data.google_maps_url ?? "",
        });
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, storeId, toast]);

  const parsedCoords = parseCoords(form.coordinates);

  const errors = {
    postal:
      form.postal_code.trim() && !/^\d{5}$/.test(form.postal_code.trim())
        ? "Kode pos harus 5 digit."
        : null,
    coords: (() => {
      if (!form.coordinates.trim()) return null;
      if (!parsedCoords) return "Format koordinat tidak valid. Contoh: -8.102116, 113.852711";
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

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Browser tidak mendukung deteksi lokasi.");
      return;
    }
    setIsLocating(true);

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
        toast.success("Lokasi berhasil diambil. Klik \"Simpan Perubahan\" untuk menerapkan.");
      },
      (err) => {
        setIsLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser."
            : "Gagal mendapatkan lokasi. Coba lagi atau isi manual."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  // Rapikan format koordinat setelah selesai mengetik/menempel
  const handleCoordsBlur = () => {
    if (parsedCoords) set("coordinates", formatCoords(parsedCoords.lat, parsedCoords.lng));
  };

  // Isi koordinat otomatis dari link Maps panjang bila koordinat masih kosong
  const handleMapsBlur = () => {
    const url = form.google_maps_url.trim();
    if (!url || form.coordinates.trim()) return;
    const coords = extractCoordsFromUrl(url);
    if (coords) set("coordinates", coords);
  };

  const mapsPreviewUrl = (() => {
    const url = form.google_maps_url.trim();
    if (url && isValidMapsUrl(url)) return url;
    if (parsedCoords && !errors.coords) {
      return `https://www.google.com/maps?q=${parsedCoords.lat},${parsedCoords.lng}`;
    }
    return null;
  })();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasErrors) {
      toast.error(
        errors.postal || errors.coords || errors.maps || "Periksa kembali isian Anda."
      );
      return;
    }

    try {
      setIsSaving(true);

      const clean = (v: string) => v.trim() || null;
      const { error } = await supabase
        .from("shops")
        .update({
          location: form.location.trim(),
          postal_code: clean(form.postal_code),
          address_detail: clean(form.address_detail),
          address_note: clean(form.address_note),
          latitude: parsedCoords ? parsedCoords.lat : null,
          longitude: parsedCoords ? parsedCoords.lng : null,
          google_maps_url: clean(form.google_maps_url),
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (error) throw error;
      toast.success("Perubahan berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-6"
    >
      <SectionHeader
        title="Alamat & Lokasi"
        description="Membantu pelanggan dan kurir menemukan toko Anda"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <label className={labelCls}>Kota / Area</label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Surabaya"
              className={inputIconCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Kode Pos</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={form.postal_code}
            onChange={(e) => set("postal_code", e.target.value.replace(/\D/g, ""))}
            placeholder="60111"
            className={inputCls}
          />
          {errors.postal && <p className={errorCls}>{errors.postal}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Alamat Lengkap</label>
        <textarea
          rows={3}
          value={form.address_detail}
          onChange={(e) => set("address_detail", e.target.value)}
          placeholder="Nama jalan, nomor, RT/RW, kelurahan, kecamatan"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Patokan / Petunjuk Arah</label>
        <input
          type="text"
          value={form.address_note}
          onChange={(e) => set("address_note", e.target.value)}
          placeholder="Contoh: sebelah minimarket, pagar hijau"
          className={inputCls}
        />
      </div>

      {/* Lokasi peta */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-sm">Lokasi di Peta</h3>
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
          <label className={labelCls}>Koordinat</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              inputMode="decimal"
              value={form.coordinates}
              onChange={(e) => set("coordinates", e.target.value)}
              onBlur={handleCoordsBlur}
              placeholder="-8.102116, 113.852711"
              className={inputIconCls}
            />
          </div>
          {errors.coords ? (
            <p className={errorCls}>{errors.coords}</p>
          ) : (
            <p className={hintCls}>
              Buka Google Maps, tekan lama di lokasi toko, lalu salin angka koordinat
              dan tempel di sini. Latitude dan longitude dipisah otomatis.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Link Google Maps</label>
          <div className="relative">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="url"
              value={form.google_maps_url}
              onChange={(e) => set("google_maps_url", e.target.value)}
              onBlur={handleMapsBlur}
              placeholder="https://maps.app.goo.gl/..."
              className={inputIconCls}
            />
          </div>
          {errors.maps && <p className={errorCls}>{errors.maps}</p>}
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
      </div>

      <SaveBar isSaving={isSaving} />
    </form>
  );
}