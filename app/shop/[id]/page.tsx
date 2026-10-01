"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  MapPin,
  Clock,
  MessageCircle,
  Navigation,
  Store,
  Loader2,
} from "lucide-react";

// ---------- Tipe data ----------

// day_of_week: 0 = Minggu, 1 = Senin, ... 6 = Sabtu
interface OperatingHour {
  day_of_week: number;
  open_time: string | null; // "HH:mm:ss"
  close_time: string | null; // "HH:mm:ss"
  is_closed: boolean;
}

interface Shop {
  id: string;
  name: string;
  category: string;
  location: string;
  is_open: boolean;
  avatar_url: string | null;
  address_detail: string | null;
  whatsapp_number: string | null;
  shop_operating_hours: OperatingHour[] | null;
}

const DAYS = [
  { label: "Senin", dow: 1 },
  { label: "Selasa", dow: 2 },
  { label: "Rabu", dow: 3 },
  { label: "Kamis", dow: 4 },
  { label: "Jumat", dow: 5 },
  { label: "Sabtu", dow: 6 },
  { label: "Minggu", dow: 0 },
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&auto=format&fit=crop&q=80";

// ---------- Helper: waktu & status buka ----------

const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Hari & menit sekarang berdasarkan zona waktu Asia/Jakarta (WIB)
function getJakartaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return { dow: WEEKDAY_TO_DOW[weekday] ?? 0, minutes: hour * 60 + minute };
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
};

const toHHmm = (time: string) => time.slice(0, 5);

interface ShopStatus {
  label: string;
  isOpenNow: boolean;
}

function getShopStatus(
  shop: Shop,
  now: { dow: number; minutes: number }
): ShopStatus {
  const today = shop.shop_operating_hours?.find(
    (h) => h.day_of_week === now.dow
  );

  // Pemilik menutup toko secara manual lewat toggle is_open
  if (!shop.is_open) {
    return { label: "Tutup Sementara", isOpenNow: false };
  }

  // Belum ada jadwal untuk hari ini: ikuti status is_open
  if (!today) {
    return { label: "Buka Sekarang", isOpenNow: true };
  }

  // Libur di hari ini
  if (today.is_closed || !today.open_time || !today.close_time) {
    return { label: "Libur Hari Ini", isOpenNow: false };
  }

  const openAt = toMinutes(today.open_time);
  const closeAt = toMinutes(today.close_time);

  if (now.minutes < openAt) {
    return {
      label: `Buka pukul ${toHHmm(today.open_time)}`,
      isOpenNow: false,
    };
  }
  if (now.minutes >= closeAt) {
    return { label: "Tutup", isOpenNow: false };
  }
  return { label: "Buka Sekarang", isOpenNow: true };
}

// ---------- Helper: WhatsApp & Maps ----------

function buildWhatsAppUrl(rawNumber: string | null, shopName: string) {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/\D/g, "");
  if (!digits) return null;

  // 08xxx -> 628xxx
  const international = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const text = encodeURIComponent(
    `Halo ${shopName}, saya melihat toko Anda di NECO.`
  );
  return `https://wa.me/${international}?text=${text}`;
}

function buildMapsUrl(shop: Shop) {
  const query = [shop.name, shop.address_detail, shop.location]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

// ---------- Halaman ----------

export default function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.id;

  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(getJakartaNow());

  // Perbarui waktu tiap menit agar status Buka/Tutup tetap akurat
  useEffect(() => {
    const interval = setInterval(() => setNow(getJakartaNow()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch toko + jam operasional
  useEffect(() => {
    const fetchShop = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("shops")
          .select(
            `id, name, category, location, is_open, avatar_url, address_detail, whatsapp_number,
             shop_operating_hours ( day_of_week, open_time, close_time, is_closed )`
          )
          .eq("id", shopId)
          .maybeSingle();

        if (error) throw error;
        setShop((data as Shop) ?? null);
      } catch (err: any) {
        console.error("Gagal memuat toko:", err.message);
        setShop(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (shopId) fetchShop();
  }, [shopId]);

  // ----- Loading -----
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-medium text-slate-600">Memuat toko...</p>
      </div>
    );
  }

  // ----- Tidak ditemukan -----
  if (!shop) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs max-w-sm w-full">
          <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-base text-slate-700">
            Toko tidak ditemukan
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Toko yang kamu cari tidak ada atau gagal dimuat.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const status = getShopStatus(shop, now);
  const whatsappUrl = buildWhatsAppUrl(shop.whatsapp_number, shop.name);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
            {shop.name}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Cover + Info Utama */}
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="relative h-36 sm:h-52 w-full bg-slate-200">
            <img
              src={shop.avatar_url || FALLBACK_IMAGE}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className="px-4 sm:px-6 pb-5">
            <div className="flex items-end justify-between gap-3 -mt-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-lg border-4 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
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

              <span
                className={`mb-1 inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full border ${
                  status.isOpenNow
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-600 border-rose-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    status.isOpenNow ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {status.label}
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <h2 className="font-extrabold text-lg sm:text-2xl text-slate-900 leading-tight">
                {shop.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {shop.category}
              </p>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs sm:text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-slate-700">{shop.location}</p>
                <p className="text-slate-500 leading-relaxed">
                  {shop.address_detail || "Alamat lengkap belum diatur."}
                </p>
              </div>
            </div>

            {/* Aksi */}
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-colors shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat via WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl cursor-not-allowed"
                >
                  <MessageCircle className="w-4 h-4" />
                  Nomor WhatsApp belum tersedia
                </button>
              )}

              <a
                href={buildMapsUrl(shop)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Buka di Maps
              </a>
            </div>
          </div>
        </section>

        {/* Jam Operasional */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Jam Operasional
              </h3>
              <p className="text-[11px] text-slate-400">Waktu Indonesia Barat (WIB)</p>
            </div>
          </div>

          <div className="space-y-2">
            {DAYS.map((day) => {
              const row = shop.shop_operating_hours?.find(
                (h) => h.day_of_week === day.dow
              );
              const isToday = now.dow === day.dow;

              let hoursLabel = "Belum diatur";
              let isClosedDay = false;

              if (row) {
                if (row.is_closed || !row.open_time || !row.close_time) {
                  hoursLabel = "Libur";
                  isClosedDay = true;
                } else {
                  hoursLabel = `${toHHmm(row.open_time)} – ${toHHmm(
                    row.close_time
                  )}`;
                }
              }

              return (
                <div
                  key={day.dow}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm border ${
                    isToday
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        isToday ? "text-emerald-800" : "text-slate-700"
                      }`}
                    >
                      {day.label}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                        Hari ini
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      isClosedDay
                        ? "text-rose-500"
                        : row
                        ? "text-slate-700"
                        : "text-slate-400"
                    }`}
                  >
                    {hoursLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}