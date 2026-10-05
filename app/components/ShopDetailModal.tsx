"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  Store,
  Clock,
  MapPin,
  Phone,
  ExternalLink,
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  Loader2,
  Globe,
  Link2,
  AlertCircle,
  Check,
  Info,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface OperatingHour {
  day_of_week: number; // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
  open_time: string | null; // "HH:mm:ss"
  close_time: string | null;
  is_closed: boolean;
}

interface ShopDetail {
  id: string;
  name: string;
  category: string;
  location: string;
  address_detail: string | null;
  address_note: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  description: string | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
  website_url: string | null;
  delivery_fee: number;
  min_order: number;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
}

interface ShopDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string | null;
  statusLabel: string;
  isOpenNow: boolean;
  todayDow: number; // hari ini (0 = Minggu) untuk menandai baris jam operasional
  onOpenMenu?: () => void; // bila diisi, tampil tombol "Menu & Pesan"
}

const SHOP_COLUMNS =
  "id, name, category, location, address_detail, address_note, postal_code, latitude, longitude, google_maps_url, avatar_url, cover_url, description, whatsapp_number, instagram_url, tiktok_url, facebook_url, youtube_url, x_url, website_url, delivery_fee, min_order, accepts_delivery, accepts_pickup";

// Urutan tampil: Senin ... Minggu
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES: Record<number, string> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
};

// Jarak geser (px) yang dianggap cukup untuk menutup sheet di mobile
const DRAG_CLOSE_THRESHOLD = 110;

const toHHmm = (time: string) => time.slice(0, 5);

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

// Nomor WhatsApp -> format wa.me (awalan 0 diganti 62)
const toWhatsAppHref = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
};

// ===== Komponen kecil =====

// Judul bagian: ikon dalam kotak hijau muda + judul
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

// Kartu layanan: hijau bila tersedia, abu-abu putus-putus bila tidak
function ServiceCard({
  icon: Icon,
  title,
  note,
  enabled,
}: {
  icon: LucideIcon;
  title: string;
  note: string;
  enabled: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 flex items-start gap-3 ${
        enabled
          ? "border-emerald-200 bg-emerald-50"
          : "border-dashed border-slate-200 bg-slate-50"
      }`}
    >
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p
          className={`text-xs font-bold leading-tight ${
            enabled ? "text-emerald-900" : "text-slate-500"
          }`}
        >
          {title}
        </p>
        <p
          className={`text-[11px] mt-1 flex items-center gap-1 leading-tight ${
            enabled ? "text-emerald-700" : "text-slate-400"
          }`}
        >
          {enabled && <Check className="w-3 h-3 shrink-0" />}
          <span>{note}</span>
        </p>
      </div>
    </div>
  );
}

// Sepanduk pengganti bila toko belum punya cover
function CoverFallback() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-700 overflow-hidden flex items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/10"
      />
      <Store className="relative w-14 h-14 text-white/40" />
    </div>
  );
}

export default function ShopDetailModal({
  isOpen,
  onClose,
  shopId,
  statusLabel,
  isOpenNow,
  todayDow,
  onOpenMenu,
}: ShopDetailModalProps) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Geser-untuk-tutup (khusus mobile, lewat handle di atas sheet)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // Ambil detail toko + jam operasional saat modal dibuka
  useEffect(() => {
    if (!isOpen || !shopId) return;

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setShop(null);
    setHours([]);

    (async () => {
      const [shopRes, hoursRes] = await Promise.all([
        supabase.from("shops").select(SHOP_COLUMNS).eq("id", shopId).maybeSingle(),
        supabase
          .from("shop_operating_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("shop_id", shopId),
      ]);

      if (cancelled) return;

      if (shopRes.error || !shopRes.data) {
        if (shopRes.error) {
          console.error("Gagal mengambil detail toko:", shopRes.error.message);
        }
        setHasError(true);
      } else {
        setShop(shopRes.data as ShopDetail);
      }

      if (!hoursRes.error) {
        setHours((hoursRes.data as OperatingHour[]) || []);
      }

      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, shopId]);

  // Reset posisi geser setiap modal dibuka/ditutup
  useEffect(() => {
    setDragY(0);
    setIsDragging(false);
    dragStartY.current = null;
  }, [isOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    setDragY(delta > 0 ? delta : 0); // hanya boleh digeser ke bawah
  };

  const handleTouchEnd = () => {
    const shouldClose = dragY > DRAG_CLOSE_THRESHOLD;
    dragStartY.current = null;
    setIsDragging(false);
    if (shouldClose) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const waHref = shop?.whatsapp_number ? toWhatsAppHref(shop.whatsapp_number) : null;

  const mapsHref =
    shop?.google_maps_url ||
    (shop?.latitude != null && shop?.longitude != null
      ? `https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`
      : null);

  const addressLines = shop
    ? [shop.address_detail, shop.address_note, shop.postal_code]
        .map((v) => v?.trim())
        .filter((v): v is string => !!v)
    : [];

  const socials = shop
    ? [
        { label: "Instagram", url: shop.instagram_url, isWebsite: false },
        { label: "TikTok", url: shop.tiktok_url, isWebsite: false },
        { label: "Facebook", url: shop.facebook_url, isWebsite: false },
        { label: "YouTube", url: shop.youtube_url, isWebsite: false },
        { label: "X (Twitter)", url: shop.x_url, isWebsite: false },
        { label: "Website", url: shop.website_url, isWebsite: true },
      ].filter((s) => !!s.url)
    : [];

  const renderHours = (dow: number) => {
    const row = hours.find((h) => h.day_of_week === dow);
    if (!row) return "Belum diatur";
    if (row.is_closed || !row.open_time || !row.close_time) return "Libur";
    return `${toHHmm(row.open_time)}–${toHHmm(row.close_time)}`;
  };

  const showFooter = !!shop && !isLoading && !hasError && (!!waHref || !!onOpenMenu);

  return (
    <div
      className="shop-modal-backdrop fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detail toko"
    >
      {/* Animasi: naik dari bawah di mobile, membesar halus di desktop */}
      <style>{`
        @keyframes shopModalFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes shopSheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes shopModalPop { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
        .shop-modal-backdrop { animation: shopModalFade .2s ease-out; }
        .shop-modal-sheet { animation: shopSheetUp .28s cubic-bezier(.32,.72,0,1); }
        @media (min-width: 768px) {
          .shop-modal-sheet { animation: shopModalPop .2s ease-out; }
        }
        @media (prefers-reduced-motion: reduce) {
          .shop-modal-backdrop, .shop-modal-sheet { animation: none; }
        }
      `}</style>

      <div
        className="shop-modal-sheet relative bg-white w-full md:max-w-lg max-h-[92vh] max-h-[92dvh] md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl rounded-t-3xl md:rounded-3xl"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle geser (hanya mobile): area sentuh luas, pil putih terlihat di atas sepanduk */}
        <div
          className="md:hidden absolute top-0 inset-x-0 z-30 h-8 flex items-start justify-center pt-2.5 cursor-grab"
          style={{ touchAction: "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          aria-hidden="true"
        >
          <span className="w-10 h-1.5 rounded-full bg-white/90 shadow" />
        </div>

        {/* Satu area scroll: sepanduk, logo, dan isi ikut bergulir bersama */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Tombol tutup: menempel di atas area scroll, selalu terlihat */}
          <div className="sticky top-0 z-20 h-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="absolute top-3 right-3 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 shadow-md flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sepanduk (cover) — ikut scroll, tidak fixed */}
          <div className="relative w-full h-36 sm:h-48 md:h-52 bg-emerald-50">
            {shop?.cover_url ? (
              <img
                src={shop.cover_url}
                alt={`Sepanduk ${shop.name}`}
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <CoverFallback />
            )}
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Memuat detail toko...</p>
            </div>
          ) : hasError || !shop ? (
            <div className="py-16 px-6 flex flex-col items-center justify-center gap-2 text-center">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="font-semibold text-sm text-slate-700">
                Detail toko tidak dapat dimuat
              </p>
              <p className="text-xs text-slate-400">
                Periksa koneksi Anda lalu coba buka kembali.
              </p>
            </div>
          ) : (
            <div className="px-4 sm:px-5 pb-6">
              {/* Logo menimpa sepanduk + status */}
              <div className="relative -mt-10 flex items-end justify-between gap-3">
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-700 font-extrabold text-xl border-4 border-white shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                  {shop.avatar_url ? (
                    <img
                      src={shop.avatar_url}
                      alt={shop.name}
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    shop.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <span
                  className={`mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                    isOpenNow
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOpenNow ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {statusLabel}
                </span>
              </div>

              {/* Nama, kategori, lokasi */}
              <div className="mt-3 space-y-2">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight break-words">
                  {shop.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                    {shop.category}
                  </span>
                  <span className="inline-flex items-start gap-1 text-xs text-slate-500 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-px" />
                    <span className="break-words">{shop.location}</span>
                  </span>
                </div>
              </div>

              {/* Ringkasan cepat */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-3.5 min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Clock className="w-3 h-3 shrink-0" />
                    Hari ini
                  </p>
                  <p className="mt-1.5 text-sm font-extrabold text-slate-900 leading-tight break-words">
                    {renderHours(todayDow)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-3.5 min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Wallet className="w-3 h-3 shrink-0" />
                    Min. pesanan
                  </p>
                  <p className="mt-1.5 text-sm font-extrabold text-slate-900 leading-tight break-words">
                    {Number(shop.min_order) > 0
                      ? formatRupiah(Number(shop.min_order))
                      : "Tanpa minimum"}
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-7">
                {/* Tentang */}
                {shop.description && (
                  <Section icon={Info} title="Tentang Toko">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words">
                      {shop.description}
                    </p>
                  </Section>
                )}

                {/* Lokasi */}
                <Section icon={MapPin} title="Lokasi">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    {addressLines.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 leading-snug break-words">
                          {addressLines[0]}
                        </p>
                        {addressLines.slice(1).map((line, i) => (
                          <p
                            key={i}
                            className="text-xs text-slate-500 leading-relaxed break-words"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Alamat belum diatur.</p>
                    )}

                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Buka di Google Maps
                      </a>
                    )}
                  </div>
                </Section>

                {/* Layanan pemesanan */}
                <Section icon={ShoppingBag} title="Layanan Pemesanan">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ServiceCard
                      icon={ShoppingBag}
                      title="Ambil di toko"
                      enabled={shop.accepts_pickup}
                      note={shop.accepts_pickup ? "Tersedia" : "Tidak tersedia"}
                    />
                    <ServiceCard
                      icon={Truck}
                      title="Antar ke alamat"
                      enabled={shop.accepts_delivery}
                      note={
                        shop.accepts_delivery
                          ? Number(shop.delivery_fee) > 0
                            ? `Ongkir ${formatRupiah(Number(shop.delivery_fee))}`
                            : "Gratis ongkir"
                          : "Tidak tersedia"
                      }
                    />
                  </div>
                </Section>

                {/* Jam operasional */}
                <Section icon={Clock} title="Jam Operasional">
                  <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {DAY_ORDER.map((dow) => {
                      const isToday = dow === todayDow;
                      const text = renderHours(dow);
                      const isOff = text === "Libur";
                      return (
                        <div
                          key={dow}
                          className={`flex items-center justify-between gap-3 pl-3 sm:pl-3.5 pr-3.5 sm:pr-4 py-3 sm:py-2.5 text-xs border-l-4 ${
                            isToday
                              ? "bg-emerald-50 border-emerald-500"
                              : "bg-white border-transparent"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className={`font-semibold ${
                                isToday ? "text-emerald-900" : "text-slate-600"
                              }`}
                            >
                              {DAY_NAMES[dow]}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wide">
                                Hari ini
                              </span>
                            )}
                          </span>
                          <span
                            className={`font-bold shrink-0 ${
                              isOff
                                ? "text-rose-500"
                                : isToday
                                ? "text-emerald-900"
                                : "text-slate-800"
                            }`}
                          >
                            {text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {/* Media sosial */}
                {socials.length > 0 && (
                  <Section icon={Link2} title="Media Sosial & Website">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {socials.map((s) => {
                        const Icon = s.isWebsite ? Globe : Link2;
                        return (
                          <a
                            key={s.label}
                            href={s.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 active:bg-emerald-50 p-3 min-h-[56px] transition-colors group"
                          >
                            <span className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-white text-slate-500 group-hover:text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 min-w-0 text-xs font-bold text-slate-800 truncate">
                              {s.label}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </Section>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Aksi: bagian dari layout (bukan menimpa isi). Padding bawah mengikuti safe area iPhone */}
        {showFooter && (
          <div className="shrink-0 flex items-center gap-2.5 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] md:pb-3.5 border-t border-slate-100 bg-white">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[48px] md:min-h-0 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors min-w-0"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span className="truncate">WhatsApp</span>
              </a>
            )}
            {onOpenMenu && (
              <button
                type="button"
                onClick={onOpenMenu}
                className="flex-[1.4] min-h-[48px] md:min-h-0 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors min-w-0 cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4 shrink-0" />
                <span className="truncate">Menu &amp; Pesan</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}