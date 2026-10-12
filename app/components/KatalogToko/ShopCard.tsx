"use client";

import React from "react";
import { Store, ChevronRight, UtensilsCrossed, Clock, Heart } from "lucide-react";
import { GREEN_BTN, type ShopItem } from "./katalogShared";
import { getShopStatus, type JakartaNow } from "./shopStatus";

interface ShopCardProps {
  shop: ShopItem;
  now: JakartaNow;
  isFavorite: boolean;
  isFavPending: boolean;
  onToggleFavorite: (shop: ShopItem) => void;
  onViewShop: (shop: ShopItem) => void;
  onOpenMenu: (shop: ShopItem) => void;
}

// Kartu satu toko: sepanduk, tombol favorit, status buka, info, dan tombol aksi
export default function ShopCard({
  shop,
  now,
  isFavorite,
  isFavPending,
  onToggleFavorite,
  onViewShop,
  onOpenMenu,
}: ShopCardProps) {
  const status = getShopStatus(shop, now);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between w-full group">
      <div>
        {/* Sepanduk toko (cover_url) */}
        <div className="relative h-28 sm:h-36 w-full bg-slate-200 overflow-hidden">
          {shop.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.cover_url}
              alt={`Sepanduk ${shop.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-50">
              <Store className="w-10 h-10 text-emerald-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Tombol hati (favorit) */}
          <button
            type="button"
            onClick={() => onToggleFavorite(shop)}
            disabled={isFavPending}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Hapus ${shop.name} dari favorit`
                : `Tambahkan ${shop.name} ke favorit`
            }
            className="absolute top-2.5 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center transition-all active:scale-90 disabled:opacity-70 cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-500"
              }`}
            />
          </button>

          <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white px-2.5 py-1 rounded-md shadow-xs">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className={status.isOpenNow ? "text-emerald-600" : "text-rose-500"}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Card Detail */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Logo toko (avatar_url) */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                {shop.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shop.avatar_url}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  shop.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900 text-sm leading-snug truncate group-hover:text-emerald-600 transition-colors">
                  {shop.name}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  {shop.category} • {shop.location}
                </p>
              </div>
            </div>

            {/* Jam operasional hari ini */}
            {status.todayHours && (
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600">
                  {status.todayHours}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {shop.address_detail || "Alamat belum diatur."}
          </p>
        </div>
      </div>

      {/* Bottom Action (items-stretch: tinggi kedua tombol selalu sama) */}
      <div className="p-4 pt-0">
        <div className="flex items-stretch gap-2 pt-3 border-t border-slate-100">
          {/* Lihat Toko: tombol garis hijau */}
          <button
            type="button"
            onClick={() => onViewShop(shop)}
            className="flex-1 border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors min-w-0 cursor-pointer"
          >
            <span className="truncate">Lihat Toko</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* Menu & Pesan: tombol timbul */}
          <button
            type="button"
            onClick={() => onOpenMenu(shop)}
            className={`flex-1 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${GREEN_BTN}`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Menu & Pesan</span>
          </button>
        </div>
      </div>
    </div>
  );
}