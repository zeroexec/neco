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