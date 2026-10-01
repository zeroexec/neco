"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Minus,
  Plus,
  Receipt,
  Loader2,
  X,
  CheckCircle2,
  Banknote,
  QrCode,
  Landmark,
} from "lucide-react";

export interface CartItem {
  id: string; // products.id (uuid)
  name: string;
  price: number;
  quantity: number;
  stock: number | null; // null = tanpa batas stok (products.track_stock = false)
}

export type PaymentMethod = "cash" | "qris" | "transfer";

/** Data pembayaran yang dikirim ke parent, dipetakan ke kolom tabel `orders` */
export interface CheckoutPayment {
  paymentMethod: PaymentMethod; // -> orders.payment_method
  subtotal: number; // -> orders.subtotal
  totalAmount: number; // -> orders.total_amount
  cashGiven: number | null; // -> orders.cash_given (null jika non-tunai)
  changeAmount: number | null; // -> orders.change_amount (null jika non-tunai)
  notes: string | null; // -> orders.notes
}

export interface CartPanelProps {
  cart: CartItem[];
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

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "qris", label: "QRIS", icon: QrCode },
  { value: "transfer", label: "Transfer", icon: Landmark },
];

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/* ---------- Modal dasar (custom, pengganti alert/confirm browser) ---------- */

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

/* ---------- Panel keranjang ---------- */

export default function CartPanel({
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const isCash = paymentMethod === "cash";
  const cashNumber = parseInt(cashGiven, 10) || 0;
  const changeAmount = cashNumber - grandTotal;
  const isEnough = cashNumber >= grandTotal;

  // Reset form pembayaran saat keranjang kosong (setelah bayar / dibatalkan)
  useEffect(() => {
    if (cart.length === 0) {
      setCashGiven("");
      setNotes("");
      setPaymentMethod("cash");
    }
  }, [cart.length]);

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

  const handleIncrement = (item: CartItem) => {
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
      paymentMethod,
      subtotal: grandTotal,
      totalAmount: grandTotal,
      cashGiven: isCash ? cashNumber : null,
      changeAmount: isCash ? changeAmount : null,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  const canCheckout =
    cart.length > 0 && !isSubmitting && (!isCash || isEnough);

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Transaksi Kasir</h2>
              <p className="text-[11px] text-slate-400">{totalItemCount} item dimasukkan</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          )}
        </div>

        {/* Daftar item */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Belum ada barang dipilih</p>
            </div>
          ) : (
            cart.map((item) => {
              const overStock = item.stock !== null && item.quantity > item.stock;
              const atLimit = item.stock !== null && item.quantity >= item.stock;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border ${
                    overStock
                      ? "bg-rose-50 border-rose-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-[11px] font-semibold text-emerald-600">
                      {formatRp(item.price * item.quantity)}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        atLimit ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      Stok: {item.stock === null ? "Tanpa batas" : item.stock}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="p-0.5 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleIncrement(item)}
                      className="p-0.5 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total, Pembayaran & Bayar */}
        <div className="p-3.5 border-t border-slate-100 space-y-2.5 bg-slate-50/50 shrink-0">
          <div className="flex justify-between font-extrabold text-base text-slate-900">
            <span>Total</span>
            <span className="text-emerald-600">{formatRp(grandTotal)}</span>
          </div>

          {cart.length > 0 && (
            <div className="space-y-2">
              {/* Metode pembayaran */}
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                      paymentMethod === value
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Khusus tunai: uang diterima, template nominal, kembalian */}
              {isCash && (
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Uang diterima"
                      value={cashNumber > 0 ? cashNumber.toLocaleString("id-ID") : ""}
                      onChange={(e) => handleCashInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashGiven(String(amt))}
                        className={`py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${
                          cashNumber === amt
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
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
                      className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs font-bold ${
                        isEnough
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span>{isEnough ? "Kembalian" : "Kurang"}</span>
                      <span className="text-sm">{formatRp(Math.abs(changeAmount))}</span>
                    </div>
                  )}
                </>
              )}

              {/* Catatan (opsional) */}
              <input
                type="text"
                placeholder="Catatan (opsional)"
                value={notes}
                maxLength={200}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>
          )}

          <button
            disabled={!canCheckout}
            onClick={handleCheckout}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Bayar</span>
          </button>
        </div>
      </div>

      {/* Modal konfirmasi batalkan transaksi */}
      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Batalkan transaksi?</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Semua barang di keranjang akan dihapus.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowClearConfirm(false)}
            className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Kembali
          </button>
          <button
            onClick={() => {
              onClearCart();
              setShowClearConfirm(false);
            }}
            className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
          >
            Ya, Batalkan
          </button>
        </div>
      </Modal>
    </>
  );
}