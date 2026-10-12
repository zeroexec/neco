"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ORDER_SELECT,
  isActiveStatus,
  resolveType,
  type Order,
  type OrderPatch,
  type OrderStatus,
  type StatusFilter,
  type ToastState,
  type TypeFilter,
} from "./utils";

export function useOrders(storeId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");

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
      supabase.from("shop_tables").select("id, table_number").eq("shop_id", storeId),
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

  const retry = useCallback(() => {
    setIsLoading(true);
    fetchOrders();
  }, [fetchOrders]);

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
        { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${storeId}` },
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
  const isBusy = selectedOrder ? updatingId === selectedOrder.id : false;

  const closeDetail = () => {
    setInfoOpen(false);
    setSelectedId(null);
  };

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

  const updateOrder = async (orderId: string, patch: OrderPatch): Promise<boolean> => {
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
              ...(patch.payment_status ? { paymentStatus: patch.payment_status } : {}),
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
              ? { ...o, status: before.status, paymentStatus: before.paymentStatus }
              : o
          )
        );
      }
      setActionError(
        error?.message || "Perubahan tidak tersimpan. Periksa izin akses (RLS) tabel orders."
      );
      return false;
    }
    return true;
  };

  // Jalankan perubahan, lalu tampilkan toast "Urungkan"
  const applyChange = async (order: Order, patch: OrderPatch, message: string) => {
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

  return {
    // data
    orders,
    filteredOrders,
    isLoading,
    loadError,
    retry,
    // filter
    selectedType,
    setSelectedType,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    activeCount,
    statusCounts,
    // modal
    selectedOrder,
    setSelectedId,
    closeDetail,
    infoOpen,
    setInfoOpen,
    isBusy,
    // aksi
    applyChange,
    changeStatus,
    // toast
    toast,
    actionError,
    setActionError,
    dismissToast,
    handleUndo,
  };
}