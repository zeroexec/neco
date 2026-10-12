"use client";

import React, { memo } from "react";
import { Image as ImageIcon, AlertCircle, Infinity as InfinityIcon } from "lucide-react";
import {
  Product,
  formatRp,
  hasActiveDiscount,
  getDiscountedPrice,
  getDiscountLabel,
} from "./utils";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

// Seluruh kartu bisa diklik -> membuka modal opsi produk
function ProductCard({ product, onClick }: ProductCardProps) {
  const tracksStock = product.track_stock ?? true;
  const isOutOfStock = tracksStock && product.stock <= 0;
  const isLowStock =
    tracksStock && product.stock > 0 && product.stock <= (product.min_stock ?? 0);
  const discounted = hasActiveDiscount(product);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(product);
        }
      }}
      className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-sm hover:border-emerald-300 active:scale-[0.99] transition-all flex flex-col justify-between gap-3 group relative cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      {discounted && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">
          {getDiscountLabel(product)}
        </span>
      )}

      {/* Gambar & info */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-zinc-300" />
          )}
        </div>

        <div className={`flex-1 min-w-0 space-y-1 ${discounted ? "pr-12" : ""}`}>
          <h3 className="font-semibold text-zinc-900 text-sm leading-snug line-clamp-1">
            {product.name}
          </h3>

          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-zinc-500">
            {product.category && (
              <span className="px-2 py-0.5 bg-zinc-100 rounded-md font-medium text-zinc-600">
                {product.category}
              </span>
            )}
            {product.sku && <span className="font-mono text-zinc-400">{product.sku}</span>}
          </div>

          {/* Harga (dengan harga coret bila ada diskon) */}
          <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
            <p className="font-bold text-zinc-900 text-sm tabular-nums">
              {formatRp(getDiscountedPrice(product))}
            </p>
            {discounted && (
              <p className="text-[11px] text-zinc-400 line-through tabular-nums">
                {formatRp(product.price)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer: stok & status (status hanya tampilan; ubah lewat modal opsi) */}
      <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-[11px]">
          {!tracksStock ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <InfinityIcon className="w-3 h-3" /> Selalu tersedia
            </span>
          ) : isOutOfStock ? (
            <span className="text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Habis
            </span>
          ) : isLowStock ? (
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Menipis: {product.stock} {product.unit || "pcs"}
            </span>
          ) : (
            <span className="text-zinc-500">
              Stok:{" "}
              <strong className="text-zinc-800 font-medium">{product.stock}</strong>{" "}
              {product.unit || "pcs"}
            </span>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
            product.is_available ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              product.is_available ? "bg-emerald-600" : "bg-zinc-400"
            }`}
          />
          <span>{product.is_available ? "Aktif" : "Nonaktif"}</span>
        </span>
      </div>
    </div>
  );
}

export default memo(ProductCard);