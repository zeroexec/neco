// ===== Tipe =====
export type DiscountType = "percent" | "nominal";

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  category?: string | null;
  image_url?: string | null;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
  sku?: string | null;
  cost_price?: number | null;
  unit?: string | null;
  min_stock?: number | null;
  track_stock?: boolean;
  // Diskon (kolom baru di tabel products)
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  discount_ends_at?: string | null; // ISO timestamp, null = tanpa batas waktu
}

// ===== Helper =====
export const formatRp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

// Diskon dianggap aktif bila tipe & nilainya valid dan belum lewat batas waktu
export const hasActiveDiscount = (p: Product): boolean => {
  if (!p.discount_type || !p.discount_value || p.discount_value <= 0) return false;
  if (p.discount_ends_at && new Date(p.discount_ends_at).getTime() <= Date.now()) return false;
  return true;
};

// Harga akhir setelah diskon (tidak pernah di bawah 0)
export const getDiscountedPrice = (p: Product): number => {
  if (!hasActiveDiscount(p)) return p.price;
  const value = Number(p.discount_value);
  const result =
    p.discount_type === "percent" ? p.price - (p.price * value) / 100 : p.price - value;
  return Math.max(0, Math.round(result));
};

// Label singkat untuk badge, mis. "-20%" atau "-Rp 5.000"
export const getDiscountLabel = (p: Product): string =>
  p.discount_type === "percent"
    ? `-${Number(p.discount_value)}%`
    : `-${formatRp(Number(p.discount_value))}`;

// ===== Gaya tombol hijau "timbul" (gradasi + sorotan atas + tebing bawah + bayangan lembut) =====
// Tekan (active) = tombol turun 1px dan "tebing" bawahnya menipis, jadi terasa seperti ditekan.
export const GREEN_BTN =
  "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_0_#047857,0_6px_10px_-3px_rgba(5,150,105,0.45)] " +
  "hover:brightness-105 active:translate-y-px " +
  "active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_1px_0_#047857] " +
  "transition-[transform,box-shadow,filter] duration-100";

// Tambahkan bersama GREEN_BTN untuk tombol yang bisa nonaktif
export const GREEN_BTN_DISABLED =
  "disabled:from-slate-200 disabled:via-slate-300 disabled:to-slate-300 disabled:text-white " +
  "disabled:shadow-none disabled:translate-y-0 disabled:brightness-100 disabled:cursor-not-allowed";