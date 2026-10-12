"use client";

import React, { useMemo, useState } from "react";
import { Store, Loader2 } from "lucide-react";
import CategoryBar from "./KatalogToko/CategoryBar";
import ShopCard from "./KatalogToko/ShopCard";
import type { ShopItem } from "./KatalogToko/katalogShared";
import type { JakartaNow } from "./KatalogToko/shopStatus";

const ALL_CATEGORY = "Semua";

interface KatalogTokoProps {
  shops: ShopItem[];
  isLoading: boolean;
  now: JakartaNow;
  searchQuery: string; // kata kunci yang sudah dikonfirmasi lewat tombol Cari
  favoriteIds: Set<string>;
  pendingFavIds: Set<string>;
  onToggleFavorite: (shop: ShopItem) => void;
  onViewShop: (shop: ShopItem) => void;
  onOpenMenu: (shop: ShopItem) => void;
}

// Katalog toko: bar kategori + jumlah hasil + grid kartu toko
export default function KatalogToko({
  shops,
  isLoading,
  now,
  searchQuery,
  favoriteIds,
  pendingFavIds,
  onToggleFavorite,
  onViewShop,
  onOpenMenu,
}: KatalogTokoProps) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

  // Daftar kategori diambil dari kolom shops.category
  const categories = useMemo(() => {
    const unique = Array.from(new Set(shops.map((s) => s.category).filter(Boolean))).sort();
    return [ALL_CATEGORY, ...unique];
  }, [shops]);

  const filteredShops = shops.filter((shop) => {
    const matchesCategory = selectedCategory === ALL_CATEGORY || shop.category === selectedCategory;
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <CategoryBar
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        <div className="flex items-center text-xs sm:text-sm text-slate-500 px-0.5">
          <span>
            Menampilkan <strong>{filteredShops.length} toko</strong>
            {searchQuery && (
              <>
                {" "}
                untuk &ldquo;<strong>{searchQuery}</strong>&rdquo;
              </>
            )}
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs font-medium text-slate-600">Memuat daftar toko...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base text-slate-700">Toko tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              Belum ada toko yang terdaftar atau coba gunakan kata kunci pencarian lain.
            </p>
          </div>
        ) : (
          /* Grid Card Responsive */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                now={now}
                isFavorite={favoriteIds.has(shop.id)}
                isFavPending={pendingFavIds.has(shop.id)}
                onToggleFavorite={onToggleFavorite}
                onViewShop={onViewShop}
                onOpenMenu={onOpenMenu}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}