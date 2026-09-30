"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Trash2, Minus, Plus, Receipt, Loader2, X, CheckCircle2 } from "lucide-react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CheckoutPayment {
  cashGiven: number;
  changeAmount: number;
}

export interface CartPanelProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (payment: CheckoutPayment) => void;
  isSubmitting: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const DENOMINATIONS = [5000, 10000, 20000, 50000, 100000];

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function CartPanel({
  cart,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
  isSubmitting,
  isOpen,
  onClose,
}: CartPanelProps) {
  const [cashGiven, setCashGiven] = useState("");

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const cashNumber = parseInt(cashGiven, 10) || 0;
  const changeAmount = cashNumber - grandTotal;
  const isEnough = cashNumber >= grandTotal;

  // Reset uang diterima saat keranjang kosong (setelah bayar / dibatalkan)
  useEffect(() => {
    if (cart.length === 0) setCashGiven("");
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

  const canCheckout = cart.length > 0 && !isSubmitting && isEnough;

  return (
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
            onClick={onClearCart}
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
          cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                <p className="text-[11px] font-semibold text-emerald-600">
                  {formatRp(item.price * item.quantity)}
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
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="p-0.5 rounded-md text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
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
            {/* Input uang diterima */}
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

            {/* Template nominal */}
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
                  {amt === grandTotal ? "Uang Pas" : `${(amt / 1000).toLocaleString("id-ID")}k`}
                </button>
              ))}
            </div>

            {/* Kembalian */}
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
          </div>
        )}

        <button
          disabled={!canCheckout}
          onClick={() => onCheckout({ cashGiven: cashNumber, changeAmount })}
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
  );
}