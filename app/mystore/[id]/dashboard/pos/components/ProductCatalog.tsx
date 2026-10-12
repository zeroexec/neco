"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, Infinity as InfinityIcon, Minus, Plus, Trash2 } from "lucide-react";
import {
  formatRp,
  hasStockLimit,
  isSoldOutProduct,
  GREEN_BTN,
  type Product,
} from "./utils";
import { useDebouncedValue } from "./useDebouncedValue";
import { useKeyboardInset } from "./useKeyboardInset";

interface ProductCatalogProps {
  products: Product[]; // sudah terfilter
  allProducts: Product[]; // seluruh produk, dipakai untuk saran pencarian
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onSearch: (value: string) => void;
  qtyById: Record<string, number>;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
}

function ProductImage({ product }: { product: Product }) {
  const src = product.image_url;
  if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
    return (
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    );
  }
  return <span className="text-2xl">📦</span>;
}

/* ---------- Kartu produk (memo: hanya dirender ulang bila produk / jumlahnya berubah) ---------- */

const ProductCard = memo(function ProductCard({
  product,
  qtyInCart,
  onAdd,
  onUpdateQuantity,
}: {
  product: Product;
  qtyInCart: number;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
}) {
  const tracksStock = product.track_stock ?? true;
  const limited = hasStockLimit(product);
  const isSoldOut = isSoldOutProduct(product);
  const isInactive = !product.is_available;
  // Habis tetap bisa diklik (untuk tambah stok); nonaktif manual diblokir
  const isBlocked = isInactive && !isSoldOut;
  const isLowStock =
    limited && !isSoldOut && (product.stock as number) <= (product.min_stock ?? 0);
  const inCart = qtyInCart > 0;

  const statusColor = isSoldOut
    ? "text-rose-500"
    : isInactive
    ? "text-slate-400"
    : isLowStock
    ? "text-amber-600"
    : !tracksStock
    ? "text-emerald-600"
    : "text-slate-500";

  return (
    // content-visibility: kartu di luar layar tidak dihitung layout/paint-nya (grid besar tetap ringan).
    // Penanda "di keranjang" memakai border + ring inset agar tidak terpotong containment.
    <div
      className={`bg-white border rounded-2xl p-2.5 flex flex-col gap-2 select-none [content-visibility:auto] [contain-intrinsic-size:auto_230px] ${
        isBlocked ? "opacity-50 bg-slate-50" : isSoldOut ? "opacity-80" : ""
      } ${
        inCart
          ? "border-emerald-500 ring-1 ring-inset ring-emerald-500 bg-emerald-50/30"
          : "border-slate-200"
      }`}
    >
      {/* Gambar */}
      <div className="w-full h-16 sm:h-20 bg-emerald-50/70 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
        <ProductImage product={product} />
      </div>

      {/* Info: kategori + SKU, nama, harga, lalu stok di bawah harga */}
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 truncate">
            {product.category || "Umum"}
          </span>
          {product.sku && (
            <span className="text-[9px] font-mono text-slate-400 shrink-0 max-w-[45%] truncate">
              {product.sku}
            </span>
          )}
        </div>

        {/* Tinggi nama dikunci 2 baris agar harga & tombol selalu sejajar antar kartu */}
        <h3
          title={product.name}
          className="text-[13px] font-bold text-slate-800 leading-tight line-clamp-2 min-h-[2.1rem]"
        >
          {product.name}
        </h3>

        <div className="mt-auto space-y-0.5">
          <p className="text-sm font-extrabold text-emerald-600 leading-none tabular-nums">
            {formatRp(Number(product.price))}
          </p>
          <p
            className={`text-[10px] font-semibold flex items-center gap-1 leading-none pt-0.5 ${statusColor}`}
          >
            {isSoldOut ? (
              "Habis"
            ) : isInactive ? (
              "Nonaktif"
            ) : !tracksStock ? (
              <>
                <InfinityIcon className="w-3 h-3" /> Tersedia
              </>
            ) : limited ? (
              `Stok ${product.stock} ${product.unit || "pcs"}`
            ) : (
              "Tersedia"
            )}
          </p>
        </div>
      </div>

      {/* Aksi: tombol "Pilih" berubah jadi - qty + (tinggi tetap, tidak menggeser kartu lain) */}
      {inCart ? (
        <div className="flex items-center gap-1 h-9 shrink-0">
          <button
            type="button"
            onClick={() => onUpdateQuantity(product.id, -1)}
            aria-label={
              qtyInCart === 1 ? `Hapus ${product.name} dari keranjang` : `Kurangi ${product.name}`
            }
            className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center active:scale-95 focus-visible:outline-2 focus-visible:outline-emerald-600 ${
              qtyInCart === 1
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-200"
            }`}
          >
            {qtyInCart === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </button>

          <span
            className="flex-1 text-center text-sm font-extrabold text-emerald-700 tabular-nums"
            aria-live="polite"
          >
            {qtyInCart}
          </span>

          <button
            type="button"
            onClick={() => onUpdateQuantity(product.id, 1)}
            aria-label={`Tambah ${product.name}`}
            className={`w-9 h-9 shrink-0 rounded-lg ${GREEN_BTN} flex items-center justify-center focus-visible:outline-2 focus-visible:outline-emerald-600`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isBlocked}
          onClick={() => onAdd(product)}
          className={`h-9 w-full shrink-0 rounded-lg text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            isBlocked
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : isSoldOut
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-100 active:scale-[0.98]"
              : GREEN_BTN
          }`}
        >
          {isBlocked ? "Nonaktif" : isSoldOut ? "Tambah stok" : "Pilih"}
        </button>
      )}
    </div>
  );
});

/* ---------- Kolom pencarian + saran ----------
   Teks ketikan & saran dikelola LOKAL di sini, jadi mengetik tidak merender ulang halaman,
   keranjang, atau kartu produk. Filter daftar baru berjalan saat tombol cari / Enter / saran dipilih. */

const SearchBox = memo(function SearchBox({
  allProducts,
  onSearch,
}: {
  allProducts: Product[];
  onSearch: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(text, 200);
  const { height: visibleHeight } = useKeyboardInset();

  // Tutup saran saat klik/sentuh di luar
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // Saran: nama atau SKU (SKU persis > diawali > mengandung), maksimal 6
  const suggestions = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    const scored: { p: Product; rank: number }[] = [];
    for (const p of allProducts) {
      const name = p.name.toLowerCase();
      const sku = (p.sku ?? "").toLowerCase();
      let rank = -1;
      if (sku && sku === q) rank = 0;
      else if (name.startsWith(q) || (sku && sku.startsWith(q))) rank = 1;
      else if (name.includes(q) || (sku && sku.includes(q))) rank = 2;
      if (rank >= 0) scored.push({ p, rank });
    }
    return scored
      .sort((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name))
      .slice(0, 6)
      .map((x) => x.p);
  }, [allProducts, debounced]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [suggestions]);

  const hasText = text.trim().length > 0;
  const showList = isOpen && hasText && debounced.trim().length > 0;

  const run = (value: string) => {
    onSearch(value);
    setIsOpen(false);
    inputRef.current?.blur(); // tutup keyboard HP agar hasil langsung terlihat
  };

  const pick = (p: Product) => {
    setText(p.name);
    run(p.name);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIdx((i) => (suggestions.length ? (i + 1) % suggestions.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (suggestions.length ? (i <= 0 ? suggestions.length - 1 : i - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && activeIdx >= 0 && suggestions[activeIdx]) pick(suggestions[activeIdx]);
      else run(text);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Tinggi daftar saran menyesuaikan area yang terlihat saat keyboard HP terbuka
  const listMaxHeight = visibleHeight > 0 ? Math.min(288, Math.round(visibleHeight * 0.4)) : 288;

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls="pos-search-suggestions"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Cari nama barang / SKU..."
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setIsOpen(true);
          if (v.trim() === "") onSearch(""); // kolom dikosongkan = daftar kembali penuh
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full pl-4 pr-12 py-2.5 text-base sm:text-xs bg-white sm:bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
      />
      <button
        type="button"
        onClick={() => run(text)}
        aria-label="Cari"
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl ${GREEN_BTN} flex items-center justify-center focus-visible:outline-2 focus-visible:outline-emerald-700`}
      >
        <Search className="w-4 h-4" />
      </button>

      {showList && (
        <ul
          id="pos-search-suggestions"
          role="listbox"
          style={{ maxHeight: listMaxHeight }}
          className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-y-auto overscroll-contain bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-[11px] text-slate-400">
              Tidak ada saran. Tekan tombol cari untuk mencari.
            </li>
          ) : (
            suggestions.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  // onPointerDown + preventDefault: input tidak kehilangan fokus sebelum pilihan terbaca
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left ${
                    i === activeIdx ? "bg-emerald-50" : "hover:bg-slate-50 active:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate">{p.name}</span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {p.category || "Umum"}
                    </span>
                  </span>
                  <span className="shrink-0 flex flex-col items-end">
                    {p.sku && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {p.sku}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-emerald-600 mt-0.5">
                      {formatRp(Number(p.price))}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
});

/* ---------- Katalog ---------- */

function ProductCatalog({
  products,
  allProducts,
  categories,
  selectedCategory,
  onSelectCategory,
  onSearch,
  qtyById,
  isLoading,
  errorMessage,
  onRetry,
  onAdd,
  onUpdateQuantity,
}: ProductCatalogProps) {
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden p-2.5 sm:p-3 lg:p-5 gap-2.5 sm:gap-3">
      {/* Pencarian */}
      <div className="shrink-0 sm:bg-white sm:p-2.5 sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-xs">
        <SearchBox allProducts={allProducts} onSearch={onSearch} />
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 shrink-0">
          <span>{errorMessage}</span>
          <button onClick={onRetry} className="font-bold hover:underline shrink-0">
            Coba lagi
          </button>
        </div>
      )}

      {/* Kategori */}
      <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain no-scrollbar shrink-0 pt-0.5 pb-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              selectedCategory === cat
                ? GREEN_BTN
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-emerald-50 active:bg-emerald-50 hover:text-emerald-700 active:text-emerald-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid produk. pb-24 memberi ruang agar tombol keranjang bulat tidak menutupi baris terakhir */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-1 pb-24 lg:pb-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" /> Memuat data produk...
          </div>
        ) : products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <p>Produk tidak ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                qtyInCart={qtyById[product.id] || 0}
                onAdd={onAdd}
                onUpdateQuantity={onUpdateQuantity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ProductCatalog);