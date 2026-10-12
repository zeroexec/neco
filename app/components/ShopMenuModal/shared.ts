// ---------- Tipe data (sesuai tabel Supabase) ----------

export interface VariantOption {
  id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
}

export interface VariantGroup {
  id: string;
  name: string;
  is_required: boolean;
  allow_multiple: boolean;
  product_variant_options: VariantOption[];
}

export type DiscountType = "percent" | "nominal";

export interface ProductItem {
  id: string;
  name: string;
  category: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  stock: number;
  track_stock: boolean;
  unit: string | null;
  // Diskon (kolom di tabel products)
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  discount_ends_at?: string | null; // null = tanpa batas waktu
  product_variant_groups: VariantGroup[];
}

export interface CartLine {
  key: string; // productId:optionId,optionId
  productId: string;
  name: string; // nama + varian terpilih
  unitPrice: number; // harga satuan setelah diskon (termasuk tambahan varian)
  originalUnitPrice: number; // harga satuan sebelum diskon (termasuk tambahan varian)
  quantity: number;
  optionIds: string[];
}

// Data pemesan dari tabel profiles
export interface OrdererProfile {
  full_name: string | null;
  whatsapp_number: string | null;
  address_full: string | null;
  city: string | null;
  postal_code: string | null;
  address_note: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
}

export type AuthState = "loading" | "guest" | "user";
export type ServiceType = "delivery" | "pickup";
export type View = "menu" | "checkout" | "success";

// ---------- Helper ----------

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const simpleKey = (productId: string) => `${productId}:`;

// Kategori: produk tanpa kategori dikelompokkan sebagai "Lainnya"
export const ALL_CATEGORY = "Semua";
export const categoryOf = (p: ProductItem) => p.category?.trim() || "Lainnya";

// Diskon dianggap aktif bila tipe & nilainya valid dan belum lewat batas waktu
export const hasActiveDiscount = (p: ProductItem): boolean => {
  if (!p.discount_type || !p.discount_value || Number(p.discount_value) <= 0) return false;
  if (p.discount_ends_at && new Date(p.discount_ends_at).getTime() <= Date.now()) return false;
  return true;
};

// Harga dasar setelah diskon (dibulatkan ke rupiah, tidak pernah di bawah 0).
// Diskon hanya berlaku untuk harga produk; tambahan harga varian tidak didiskon.
export const getDiscountedPrice = (p: ProductItem): number => {
  if (!hasActiveDiscount(p)) return p.price;
  const value = Number(p.discount_value);
  const result =
    p.discount_type === "percent" ? p.price - (p.price * value) / 100 : p.price - value;
  return Math.max(0, Math.round(result));
};

// Label singkat untuk badge, mis. "-20%" atau "-Rp 5.000"
export const getDiscountLabel = (p: ProductItem): string =>
  p.discount_type === "percent"
    ? `-${Number(p.discount_value)}%`
    : `-${formatRupiah(Number(p.discount_value))}`;

// ---------- Gaya tombol hijau "timbul" ----------
// Gradasi + sorotan atas + tebing bawah + bayangan lembut.
// Tekan (active) = tombol turun 1px dan "tebing" bawahnya menipis.
export const GREEN_BTN =
  "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_0_#047857,0_6px_10px_-3px_rgba(5,150,105,0.45)] " +
  "hover:brightness-105 active:translate-y-px " +
  "active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_1px_0_#047857] " +
  "transition-[transform,box-shadow,filter] duration-100";

// Tambahkan bersama GREEN_BTN untuk tombol yang bisa nonaktif
export const GREEN_BTN_DISABLED =
  "disabled:from-slate-200 disabled:via-slate-300 disabled:to-slate-300 disabled:text-slate-400 " +
  "disabled:shadow-none disabled:translate-y-0 disabled:brightness-100 disabled:cursor-not-allowed";