"use client";

import React from "react";
import Link from "next/link";
import {
  Loader2,
  Bike,
  Store,
  LogIn,
  UserCog,
  MapPin,
  MessageCircle,
  User,
  ExternalLink,
} from "lucide-react";
import QtyStepper from "./QtyStepper";
import {
  formatRupiah,
  GREEN_BTN,
  GREEN_BTN_DISABLED,
  type AuthState,
  type CartLine,
  type OrdererProfile,
  type ProductItem,
  type ServiceType,
} from "./shared";

interface CheckoutViewProps {
  authState: AuthState;
  profile: OrdererProfile | null;
  missingFields: string[];
  fullAddress: string;
  mapsLink: string | null;

  serviceType: ServiceType;
  onServiceTypeChange: (value: ServiceType) => void;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;

  cart: CartLine[];
  products: ProductItem[];
  canAddMore: (product: ProductItem) => boolean;
  onChangeQty: (key: string, delta: number) => void;
  onBackToMenu: () => void;

  notes: string;
  onNotesChange: (value: string) => void;

  cartTotal: number; // setelah diskon
  cartOriginalTotal: number; // sebelum diskon
  cartDiscount: number;

  submitError: string | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;

  onClose: () => void; // dipakai tautan ke halaman lain
}

const plainInputClass =
  "w-full bg-slate-100 text-slate-800 text-sm px-3 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all";

// Tampilan checkout: metode pemesanan, ringkasan, data pemesan, catatan, total
export default function CheckoutView({
  authState,
  profile,
  missingFields,
  fullAddress,
  mapsLink,
  serviceType,
  onServiceTypeChange,
  acceptsDelivery,
  acceptsPickup,
  cart,
  products,
  canAddMore,
  onChangeQty,
  onBackToMenu,
  notes,
  onNotesChange,
  cartTotal,
  cartOriginalTotal,
  cartDiscount,
  submitError,
  canSubmit,
  isSubmitting,
  onSubmit,
  onClose,
}: CheckoutViewProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Belum login */}
        {authState === "guest" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
            <p className="text-xs font-semibold text-amber-800">
              Masuk dulu untuk memesan. Data pemesan dan alamat akan terisi otomatis dari profil
              Anda.
            </p>
            <Link
              href="/auth/login"
              onClick={onClose}
              className={`inline-flex items-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-xl ${GREEN_BTN}`}
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Akun
            </Link>
          </div>
        )}

        {/* Metode pemesanan */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800">Metode Pemesanan</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "delivery", label: "Pesan Antar", Icon: Bike, enabled: acceptsDelivery },
                { value: "pickup", label: "Ambil Sendiri", Icon: Store, enabled: acceptsPickup },
              ] as const
            ).map(({ value, label, Icon, enabled }) => (
              <button
                key={value}
                type="button"
                disabled={!enabled}
                onClick={() => onServiceTypeChange(value)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  serviceType === value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {(!acceptsDelivery || !acceptsPickup) && (
            <p className="text-[11px] text-slate-400">
              {!acceptsDelivery && "Toko ini belum menerima pesanan antar."}
              {!acceptsPickup && "Toko ini belum menerima pesanan ambil sendiri."}
            </p>
          )}
        </div>

        {/* Ringkasan pesanan */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800">Ringkasan</p>
          <ul className="space-y-2">
            {cart.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              const plusDisabled = product ? !canAddMore(product) : true;
              return (
                <li
                  key={line.key}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{line.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatRupiah(line.unitPrice)}
                      {line.originalUnitPrice > line.unitPrice && (
                        <span className="ml-1.5 text-slate-400 line-through">
                          {formatRupiah(line.originalUnitPrice)}
                        </span>
                      )}
                    </p>
                  </div>
                  <QtyStepper
                    quantity={line.quantity}
                    onMinus={() => onChangeQty(line.key, -1)}
                    onPlus={() => onChangeQty(line.key, 1)}
                    plusDisabled={plusDisabled}
                  />
                </li>
              );
            })}
          </ul>
          {cart.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">
              Pesanan kosong.{" "}
              <button onClick={onBackToMenu} className="text-emerald-600 font-semibold">
                Kembali ke menu
              </button>
            </p>
          )}
        </div>

        {/* Data pemesan (otomatis dari profil, hanya baca) */}
        {authState === "loading" && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            Memuat data pemesan...
          </div>
        )}

        {authState === "user" && profile && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">Data Pemesan</p>
              <Link
                href="/profile"
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <UserCog className="w-3.5 h-3.5" />
                Ubah di profil
              </Link>
            </div>

            <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {profile.full_name?.trim() || (
                    <span className="text-rose-600">Nama belum diisi</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-700 truncate">
                  {profile.whatsapp_number?.trim() || (
                    <span className="text-rose-600">Nomor WhatsApp belum diisi</span>
                  )}
                </p>
              </div>

              {serviceType === "delivery" && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 text-xs text-slate-700 space-y-1">
                    {fullAddress ? (
                      <>
                        <p className="leading-relaxed">{fullAddress}</p>
                        {profile.address_note?.trim() && (
                          <p className="text-[11px] text-slate-500">
                            Patokan: {profile.address_note}
                          </p>
                        )}
                        {mapsLink && (
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Lihat titik lokasi
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-rose-600">Alamat belum diisi</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {missingFields.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <p className="text-[11px] font-medium text-rose-700">
                  Lengkapi dulu di profil: {missingFields.join(", ")}.
                </p>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Lengkapi Profil
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Catatan pesanan */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800">Catatan</p>
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Catatan pesanan (opsional)"
            maxLength={200}
            className={plainInputClass}
          />
        </div>

        {/* Total */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Subtotal</span>
            <span>{formatRupiah(cartOriginalTotal)}</span>
          </div>
          {cartDiscount > 0 && (
            <div className="flex items-center justify-between text-xs font-semibold text-rose-600">
              <span>Diskon</span>
              <span>-{formatRupiah(cartDiscount)}</span>
            </div>
          )}
          {serviceType === "delivery" && (
            <p className="text-[11px] text-slate-400">
              Ongkos kirim belum termasuk dan akan dikonfirmasi oleh toko.
            </p>
          )}
          <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-1">
            <span>Total</span>
            <span>{formatRupiah(cartTotal)}</span>
          </div>
        </div>

        {submitError && (
          <p className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
            {submitError}
          </p>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 shrink-0">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`w-full font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 ${GREEN_BTN} ${GREEN_BTN_DISABLED}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengirim pesanan...
            </>
          ) : (
            `Kirim Pesanan • ${formatRupiah(cartTotal)}`
          )}
        </button>
      </div>
    </>
  );
}