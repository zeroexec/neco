"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { formatRupiah, GREEN_BTN, type ServiceType } from "./shared";

// Tampilan setelah pesanan berhasil dikirim
export default function SuccessView({
  orderNumber,
  orderType,
  orderTotal,
  orderDiscount,
  shopName,
  onClose,
}: {
  orderNumber: number | null;
  orderType: ServiceType;
  orderTotal: number;
  orderDiscount: number;
  shopName: string;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center gap-3">
      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <div>
        <p className="font-bold text-base text-slate-900">Pesanan berhasil dikirim!</p>
        <p className="text-xs text-slate-500 mt-1">Nomor pesanan Anda</p>
        <p className="text-3xl font-extrabold text-emerald-600 mt-1">#{orderNumber}</p>
      </div>
      <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
        {orderType === "delivery"
          ? "Pesanan akan diantar ke alamat Anda. Toko akan menghubungi Anda untuk konfirmasi."
          : `Silakan ambil pesanan Anda di ${shopName} setelah pesanan siap.`}
      </p>

      <div>
        <p className="text-sm font-bold text-slate-900">Total {formatRupiah(orderTotal)}</p>
        {orderDiscount > 0 && (
          <p className="text-[11px] font-semibold text-rose-600 mt-0.5">
            Hemat {formatRupiah(orderDiscount)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`mt-2 w-full max-w-xs font-semibold text-sm py-3 rounded-xl ${GREEN_BTN}`}
      >
        Selesai
      </button>
    </div>
  );
}