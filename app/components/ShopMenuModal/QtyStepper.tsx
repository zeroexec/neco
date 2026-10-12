"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";
import { GREEN_BTN, GREEN_BTN_DISABLED } from "./shared";

// Tombol +/- jumlah
export default function QtyStepper({
  quantity,
  onMinus,
  onPlus,
  plusDisabled,
}: {
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
  plusDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onMinus}
        aria-label="Kurangi"
        className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-bold text-slate-900">{quantity}</span>
      <button
        type="button"
        onClick={onPlus}
        disabled={plusDisabled}
        aria-label="Tambah"
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${GREEN_BTN} ${GREEN_BTN_DISABLED}`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}