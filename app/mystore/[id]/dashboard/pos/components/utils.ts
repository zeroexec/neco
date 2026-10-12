// ===== Tipe =====
export interface Product {
  id: string;
  shop_id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  price: number;
  stock?: number | null;
  min_stock?: number | null;
  unit?: string | null;
  track_stock?: boolean;
  image_url?: string | null;
  is_available: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface StockPrompt {
  productId: string;
  target: number; // jumlah yang dibutuhkan di keranjang
  needed: number; // minimal tambah stok agar target tercukupi
  increment: boolean; // true = naikkan jumlah keranjang 1 setelah stok ditambah
}

export interface Notice {
  type: "success" | "error" | "warning";
  title: string;
  message?: string;
  change?: number;
}

// ===== Helper =====
export const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// Produk punya batas stok hanya jika stoknya dihitung dan nilainya ada
export const hasStockLimit = (product: Product): boolean =>
  (product.track_stock ?? true) &&
  product.stock !== undefined &&
  product.stock !== null;

export const isSoldOutProduct = (product: Product): boolean =>
  hasStockLimit(product) && (product.stock as number) <= 0;

// ===== Gaya tombol hijau "timbul" (gradasi + sorotan atas + tebing bawah + bayangan lembut) =====
// Tekan (active) = tombol turun 1px dan "tebing" bawahnya menipis, jadi terasa seperti ditekan.
export const GREEN_BTN =
  "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_0_#047857,0_6px_10px_-3px_rgba(5,150,105,0.45)] " +
  "hover:brightness-105 active:translate-y-px " +
  "active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_1px_0_#047857] " +
  "transition-[transform,box-shadow,filter] duration-100";

// Tambahkan bersama GREEN_BTN untuk tombol yang bisa nonaktif (mis. Bayar)
export const GREEN_BTN_DISABLED =
  "disabled:from-slate-200 disabled:via-slate-300 disabled:to-slate-300 disabled:text-white " +
  "disabled:shadow-none disabled:translate-y-0 disabled:brightness-100 disabled:cursor-not-allowed";