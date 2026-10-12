"use client";

import React from "react";
import { X, Edit2, Trash2, Percent, Image as ImageIcon, ChevronRight } from "lucide-react";
import {
  Product,
  formatRp,
  hasActiveDiscount,
  getDiscountedPrice,
  getDiscountLabel,
} from "./utils";

interface ProductActionModalProps {
  product: Product | null; // null = tertutup
  onClose: () => void;
  onToggleAvailability: (product: Product) => void;
  onDiscount: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

// Modal pilihan aksi produk (muncul saat kartu produk diklik)
export default function ProductActionModal({
  product,
  onClose,
  onToggleAvailability,
  onDiscount,
  onEdit,
  onDelete,
}: ProductActionModalProps) {
  if (!product) return null;

  const discounted = hasActiveDiscount(product);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100"
      >
        {/* Header: ringkasan produk */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-zinc-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-zinc-900 text-sm leading-tight truncate">
              {product.name}
            </h2>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xs font-bold text-emerald-600 tabular-nums">
                {formatRp(getDiscountedPrice(product))}
              </span>
              {discounted && (
                <span className="text-[10px] text-zinc-400 line-through tabular-nums">
                  {formatRp(product.price)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 shrink-0 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-all duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pilihan aksi */}
        <div className="p-2 text-sm">
          {/* Saklar tampilkan di toko */}
          <button
            type="button"
            role="switch"
            aria-checked={product.is_available}
            onClick={() => onToggleAvailability(product)}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer select-none"
          >
            <span className="font-medium text-zinc-800">Tampilkan di toko</span>
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                product.is_available ? "bg-emerald-600" : "bg-zinc-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  product.is_available ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onDiscount(product)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left font-medium text-zinc-800 cursor-pointer"
          >
            <Percent className="w-4 h-4 text-emerald-600" />
            <span className="flex-1">{discounted ? "Ubah diskon" : "Buat diskon"}</span>
            {discounted ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">
                {getDiscountLabel(product)}
              </span>
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onEdit(product)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left font-medium text-zinc-800 cursor-pointer"
          >
            <Edit2 className="w-4 h-4 text-zinc-500" />
            <span className="flex-1">Edit</span>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(product)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-50 active:bg-rose-100 transition-colors text-left font-medium text-rose-600 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span className="flex-1">Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
}