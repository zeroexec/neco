"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PENDING_STATUSES } from "../layout/utils"; // satu sumber dengan badge menu Pesanan
import type { OrderRow, ProductRow, TodayOrder } from "./utils";

const REFRESH_AFTER_MS = 30_000;

export function useSummary(storeId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [todayOrders, setTodayOrders] = useState<TodayOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [products, setProducts] = useState<ProductRow[]>([]);

  const requestId = useRef(0); // mengabaikan respons lama bila ada permintaan baru / pindah toko
  const lastLoadAt = useRef(0);

  // silent = muat ulang di latar (data lama tetap tampil, tanpa kerangka loading)
  const load = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      lastLoadAt.current = Date.now();
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      try {
        const [todayRes, recentRes, pendingRes, productRes] = await Promise.all([
          // Cukup 3 kolom untuk menghitung penjualan, hemat data
          supabase
            .from("orders")
            .select("id, total_amount, status")
            .eq("shop_id", storeId)
            .gte("created_at", startOfDay.toISOString()),
          supabase
            .from("orders")
            .select("*")
            .eq("shop_id", storeId)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", storeId)
            .in("status", PENDING_STATUSES),
          supabase
            .from("products")
            .select("id, name, stock, min_stock, track_stock, is_available")
            .eq("shop_id", storeId),
        ]);

        if (todayRes.error) throw todayRes.error;
        if (recentRes.error) throw recentRes.error;
        if (productRes.error) throw productRes.error;

        if (id !== requestId.current) return;
        setTodayOrders((todayRes.data as TodayOrder[]) || []);
        setRecentOrders((recentRes.data as OrderRow[]) || []);
        setPendingCount(pendingRes.count || 0);
        setProducts((productRes.data as ProductRow[]) || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        console.error("Gagal memuat ringkasan toko:", message);
        if (id === requestId.current) setError("Data ringkasan gagal dimuat.");
      } finally {
        if (id === requestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [storeId]
  );

  useEffect(() => {
    load();
    return () => {
      requestId.current++; // batalkan respons yang masih berjalan saat unmount / ganti toko
    };
  }, [load]);

  // Segarkan otomatis saat tab/aplikasi kembali dibuka (maks. sekali per 30 detik)
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastLoadAt.current > REFRESH_AFTER_MS
      ) {
        load(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // ===== Hitungan ringkasan =====
  const summary = useMemo(() => {
    const validToday = todayOrders.filter((o) => o.status !== "cancelled");
    const salesToday = validToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const limited = products.filter(
      (p) => p.track_stock && p.stock !== null && p.stock !== undefined
    );
    const outOfStock = limited.filter((p) => (p.stock as number) <= 0);
    const lowStock = limited.filter(
      (p) => (p.stock as number) > 0 && (p.stock as number) <= (p.min_stock ?? 0)
    );

    return {
      salesToday,
      transactionCount: validToday.length,
      productCount: products.length,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      attentionProducts: [...outOfStock, ...lowStock].slice(0, 5),
    };
  }, [todayOrders, products]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    isLoading,
    isRefreshing,
    error,
    refresh,
    recentOrders,
    pendingCount,
    ...summary,
  };
}