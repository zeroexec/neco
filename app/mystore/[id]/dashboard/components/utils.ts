// ===== Tipe =====
export interface OrderRow {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  service_type?: string | null;
  order_type?: string | null;
  created_at: string;
}

// Hanya kolom yang dibutuhkan untuk menghitung penjualan hari ini
export interface TodayOrder {
  id: string;
  total_amount: number | string | null;
  status: string | null;
}

export interface ProductRow {
  id: string;
  name: string;
  stock: number | null;
  min_stock: number | null;
  track_stock: boolean | null;
  is_available: boolean;
}

// ===== Format =====
export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "Baru saja";
  if (diff < 60) return `${diff} menit lalu`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
};

export const formatToday = () =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ===== Label pesanan =====
const SERVICE_LABEL: Record<string, string> = {
  walk_in: "Di Tempat",
  dine_in: "Makan di Tempat",
  pickup: "Ambil Sendiri",
  delivery: "Diantar",
};

export const getServiceLabel = (order: OrderRow) => {
  const key = order.service_type || order.order_type || "";
  return SERVICE_LABEL[key] || key || "-";
};

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Perlu Diproses", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "Diproses", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  preparing: { label: "Disiapkan", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ready: { label: "Siap", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivering: { label: "Diantar", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Dibatalkan", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const getStatus = (status?: string | null) =>
  STATUS_STYLE[status || ""] || {
    label: status || "-",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  };