"use client";

import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingBag,
  Search,
  QrCode,
  Bike,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Calculator,
  User,
  Phone,
  MapPin,
  X,
  Loader2,
  MessageCircle,
  RotateCcw,
  FileText,
  ExternalLink,
  Filter,
} from "lucide-react";

// ---------- Tipe data ----------

type OrderType = "dine_in" | "delivery" | "pickup" | "pos";
type OrderStatus =
  | "pending"
  | "processing"
  | "ready"
  | "completed"
  | "cancelled";
type PaymentStatus = "paid" | "unpaid";
type StatusFilter = "active" | "all" | OrderStatus;
type TypeFilter = "all" | OrderType;

interface OrderPatch {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
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

interface ToastState {
  orderId: string;
  message: string;
  revert: OrderPatch;
}

// ---------- Konstanta alur status ----------

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Baru Masuk",
  processing: "Diproses",
  ready: "Siap Diambil/Kirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "processing",
  "ready",
  "completed",
  "cancelled",
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Semua Tipe" },
  { value: "dine_in", label: "Pesan Meja" },
  { value: "delivery", label: "Pesan Antar" },
  { value: "pickup", label: "Pick Up" },
  { value: "pos", label: "Kasir (POS)" },
];

// Langkah maju
const NEXT_ACTION: Partial<
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
const PREV_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  processing: "pending",
  ready: "processing",
  completed: "ready",
  cancelled: "pending",
};

const isActiveStatus = (s: OrderStatus) =>
  s !== "completed" && s !== "cancelled";

// ---------- Helper ----------

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const timeAgo = (iso: string) => {
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

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const paymentMethodLabel = (method: string | null) => {
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
const toWaNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

const resolveType = (row: any): OrderType => {
  if (row.source === "pos") return "pos";
  if (row.service_type === "dine_in" || row.table_id) return "dine_in";
  if (row.service_type === "pickup") return "pickup";
  return "delivery";
};

const displayOrderId = (o: Pick<Order, "orderNumber" | "id">) =>
  o.orderNumber != null ? `#${o.orderNumber}` : `#${o.id.slice(0, 6)}`;

// delivery_note berisi "Patokan: ..." dan "Lokasi: <url>"
const parseDeliveryNote = (note: string | null) => {
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

const ORDER_SELECT = `
  id, order_number, source, service_type, table_id,
  customer_name, customer_phone, delivery_address, delivery_note,
  payment_method, payment_status, notes, subtotal, total_amount,
  status, created_at,
  order_items ( id, product_name, price, quantity, subtotal )
`;

// ---------- Badge ----------

function TypeBadge({
  type,
  tableNumber,
}: {
  type: OrderType;
  tableNumber?: string | null;
}) {
  switch (type) {
    case "dine_in":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
          <QrCode className="w-3.5 h-3.5" />
          Meja {tableNumber || "-"}
        </span>
      );
    case "delivery":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
          <Bike className="w-3.5 h-3.5" />
          Pesan Antar
        </span>
      );
    case "pickup":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          <ShoppingBag className="w-3.5 h-3.5" />
          Pick Up
        </span>
      );
    case "pos":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          <Calculator className="w-3.5 h-3.5" />
          Kasir (POS)
        </span>
      );
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap";
  switch (status) {
    case "pending":
      return (
        <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}>
          <Clock className="w-3.5 h-3.5" />
          Baru Masuk
        </span>
      );
    case "processing":
      return (
        <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
          <ChefHat className="w-3.5 h-3.5" />
          Diproses
        </span>
      );
    case "ready":
      return (
        <span
          className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Siap Diambil/Kirim
        </span>
      );
    case "completed":
      return (
        <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Selesai
        </span>
      );
    case "cancelled":
      return (
        <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
          <XCircle className="w-3.5 h-3.5" />
          Dibatalkan
        </span>
      );
    default:
      return (
        <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>
          {String(status)}
        </span>
      );
  }
}

// ---------- Dropdown filter ----------

function FilterSelect({
  label,
  icon: Icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl pl-9 pr-8 py-2.5 truncate focus:bg-white focus:outline-emerald-500 transition-all cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </label>
  );
}

// ---------- Modal (bottom sheet di HP, di tengah di desktop) ----------
// Jika onBack diberikan: tombol kembali di kiri (tanpa tombol X).

function Modal({
  title,
  subtitle,
  onClose,
  onBack,
  children,
  footer,
  layer = "z-50",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  layer?: "z-50" | "z-[60]";
}) {
  return (
    <div
      className={`fixed inset-0 ${layer} flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4`}
      onClick={onBack ?? onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Kembali"
              className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-base text-slate-900 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
            )}
          </div>

          {!onBack && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {children}
        </div>

        {footer && (
          <div className="px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 shrink-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Halaman ----------

export default function OrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memicu render ulang tiap menit agar "x menit lalu" ikut berubah
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // ---------- Ambil data ----------

  const fetchOrders = useCallback(async () => {
    // Nomor meja diambil terpisah agar tidak bergantung pada relasi FK
    const [ordersRes, tablesRes] = await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("shop_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("shop_tables")
        .select("id, table_number")
        .eq("shop_id", storeId),
    ]);

    if (ordersRes.error) {
      console.error("Gagal mengambil pesanan:", ordersRes.error.message);
      setLoadError("Gagal memuat pesanan. Silakan coba lagi.");
      setIsLoading(false);
      return;
    }

    const tableMap = new Map<string, string>(
      (tablesRes.data ?? []).map((t: any) => [t.id, t.table_number])
    );

    const mapped: Order[] = (ordersRes.data ?? []).map((row: any) => ({
      id: row.id,
      orderNumber: row.order_number ?? null,
      customerName: row.customer_name?.trim() || "Pelanggan",
      customerPhone: row.customer_phone ?? null,
      type: resolveType(row),
      tableNumber: row.table_id ? tableMap.get(row.table_id) ?? null : null,
      address: row.delivery_address ?? null,
      deliveryNote: row.delivery_note ?? null,
      notes: row.notes ?? null,
      items: (row.order_items ?? []).map((it: any) => ({
        id: it.id,
        name: it.product_name,
        quantity: it.quantity,
        price: Number(it.price),
        subtotal: Number(it.subtotal),
      })),
      total: Number(row.total_amount ?? row.subtotal ?? 0),
      status: row.status as OrderStatus,
      createdAt: row.created_at,
      paymentStatus: row.payment_status === "paid" ? "paid" : "unpaid",
      paymentMethod: row.payment_method ?? null,
    }));

    setOrders(mapped);
    setLoadError(null);
    setIsLoading(false);
  }, [storeId]);

  // Muat awal + realtime
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setSelectedId(null);
    setInfoOpen(false);
    fetchOrders();

    // Debounce: order & order_items dibuat berurutan, jadi tunggu sebentar
    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchOrders, 600);
    };

    const channel = supabase
      .channel(`orders-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${storeId}`,
        },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_items" },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchOrders]);

  // ---------- Escape + kunci scroll saat modal terbuka ----------

  const modalOpen = selectedId !== null;

  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (infoOpen) setInfoOpen(false);
      else setSelectedId(null);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen, infoOpen]);

  // Bersihkan timer toast saat halaman ditutup
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ---------- Filter ----------

  const activeCount = useMemo(
    () => orders.filter((o) => isActiveStatus(o.status)).length,
    [orders]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      pending: 0,
      processing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      if (o.status in counts) counts[o.status] += 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((order) => {
      const matchesType = selectedType === "all" || order.type === selectedType;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? isActiveStatus(order.status)
          : order.status === statusFilter;

      const matchesSearch =
        !q ||
        String(order.orderNumber ?? "").includes(q) ||
        order.customerName.toLowerCase().includes(q);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [orders, selectedType, statusFilter, searchQuery]);

  // Selalu turunan dari daftar pesanan agar ikut ter-update oleh realtime
  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;

  // ---------- Update ke Supabase + Urungkan ----------

  const showToast = (t: ToastState) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 8000);
  };

  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  };

  const updateOrder = async (
    orderId: string,
    patch: OrderPatch
  ): Promise<boolean> => {
    const before = orders.find((o) => o.id === orderId);
    setUpdatingId(orderId);
    setActionError(null);

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              ...(patch.status ? { status: patch.status } : {}),
              ...(patch.payment_status
                ? { paymentStatus: patch.payment_status }
                : {}),
            }
          : o
      )
    );

    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", orderId)
      .eq("shop_id", storeId)
      .select("id");

    setUpdatingId(null);

    if (error || !data || data.length === 0) {
      console.error("Gagal memperbarui pesanan:", error?.message ?? "0 baris");
      // Kembalikan hanya pesanan ini ke kondisi sebelumnya
      if (before) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: before.status,
                  paymentStatus: before.paymentStatus,
                }
              : o
          )
        );
      }
      setActionError(
        error?.message ||
          "Perubahan tidak tersimpan. Periksa izin akses (RLS) tabel orders."
      );
      return false;
    }
    return true;
  };

  // Jalankan perubahan, lalu tampilkan toast "Urungkan"
  const applyChange = async (
    order: Order,
    patch: OrderPatch,
    message: string
  ) => {
    const revert: OrderPatch = {};
    if (patch.status) revert.status = order.status;
    if (patch.payment_status) revert.payment_status = order.paymentStatus;

    const ok = await updateOrder(order.id, patch);
    if (ok) showToast({ orderId: order.id, message, revert });
  };

  const handleUndo = async () => {
    if (!toast) return;
    const current = toast;
    dismissToast();
    await updateOrder(current.orderId, current.revert);
  };

  const changeStatus = (order: Order, to: OrderStatus, message: string) =>
    applyChange(order, { status: to }, message);

  // ---------- Render ----------

  const nextAction = selectedOrder ? NEXT_ACTION[selectedOrder.status] : undefined;
  const prevStatus = selectedOrder ? PREV_STATUS[selectedOrder.status] : undefined;
  const isBusy = selectedOrder ? updatingId === selectedOrder.id : false;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Daftar Pesanan
          </h1>
          <p className="text-xs text-slate-500">
            Kelola dan pantau seluruh transaksi pesanan masuk secara nyata
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 w-fit">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-emerald-800">
            {activeCount} Pesanan Aktif
          </span>
        </div>
      </div>

      {/* Pencarian & Filter */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative lg:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor pesanan atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 lg:w-[28rem] shrink-0">
            <FilterSelect
              label="Filter tipe pesanan"
              icon={ShoppingBag}
              value={selectedType}
              onChange={(v) => setSelectedType(v as TypeFilter)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Filter status pesanan"
              icon={Filter}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <option value="active">Pesanan Aktif ({activeCount})</option>
              <option value="all">Semua Status ({orders.length})</option>
              <optgroup label="Per status">
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]} ({statusCounts[s]})
                  </option>
                ))}
              </optgroup>
            </FilterSelect>
          </div>
        </div>

        {statusFilter === "active" && (
          <p className="text-[11px] text-slate-400 mt-2">
            Menampilkan semua status kecuali Selesai &amp; Dibatalkan.
          </p>
        )}
      </div>

      {/* Daftar Pesanan */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <p className="text-xs font-medium">Memuat pesanan...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <p className="text-xs font-medium text-rose-600">{loadError}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchOrders();
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-12 text-center space-y-3">
          <div className="p-3 bg-slate-100 text-slate-400 w-fit rounded-full mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-sm">
            {orders.length === 0
              ? "Belum ada pesanan"
              : "Tidak ada pesanan ditemukan"}
          </p>
          <p className="text-xs text-slate-400">
            {orders.length === 0
              ? "Pesanan yang masuk akan muncul di sini secara otomatis."
              : "Coba ubah kata kunci pencarian atau filter yang dipilih."}
          </p>
          {orders.length > 0 && statusFilter === "active" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl transition-colors"
            >
              Lihat Semua Status
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredOrders.map((order) => {
            const visibleItems = order.items.slice(0, 3);
            const hiddenCount = order.items.length - visibleItems.length;
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-500/50 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-900">
                        {displayOrderId(order)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {timeAgo(order.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-slate-800 truncate">
                      {order.customerName}
                    </p>
                    <TypeBadge type={order.type} tableNumber={order.tableNumber} />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  {order.items.length === 0 ? (
                    <p className="text-slate-400">Tidak ada item.</p>
                  ) : (
                    <>
                      {visibleItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 text-slate-700 font-medium"
                        >
                          <span className="min-w-0">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-bold text-slate-900 shrink-0">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <p className="text-[11px] text-slate-400">
                          +{hiddenCount} item lainnya
                        </p>
                      )}
                    </>
                  )}
                </div>

                {order.notes && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg line-clamp-2">
                    Catatan: {order.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400">
                      Total Pembayaran
                    </p>
                    <p className="text-sm font-black text-emerald-600">
                      {formatRupiah(order.total)}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedId(order.id)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span>Detail</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: DETAIL (fokus ke pesanan) ================= */}
      {selectedOrder && (
        <Modal
          title={`Pesanan ${displayOrderId(selectedOrder)}`}
          subtitle={`${selectedOrder.customerName} • ${timeAgo(selectedOrder.createdAt)}`}
          onClose={() => {
            setInfoOpen(false);
            setSelectedId(null);
          }}
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setInfoOpen(true)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <User className="w-4 h-4" />
                Info & Aksi
              </button>
              {nextAction && (
                <button
                  onClick={() =>
                    changeStatus(selectedOrder, nextAction.to, nextAction.toast)
                  }
                  disabled={isBusy}
                  className="flex-[1.6] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {nextAction.label}
                </button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge
              type={selectedOrder.type}
              tableNumber={selectedOrder.tableNumber}
            />
            <StatusBadge status={selectedOrder.status} />
          </div>

          {/* Yang dipesan */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Yang Dipesan
            </h3>
            <ul className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
              {selectedOrder.items.length === 0 && (
                <li className="p-4 text-xs text-slate-400">Tidak ada item.</li>
              )}
              {selectedOrder.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3.5">
                  <span className="min-w-9 h-9 px-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {item.quantity}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      @ {formatRupiah(item.price)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-800 shrink-0">
                    {formatRupiah(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Catatan pelanggan */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Catatan Pelanggan
            </h3>
            {selectedOrder.notes ? (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-900 leading-relaxed whitespace-pre-line break-words">
                  {selectedOrder.notes}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 px-1">
                Tidak ada catatan dari pelanggan.
              </p>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-900">Total</span>
            <span className="text-base font-black text-emerald-600">
              {formatRupiah(selectedOrder.total)}
            </span>
          </div>
        </Modal>
      )}

      {/* ================= MODAL 2: INFO PELANGGAN, PEMBAYARAN & AKSI ================= */}
      {selectedOrder && infoOpen && (
        <Modal
          layer="z-[60]"
          title={`Info & Aksi ${displayOrderId(selectedOrder)}`}
          subtitle={formatDateTime(selectedOrder.createdAt)}
          onClose={() => setInfoOpen(false)}
          onBack={() => setInfoOpen(false)}
        >
          {/* Status & tindakan (semua bisa dibalikkan) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Status Pesanan
              </h3>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div className="space-y-2">
              {nextAction && (
                <button
                  onClick={() =>
                    changeStatus(selectedOrder, nextAction.to, nextAction.toast)
                  }
                  disabled={isBusy}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {nextAction.label}
                </button>
              )}

              {prevStatus && (
                <button
                  onClick={() =>
                    changeStatus(
                      selectedOrder,
                      prevStatus,
                      `Pesanan dikembalikan ke ${STATUS_LABEL[prevStatus]}`
                    )
                  }
                  disabled={isBusy}
                  className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {selectedOrder.status === "cancelled"
                    ? `Pulihkan Pesanan (ke ${STATUS_LABEL[prevStatus]})`
                    : `Kembalikan ke ${STATUS_LABEL[prevStatus]}`}
                </button>
              )}

              {isActiveStatus(selectedOrder.status) && (
                <button
                  onClick={() =>
                    changeStatus(selectedOrder, "cancelled", "Pesanan dibatalkan")
                  }
                  disabled={isBusy}
                  className="w-full py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors"
                >
                  Batalkan Pesanan
                </button>
              )}
            </div>
          </div>

          {/* Pelanggan */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Informasi Pelanggan
            </h3>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold">{selectedOrder.customerName}</span>
              </div>

              {selectedOrder.customerPhone && (
                <div className="flex items-center justify-between gap-2 text-slate-600">
                  <span className="flex items-center gap-2 min-w-0">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedOrder.customerPhone}</span>
                  </span>
                  <a
                    href={`https://wa.me/${toWaNumber(selectedOrder.customerPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>
              )}

              {selectedOrder.address &&
                (() => {
                  const { landmark, mapsUrl } = parseDeliveryNote(
                    selectedOrder.deliveryNote
                  );
                  return (
                    <div className="flex items-start gap-2 text-slate-600 pt-2.5 border-t border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="leading-relaxed">{selectedOrder.address}</p>
                        {landmark && (
                          <p className="text-[11px] text-slate-500 whitespace-pre-line">
                            {landmark}
                          </p>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Lihat titik lokasi
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Pembayaran */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Informasi Pembayaran
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between gap-3 text-slate-600">
                <span>Metode</span>
                <span className="font-semibold text-slate-800 text-right">
                  {paymentMethodLabel(selectedOrder.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Status Bayar</span>
                <span
                  className={`font-bold uppercase ${
                    selectedOrder.paymentStatus === "paid"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {selectedOrder.paymentStatus === "paid"
                    ? "Lunas"
                    : "Belum Bayar"}
                </span>
              </div>

              {selectedOrder.paymentStatus === "unpaid" &&
                selectedOrder.status !== "cancelled" && (
                  <button
                    onClick={() =>
                      applyChange(
                        selectedOrder,
                        { payment_status: "paid" },
                        "Ditandai sudah dibayar"
                      )
                    }
                    disabled={isBusy}
                    className="w-full py-2.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors"
                  >
                    Tandai Sudah Dibayar
                  </button>
                )}

              {selectedOrder.paymentStatus === "paid" && (
                <button
                  onClick={() =>
                    applyChange(
                      selectedOrder,
                      { payment_status: "unpaid" },
                      "Tanda lunas dibatalkan"
                    )
                  }
                  disabled={isBusy}
                  className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-white disabled:opacity-50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Batalkan Tanda Lunas
                </button>
              )}

              <div className="flex justify-between pt-2.5 border-t border-slate-200 font-extrabold text-sm text-slate-900">
                <span>Total Pembayaran</span>
                <span className="text-emerald-600">
                  {formatRupiah(selectedOrder.total)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= TOAST: URUNGKAN & ERROR ================= */}
      {(toast || actionError) && (
        <div className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none">
          {actionError && (
            <div className="pointer-events-auto w-full max-w-md flex items-start gap-3 bg-rose-600 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg">
              <p className="flex-1 leading-relaxed">{actionError}</p>
              <button
                onClick={() => setActionError(null)}
                aria-label="Tutup pesan"
                className="shrink-0 p-0.5 hover:bg-rose-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {toast && (
            <div className="pointer-events-auto w-full max-w-md flex items-center justify-between gap-3 bg-slate-900 text-white text-xs font-medium pl-4 pr-2 py-2 rounded-xl shadow-lg">
              <span className="leading-snug">{toast.message}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleUndo}
                  className="px-3 py-2 rounded-lg font-bold text-emerald-300 hover:bg-slate-800 transition-colors"
                >
                  Urungkan
                </button>
                <button
                  onClick={dismissToast}
                  aria-label="Tutup"
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}