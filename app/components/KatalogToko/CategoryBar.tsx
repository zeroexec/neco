"use client";

import React from "react";
import { GREEN_BTN } from "./katalogShared";

// Bar kategori (dari kolom shops.category).
// top-14 = tinggi baris atas di Header (56px). Ubah jika tinggi itu diubah.
export default function CategoryBar({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}) {
  return (
    <div className="sticky top-14 z-20 bg-white border-b border-slate-200 shadow-xs w-full">
      {/* pb ekstra: memberi ruang bagi bayangan tombol timbul agar tidak terpotong */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto pt-2.5 pb-3.5 no-scrollbar w-full">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs shrink-0 cursor-pointer ${
              selected === cat
                ? `${GREEN_BTN} font-semibold`
                : "bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 active:bg-slate-200 transition-colors"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}