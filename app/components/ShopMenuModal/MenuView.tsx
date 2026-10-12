"use client";

import React from "react";
import { Loader2, UtensilsCrossed, ImageOff, Search, ShoppingBag, X } from "lucide-react";
import QtyStepper from "./QtyStepper";
import {
  ALL_CATEGORY,
  formatRupiah,
  getDiscountedPrice,
  getDiscountLabel,
  hasActiveDiscount,
  simpleKey,
  GREEN_BTN,
  GREEN_BTN_DISABLED,
  type ProductItem,
} from "./shared";

interface MenuViewProps {
  isLoading: boolean;
  errorMessage: string | null;
  products: ProductItem[];
  groups: { entries: [string, ProductItem[]][]; count: number };
  search: string;
  onSearchChange: (value: string) => void;
  categories: string[]; // tanpa "Semua"
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  canOrder: boolean;
  noServiceAvailable: boolean;
  cartCount: number;
  cartTotal: number;
  qtyOfProduct: (productId: string) => number;
  canAddMore: (product: ProductItem) => boolean;
  onAddSimple: (product: ProductItem) => void; // tambah produk tanpa varian
  onAddClick: (product: ProductItem) => void; // tambah (buka sheet varian bila ada)
  onChangeQty: (key: string, delta: number) => void;
  onOpenCheckout: () => void;
}

// Tampilan daftar menu: pencarian, daftar produk per kategori, dan bar keranjang
export default function MenuView({
  isLoading,
  errorMessage,
  products,
  groups,
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  canOrder,
  noServiceAvailable,
  cartCount,
  cartTotal,
  qtyOfProduct,
  canAddMore,
  onAddSimple,
  onAddClick,
  onChangeQty,
  onOpenCheckout,
}: MenuViewProps) {
  return (
    <>
      {/* Pencarian */}
      <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari menu atau kategori..."
            className="w-full bg-slate-100 text-slate-800 text-xs pl-8 pr-8 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab kategori (hanya tampil bila ada lebih dari satu kategori) */}
        {categories.length > 1 && (
          <div
            role="tablist"
            aria-label="Kategori menu"
            className="flex items-center gap-2 overflow-x-auto overscroll-x-contain no-scrollbar -mx-4 px-4 pt-0.5 pb-3"
          >
            {[ALL_CATEGORY, ...categories].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    active
                      ? GREEN_BTN
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {!canOrder && (
          <p className="text-[11px] font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
            Toko sedang tutup, pemesanan belum tersedia. Menu masih bisa dilihat.
          </p>
        )}
        {canOrder && noServiceAvailable && (
          <p className="text-[11px] font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
            Toko ini belum menerima pesanan online. Menu masih bisa dilihat.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <p className="text-xs font-medium">Memuat menu...</p>
          </div>
        ) : errorMessage ? (
          <div className="py-12 text-center">
            <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm text-slate-700">Belum ada menu</p>
            <p className="text-xs text-slate-400 mt-1">Toko ini belum menambahkan produk.</p>
          </div>
        ) : groups.count === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm text-slate-700">Menu tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain.</p>
          </div>
        ) : (
          groups.entries.map(([category, items]) => (
            <section key={category} className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {category}
              </h4>

              <ul className="space-y-2.5">
                {items.map((product) => {
                  const isSoldOut = product.track_stock && product.stock <= 0;
                  const hasVariants = product.product_variant_groups.length > 0;
                  const qty = qtyOfProduct(product.id);
                  const addDisabled = !canAddMore(product);
                  const discounted = hasActiveDiscount(product);

                  return (
                    <li
                      key={product.id}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200/80 ${
                        isSoldOut ? "opacity-60" : ""
                      }`}
                    >
                      <div className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="w-5 h-5 text-slate-300" />
                        )}
                        {discounted && (
                          <span className="absolute top-0 left-0 px-1.5 py-0.5 rounded-br-lg bg-rose-500 text-white text-[10px] font-extrabold leading-none">
                            {getDiscountLabel(product)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {product.name}
                        </p>
                        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                          <p className="text-xs font-bold text-emerald-600">
                            {formatRupiah(getDiscountedPrice(product))}
                          </p>
                          {discounted && (
                            <p className="text-[11px] text-slate-400 line-through">
                              {formatRupiah(product.price)}
                            </p>
                          )}
                        </div>

                        {/* Info stok */}
                        {product.track_stock ? (
                          isSoldOut ? (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                              Habis
                            </span>
                          ) : (
                            <span
                              className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                product.stock <= 5
                                  ? "text-amber-700 bg-amber-50"
                                  : "text-emerald-700 bg-emerald-50"
                              }`}
                            >
                              {product.stock <= 5
                                ? `Sisa ${product.stock} ${product.unit || "pcs"}`
                                : `Stok: ${product.stock} ${product.unit || "pcs"}`}
                            </span>
                          )
                        ) : (
                          <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Selalu tersedia
                          </span>
                        )}

                        {hasVariants && !isSoldOut && (
                          <p className="text-[10px] text-slate-400 mt-0.5">Ada pilihan varian</p>
                        )}
                      </div>

                      {/* Kontrol pesan */}
                      {canOrder && !noServiceAvailable && !isSoldOut && (
                        <>
                          {!hasVariants && qty > 0 ? (
                            <QtyStepper
                              quantity={qty}
                              onMinus={() => onChangeQty(simpleKey(product.id), -1)}
                              onPlus={() => onAddSimple(product)}
                              plusDisabled={addDisabled}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddClick(product)}
                              disabled={addDisabled}
                              className={`shrink-0 font-semibold text-xs px-3.5 py-2 rounded-xl ${GREEN_BTN} ${GREEN_BTN_DISABLED}`}
                            >
                              {hasVariants && qty > 0 ? `Tambah (${qty})` : "Tambah"}
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Bar keranjang */}
      {canOrder && !noServiceAvailable && cartCount > 0 && (
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onOpenCheckout}
            className={`w-full font-semibold text-sm py-3 rounded-xl flex items-center justify-between px-4 ${GREEN_BTN}`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {cartCount} item
            </span>
            <span>Lihat Pesanan • {formatRupiah(cartTotal)}</span>
          </button>
        </div>
      )}
    </>
  );
}