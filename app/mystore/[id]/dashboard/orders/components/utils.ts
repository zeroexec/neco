// ===== Tipe data =====

export type OrderType = "dine_in" | "delivery" | "pickup" | "pos";
export type OrderStatus = "pending" | "processing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "unpaid";
export type StatusFilter = "active" | "all" | OrderStatus;
export type TypeFilter = "all" | OrderType;

export interface OrderPatch {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string; // uuid
  orderNumber: number | null;
  customerName: string;
  customerPhone: string | null;
  type: OrderType;
  tableNumber: string | null;
  address: string | null;
  deliveryNote: string | null;
  notes: string | null;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string; // ISO
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
}

export interface ToastState {
  orderId: string;
  message: string;
  revert: OrderPatch;
}

// ===== Gaya tombol hijau "timbul" (gradasi + sorotan atas + tebing bawah + bayangan lembut) =====
// Sama dengan yang dipakai di halaman kasir. Bila ingin satu sumber saja,
// pindahkan dua konstanta ini ke file bersama (mis. @/lib/ui) dan impor dari sana.
export const GREEN_BTN =
  "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_0_#047857,0_6px_10px_-3px_rgba(5,150,105,0.45)] " +
  "hover:brightness-105 active:translate-y-px " +
  "active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_1px_0_#047857] " +
  "transition-[transform,box-shadow,filter] duration-100";

export const GREEN_BTN_DISABLED =
  "disabled:from-slate-200 disabled:via-slate-300 disabled:to-slate-300 disabled:text-white " +
  "disabled:shadow-none disabled:translate-y-0 disabled:brightness-100 disabled:cursor-not-allowed";

// ===== Konstanta alur status =====

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Baru Masuk",
  processing: "Diproses",
  ready: "Siap Diambil/Kirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "processing",
  "ready",
  "completed",
  "cancelled",
];

export const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Semua Tipe" },
  { value: "dine_in", label: "Pesan Meja" },
  { value: "delivery", label: "Pesan Antar" },
  { value: "pickup", label: "Pick Up" },
  { value: "pos", label: "Kasir (POS)" },
];

// Langkah maju
export const NEXT_ACTION: Partial<
  Record<OrderStatus, { to: OrderStatus; label: string; toast: string }>
> = {
  pending: {
    to: "processing",
    label: "Terima & Proses Pesanan",
    toast: "Pesanan diterima dan diproses",
  },
  processing: {
    to: "ready",
    label: "Tandai Siap (Ambil/Kirim)",
    toast: "Pesanan ditandai siap",
  },
  ready: {
    to: "completed",
    label: "Selesaikan Pesanan",
    toast: "Pesanan diselesaikan",
  },
};

// Langkah mundur (untuk membatalkan tindakan kapan pun)
export const PREV_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  processing: "pending",
  ready: "processing",
  completed: "ready",
  cancelled: "pending",
};

export const isActiveStatus = (s: OrderStatus) => s !== "completed" && s !== "cancelled";

// ===== Helper =====

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const paymentMethodLabel = (method: string | null) => {
  switch (method) {
    case "cash":
      return "Tunai / Bayar di Tempat";
    case "transfer":
      return "Transfer Bank";
    case null:
    case "":
      return "-";
    default:
      return method.toUpperCase();
  }
};

// 08xx -> 628xx untuk link WhatsApp
export const toWaNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

export const resolveType = (row: any): OrderType => {
  if (row.source === "pos") return "pos";
  if (row.service_type === "dine_in" || row.table_id) return "dine_in";
  if (row.service_type === "pickup") return "pickup";
  return "delivery";
};

export const displayOrderId = (o: Pick<Order, "orderNumber" | "id">) =>
  o.orderNumber != null ? `#${o.orderNumber}` : `#${o.id.slice(0, 6)}`;

// delivery_note berisi "Patokan: ..." dan "Lokasi: <url>"
export const parseDeliveryNote = (note: string | null) => {
  if (!note) return { landmark: null as string | null, mapsUrl: null as string | null };
  const mapsUrl = note.match(/https?:\/\/\S+/)?.[0] ?? null;
  const landmark =
    note
      .split("\n")
      .filter((line) => !/https?:\/\//.test(line))
      .join("\n")
      .trim() || null;
  return { landmark, mapsUrl };
};

export const ORDER_SELECT = `
  id, order_number, source, service_type, table_id,
  customer_name, customer_phone, delivery_address, delivery_note,
  payment_method, payment_status, notes, subtotal, total_amount,
  status, created_at,
  order_items ( id, product_name, price, quantity, subtotal )
`;