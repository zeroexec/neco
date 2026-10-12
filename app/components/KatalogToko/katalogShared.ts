// ---------- Tipe data (tabel shops & shop_operating_hours) ----------

// Jam operasional per hari (tabel shop_operating_hours)
// day_of_week: 0 = Minggu, 1 = Senin, ... 6 = Sabtu
export interface OperatingHour {
  day_of_week: number;
  open_time: string | null; // "HH:mm:ss"
  close_time: string | null; // "HH:mm:ss"
  is_closed: boolean;
}

// Interface sesuai tabel shops di Supabase
export interface ShopItem {
  id: string;
  name: string;
  category: string;
  location: string;
  is_open: boolean;
  avatar_url: string | null; // logo toko
  cover_url: string | null; // sepanduk toko
  address_detail: string | null;
  created_at: string;
  shop_operating_hours: OperatingHour[] | null;
}

// ---------- Gaya tombol hijau "timbul" ----------
// Gradasi + sorotan atas + tebing bawah + bayangan lembut.
// Tekan (active) = tombol turun 1px dan "tebing" bawahnya menipis.
export const GREEN_BTN =
  "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_0_#047857,0_6px_10px_-3px_rgba(5,150,105,0.45)] " +
  "hover:brightness-105 active:translate-y-px " +
  "active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_1px_0_#047857] " +
  "transition-[transform,box-shadow,filter] duration-100";