"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2 } from "lucide-react";
import {
  Product,
  DiscountType,
  formatRp,
  hasActiveDiscount,
  GREEN_BTN,
  GREEN_BTN_DISABLED,
} from "./utils";

interface DiscountModalProps {
  product: Product | null; // null = tertutup
  onClose: () => void;
  onSaved: () => void;
}

// ISO -> nilai untuk <input type="datetime-local"> (waktu lokal)
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DiscountModal({ product, onClose, onSaved }: DiscountModalProps) {
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Isi ulang form setiap kali produk berganti
  useEffect(() => {
    if (!product) return;
    setType(product.discount_type ?? "percent");
    setValue(product.discount_value ? String(product.discount_value) : "");
    setEndsAt(toLocalInput(product.discount_ends_at));
    setError(null);
  }, [product]);

  if (!product) return null;

  const numValue = Number(value);
  const validate = (): string | null => {
    if (!value || isNaN(numValue) || numValue <= 0) return "Isi nilai diskon lebih dari 0.";
    if (type === "percent" && numValue > 100) return "Diskon persen maksimal 100.";
    if (type === "nominal" && numValue > product.price)
      return "Diskon nominal tidak boleh melebihi harga produk.";
    if (endsAt && new Date(endsAt).getTime() <= Date.now())
      return "Batas waktu diskon harus di masa depan.";
    return null;
  };

  const previewPrice = Math.max(
    0,
    type === "percent" ? product.price - (product.price * numValue) / 100 : product.price - numValue
  );

  const save = async (payload: {
    discount_type: DiscountType | null;
    discount_value: number;
    discount_ends_at: string | null;
  }) => {
    try {
      setIsSaving(true);
      const { error: err } = await supabase
        .from("products")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (err) throw err;
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving discount:", err);
      setError("Gagal menyimpan diskon. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    save({
      discount_type: type,
      discount_value: numValue,
      discount_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    });
  };

  const handleRemove = () =>
    save({ discount_type: null, discount_value: 0, discount_ends_at: null });

  const showPreview = value !== "" && !isNaN(numValue) && numValue > 0;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-900 text-base leading-tight">Diskon Produk</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {product.name} · {formatRp(product.price)}
            </p>
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

        <div className="p-5 space-y-4 text-sm">
          {/* Jenis diskon */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-xl">
            {(["percent", "nominal"] as DiscountType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  type === t ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {t === "percent" ? "Persen (%)" : "Nominal (Rp)"}
              </button>
            ))}
          </div>

          {/* Nilai */}
          <div>
            <label className="block font-medium text-zinc-800 mb-1 text-sm">
              Nilai diskon {type === "percent" ? "(%)" : "(Rp)"}
            </label>
            <input
              type="number"
              min={0}
              step={type === "percent" ? 1 : 100}
              placeholder={type === "percent" ? "10" : "5000"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm font-semibold placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          {/* Batas waktu (opsional) */}
          <div>
            <label className="block font-medium text-zinc-800 mb-1 text-sm">
              Berlaku sampai <span className="text-zinc-400 font-normal">(opsional)</span>
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => {
                setEndsAt(e.target.value);
                setError(null);
              }}
              className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Kosongkan jika diskon tanpa batas waktu.</p>
          </div>

          {/* Pratinjau harga */}
          {showPreview && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-medium text-emerald-800">Harga setelah diskon</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[11px] text-zinc-400 line-through tabular-nums">
                  {formatRp(product.price)}
                </span>
                <span className="text-sm font-extrabold text-emerald-700 tabular-nums">
                  {formatRp(previewPrice)}
                </span>
              </span>
            </div>
          )}

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-100">
          {hasActiveDiscount(product) || product.discount_type ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSaving}
              className="px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Hapus diskon
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-zinc-600 hover:bg-zinc-100 font-medium text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs inline-flex items-center gap-2 cursor-pointer ${GREEN_BTN} ${GREEN_BTN_DISABLED}`}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}