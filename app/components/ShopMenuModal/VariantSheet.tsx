"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  formatRupiah,
  getDiscountedPrice,
  hasActiveDiscount,
  GREEN_BTN,
  GREEN_BTN_DISABLED,
  type ProductItem,
  type VariantGroup,
  type VariantOption,
} from "./shared";

// Sheet pilihan varian
export default function VariantSheet({
  product,
  onClose,
  onConfirm,
}: {
  product: ProductItem;
  onClose: () => void;
  onConfirm: (options: VariantOption[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const toggle = (group: VariantGroup, optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.allow_multiple) {
        return {
          ...prev,
          [group.id]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      // Pilihan tunggal: klik lagi untuk membatalkan jika tidak wajib
      if (current.includes(optionId) && !group.is_required) {
        return { ...prev, [group.id]: [] };
      }
      return { ...prev, [group.id]: [optionId] };
    });
  };

  const chosenOptions = product.product_variant_groups.flatMap((g) =>
    g.product_variant_options.filter((o) => (selected[g.id] ?? []).includes(o.id))
  );

  const isValid = product.product_variant_groups.every(
    (g) => !g.is_required || (selected[g.id] ?? []).length > 0
  );

  const discounted = hasActiveDiscount(product);
  const unitPrice =
    getDiscountedPrice(product) + chosenOptions.reduce((s, o) => s + o.price_adjustment, 0);

  return (
    <div className="absolute inset-0 z-10 flex items-end bg-slate-900/40" onClick={onClose}>
      <div
        className="bg-white w-full max-h-[85%] rounded-t-3xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 truncate">{product.name}</h4>
            <p className="text-xs text-slate-500 flex items-baseline gap-1.5">
              <span className={discounted ? "font-bold text-emerald-600" : ""}>
                {formatRupiah(getDiscountedPrice(product))}
              </span>
              {discounted && (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatRupiah(product.price)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup pilihan varian"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {product.product_variant_groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-800">{group.name}</p>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    group.is_required ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {group.is_required ? "Wajib" : "Opsional"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {group.allow_multiple ? "Boleh lebih dari satu" : "Pilih satu"}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.product_variant_options.map((option) => {
                  const checked = (selected[group.id] ?? []).includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(group, option.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        checked
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 shrink-0 border-2 flex items-center justify-center ${
                            group.allow_multiple ? "rounded" : "rounded-full"
                          } ${checked ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`}
                        >
                          {checked && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {option.name}
                        </span>
                      </span>
                      {option.price_adjustment !== 0 && (
                        <span className="text-xs font-semibold text-slate-500 shrink-0">
                          {option.price_adjustment > 0 ? "+" : "-"}
                          {formatRupiah(Math.abs(option.price_adjustment))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            disabled={!isValid}
            onClick={() => onConfirm(chosenOptions)}
            className={`w-full font-semibold text-sm py-3 rounded-xl ${GREEN_BTN} ${GREEN_BTN_DISABLED}`}
          >
            Tambah • {formatRupiah(unitPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}