"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Minus,
  Plus,
  Receipt,
  Loader2,
  X,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { Modal } from "./PosModals";
import { formatRp, GREEN_BTN, GREEN_BTN_DISABLED } from "./utils";
import { useKeyboardInset } from "./useKeyboardInset";

export interface PanelCartItem {
  id: string; // products.id (uuid)
  name: string;
  price: number; // harga satuan setelah diskon
  originalPrice: number; // harga satuan sebelum diskon
  quantity: number;
  stock: number | null; // null = tanpa batas stok (products.track_stock = false)
}

// Pembayaran hanya tunai
export type PaymentMethod = "cash";

/** Data pembayaran yang dikirim ke parent, dipetakan ke kolom tabel `orders` */
export interface CheckoutPayment {
  paymentMethod: PaymentMethod; // -> orders.payment_method
  subtotal: number; // -> orders.subtotal (sebelum diskon)
  discountAmount: number; // -> orders.discount
  totalAmount: number; // -> orders.total_amount
  cashGiven: number | null; // -> orders.cash_given (null jika non-tunai)
  changeAmount: number | null; // -> orders.change_amount (null jika non-tunai)
  notes: string | null; // -> orders.notes
}

export interface CartPanelProps {
  cart: PanelCartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (payment: CheckoutPayment) => void;
  /**
   * Dipanggil saat stok kurang. Modal tambah stok ditampilkan oleh parent (page.tsx).
   * increment = true  -> dipicu tombol "+", parent menaikkan jumlah 1 setelah stok ditambah
   * increment = false -> dipicu tombol "Bayar", jumlah tidak berubah
   */
  onStockShortage: (id: string, increment: boolean) => void;
  isSubmitting: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const DENOMINATIONS = [5000, 10000, 20000, 50000, 100000];

// Saat keyboard HP muncul, pastikan input yang difokus tidak tertutup
const revealOnFocus = (e: React.FocusEvent<HTMLElement>) => {
  const el = e.currentTarget;
  window.setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 280);
};

// Enter = selesai: tutup keyboard
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") e.currentTarget.blur();
};

/* ---------- Tombol keranjang bulat (mobile) ---------- */

/**
 * Tombol bulat di pojok kanan bawah. Posisinya dihitung dari --mobile-nav-h
 * (tinggi bottom nav yang diset di layout dashboard), jadi selalu berada tepat di atas
 * bottom nav dan tidak tertimpa. Di desktop (lg ke atas) tombol disembunyikan karena
 * panel keranjang sudah tampil permanen.
 */
function CartFabBase({
  count,
  total,
  onClick,
}: {
  count: number;
  total: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Buka keranjang, ${count} barang, total ${formatRp(total)}`}
      className={`lg:hidden fixed right-4 bottom-[calc(var(--mobile-nav-h)_+_1rem)] z-30 w-14 h-14 rounded-full ${GREEN_BTN} flex items-center justify-center ring-4 ring-white focus-visible:outline-2 focus-visible:outline-emerald-700`}
    >
      <ShoppingBag className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-emerald-700 text-[10px] font-extrabold flex items-center justify-center shadow-md ring-2 ring-emerald-600">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export const CartFab = memo(CartFabBase);

/* ---------- Panel keranjang ---------- */
// Mobile: bottom sheet yang naik dari bawah (dibuka lewat CartFab).
// Desktop (lg): kolom tetap di sisi kanan.

function CartPanel({
  cart,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
  onStockShortage,
  isSubmitting,
  isOpen,
  onClose,
}: CartPanelProps) {
  const [cashGiven, setCashGiven] = useState("");
  const [notes, setNotes] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Keyboard HP: sheet naik di atas keyboard & tingginya mengikuti area yang terlihat
  const { inset: kbInset, height: kbHeight } = useKeyboardInset();
  const sheetStyle =
    kbInset > 0
      ? ({ "--kb": `${kbInset}px`, "--vvh": `${kbHeight}px` } as React.CSSProperties)
      : undefined;

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
  const discountTotal = subtotal - grandTotal;

  const cashNumber = parseInt(cashGiven, 10) || 0;
  const changeAmount = cashNumber - grandTotal;
  const isEnough = cashNumber >= grandTotal;

  // Reset form pembayaran saat keranjang kosong (setelah bayar / dibatalkan)
  useEffect(() => {
    if (cart.length === 0) {
      setCashGiven("");
      setNotes("");
    }
  }, [cart.length]);

  // Tutup sheet dengan tombol Escape (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showClearConfirm) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, showClearConfirm]);

  // Template nominal: uang pas + pembulatan ke atas ke pecahan umum
  const quickAmounts = useMemo(() => {
    if (grandTotal <= 0) return [];
    const set = new Set<number>([grandTotal]);
    DENOMINATIONS.forEach((d) => set.add(Math.ceil(grandTotal / d) * d));
    return Array.from(set)
      .sort((a, b) => a - b)
      .slice(0, 4);
  }, [grandTotal]);

  const handleCashInput = (value: string) => {
    setCashGiven(value.replace(/\D/g, "").slice(0, 10));
  };

  const handleIncrement = (item: PanelCartItem) => {
    if (item.stock !== null && item.quantity + 1 > item.stock) {
      onStockShortage(item.id, true);
      return;
    }
    onUpdateQuantity(item.id, 1);
  };

  const handleCheckout = () => {
    // Validasi ulang stok (bisa berubah sejak barang dimasukkan)
    const short = cart.find((i) => i.stock !== null && i.quantity > i.stock);
    if (short) {
      onStockShortage(short.id, false);
      return;
    }

    onCheckout({
      paymentMethod: "cash",
      subtotal,
      discountAmount: discountTotal,
      totalAmount: grandTotal,
      cashGiven: cashNumber,
      changeAmount,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  const canCheckout = cart.length > 0 && !isSubmitting && isEnough;

  return (
    <>
      {/* Latar gelap di belakang sheet (mobile) */}
      <div
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        aria-label="Keranjang"
        style={sheetStyle}
        className={`fixed inset-x-0 bottom-[var(--kb,0px)] z-40 flex max-h-[calc(var(--vvh,100dvh)*0.94)] flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:max-h-none lg:h-full lg:w-96 lg:shrink-0 lg:translate-y-0 lg:rounded-none lg:border-l lg:border-slate-200 lg:shadow-none ${
          isOpen ? "translate-y-0" : "translate-y-full pointer-events-none lg:pointer-events-auto"
        }`}
      >
        {/* Handle sheet (mobile) */}
        <div className="lg:hidden mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">Transaksi Kasir</h2>
              <p className="text-[11px] text-slate-400">{totalItemCount} item dimasukkan</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs text-rose-600 font-semibold hover:bg-rose-50 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Tutup keranjang"
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Daftar item */}
        <div className="flex-1 min-h-[9rem] overflow-y-auto overscroll-contain p-3.5 lg:p-3 space-y-2.5 lg:space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 lg:h-full lg:py-6 text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 stroke-1 text-emerald-200" />
              <p className="text-xs font-medium">Belum ada barang dipilih</p>
            </div>
          ) : (
            cart.map((item) => {
              const overStock = item.stock !== null && item.quantity > item.stock;
              const atLimit = item.stock !== null && item.quantity >= item.stock;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3.5 lg:p-3 rounded-2xl border ${
                    overStock ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] lg:text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-xs lg:text-[11px] font-semibold text-emerald-600">
                      {formatRp(item.price * item.quantity)}
                      {item.originalPrice > item.price && (
                        <span className="ml-1.5 text-[10px] font-medium text-slate-400 line-through">
                          {formatRp(item.originalPrice * item.quantity)}
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        atLimit ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      Stok: {item.stock === null ? "Tanpa batas" : item.stock}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-full border border-slate-200">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      aria-label={`Kurangi ${item.name}`}
                      className="w-9 h-9 lg:w-7 lg:h-7 rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm lg:text-xs font-bold w-7 lg:w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleIncrement(item)}
                      aria-label={`Tambah ${item.name}`}
                      className={`w-9 h-9 lg:w-7 lg:h-7 rounded-full ${GREEN_BTN} flex items-center justify-center`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total, pembayaran & bayar */}
        <div className={`px-4 pt-3 ${
            kbInset > 0 ? "pb-3" : "pb-[calc(0.875rem_+_env(safe-area-inset-bottom))]"
          } lg:pb-3.5 border-t border-slate-100 space-y-2.5 bg-slate-50/60 shrink-0 overflow-y-auto overscroll-contain max-h-[calc(var(--vvh,100dvh)*0.55)] lg:max-h-none`}>
          {discountTotal > 0 && (
            <div className="px-1 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatRp(subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-rose-600">
                <span>Diskon</span>
                <span className="tabular-nums">-{formatRp(discountTotal)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 px-4 py-3 text-white shadow-md shadow-emerald-600/25">
            <span className="text-xs font-semibold text-emerald-50">Total</span>
            <span className="text-lg font-extrabold">{formatRp(grandTotal)}</span>
          </div>

          {cart.length > 0 && (
            <div className="space-y-2">
              {/* Uang diterima */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder="Uang diterima"
                  value={cashNumber > 0 ? cashNumber.toLocaleString("id-ID") : ""}
                  onChange={(e) => handleCashInput(e.target.value)}
                  onFocus={revealOnFocus}
                  onKeyDown={blurOnEnter}
                  className="w-full pl-10 pr-3 py-3 lg:py-2.5 text-base lg:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashGiven(String(amt))}
                    className={`py-2.5 lg:py-2 text-xs lg:text-[11px] font-bold rounded-xl border transition-colors ${
                      cashNumber === amt
                        ? `${GREEN_BTN} border-emerald-600`
                        : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {amt === grandTotal
                      ? "Uang Pas"
                      : `${(amt / 1000).toLocaleString("id-ID")}k`}
                  </button>
                ))}
              </div>

              {cashNumber > 0 && (
                <div
                  className={`flex justify-between items-center px-3.5 py-2.5 rounded-2xl text-xs font-bold ${
                    isEnough ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <span>{isEnough ? "Kembalian" : "Kurang"}</span>
                  <span className="text-sm">{formatRp(Math.abs(changeAmount))}</span>
                </div>
              )}

              {/* Catatan (opsional) */}
              <input
                type="text"
                placeholder="Catatan (opsional)"
                value={notes}
                maxLength={200}
                enterKeyHint="done"
                onChange={(e) => setNotes(e.target.value)}
                onFocus={revealOnFocus}
                onKeyDown={blurOnEnter}
                className="w-full px-3.5 py-3 lg:py-2.5 text-base lg:text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>
          )}

          <button
            disabled={!canCheckout}
            onClick={handleCheckout}
            className={`w-full py-3.5 lg:py-3 ${GREEN_BTN} ${GREEN_BTN_DISABLED} font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm lg:text-xs`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Bayar</span>
          </button>
        </div>
      </aside>

      {/* Modal konfirmasi batalkan transaksi */}
      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Batalkan transaksi?</h3>
            <p className="text-xs text-slate-500 mt-0.5">Semua barang di keranjang akan dihapus.</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowClearConfirm(false)}
            className="flex-1 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Kembali
          </button>
          <button
            onClick={() => {
              onClearCart();
              setShowClearConfirm(false);
            }}
            className="flex-1 py-2.5 text-xs font-bold rounded-2xl bg-rose-600 hover:bg-rose-700 text-white"
          >
            Ya, Batalkan
          </button>
        </div>
      </Modal>
    </>
  );
}

export default memo(CartPanel);