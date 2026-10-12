"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  PENDING_STATUSES,
  isOpenNow,
  type AccessState,
  type OperatingHour,
  type ShopDetail,
  type UserInfo,
} from "./utils";

export function useDashboardData(storeId: string) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [allowedMenus, setAllowedMenus] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const shopRef = useRef<ShopDetail | null>(null);
  const lastAutoRef = useRef<boolean | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = accessState === "owner";
  const isEmployee = accessState === "employee";

  useEffect(() => {
    shopRef.current = shop;
  }, [shop]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 1. Fetch data toko + jam operasional + peran pengguna (pemilik / karyawan) + profil
  const fetchShopDetail = async () => {
    if (!storeId) return;
    setAccessState("loading");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;

      if (!uid) {
        setAccessState("unauthenticated");
        return;
      }

      const [shopRes, hoursRes, empRes, profRes] = await Promise.all([
        supabase.from("shops").select("*").eq("id", storeId).maybeSingle(),
        supabase
          .from("shop_operating_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("shop_id", storeId),
        supabase
          .from("shop_employees")
          .select("status, job_title, allowed_menus")
          .eq("shop_id", storeId)
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, avatar_url, email")
          .eq("id", uid)
          .maybeSingle(),
      ]);

      if (shopRes.error) throw shopRes.error;

      if (!shopRes.data) {
        setAccessState("notfound");
        return;
      }

      if (hoursRes.error) {
        console.error("Gagal mengambil jam operasional:", hoursRes.error.message);
      } else {
        setHours((hoursRes.data as OperatingHour[]) || []);
      }

      // Info akun yang sedang login (fallback ke data auth bila profil kosong)
      const meta = (auth.user?.user_metadata ?? {}) as Record<string, string | undefined>;
      setUserInfo({
        name:
          profRes.data?.full_name ||
          meta.full_name ||
          meta.name ||
          auth.user?.email?.split("@")[0] ||
          "Pengguna",
        email: profRes.data?.email || auth.user?.email || null,
        avatar: profRes.data?.avatar_url || meta.avatar_url || null,
      });

      setShop(shopRes.data);

      if (shopRes.data.owner_id === uid) {
        setAccessState("owner");
      } else if (empRes.data?.status === "active") {
        setJobTitle(empRes.data.job_title ?? null);
        setAllowedMenus(empRes.data.allowed_menus ?? []);
        setAccessState("employee");
      } else {
        setAccessState("denied");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("Gagal mengambil data detail toko:", message);
      setAccessState("error");
    }
  };

  useEffect(() => {
    lastAutoRef.current = null;
    fetchShopDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // 2. Ubah status buka/tutup toko (dipakai oleh sinkronisasi otomatis jam operasional)
  const applyStatus = async (newStatus: boolean, auto = false) => {
    try {
      const { error } = await supabase
        .from("shops")
        .update({
          is_open: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (error) throw error;

      setShop((prev) => (prev ? { ...prev, is_open: newStatus } : prev));

      if (auto) {
        showToast(
          "success",
          newStatus
            ? "Toko otomatis dibuka sesuai jam operasional"
            : "Toko otomatis ditutup sesuai jam operasional"
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengubah status toko";
      console.error("Gagal mengubah status toko:", message);
      showToast("error", "Gagal mengubah status toko. Silakan coba lagi.");
    }
  };

  // 3. Sinkron otomatis dengan jam operasional (dijalankan di sisi pemilik)
  //    - Saat data dimuat, status disesuaikan dengan jadwal
  //    - Setelah itu dicek tiap 30 detik; status hanya berubah saat jadwal berganti
  useEffect(() => {
    if (!isOwner || hours.length === 0) return;

    const sync = async () => {
      const shouldBeOpen = isOpenNow(hours, new Date());
      if (lastAutoRef.current === shouldBeOpen) return;
      lastAutoRef.current = shouldBeOpen;

      if (shopRef.current && shopRef.current.is_open !== shouldBeOpen) {
        await applyStatus(shouldBeOpen, true);
      }
    };

    sync();
    const timer = setInterval(sync, 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, hours, storeId]);

  // 4. Jumlah pesanan yang perlu diproses (untuk badge menu Pesanan)
  const canSeeOrders = isOwner || (isEmployee && allowedMenus.includes("orders"));
  useEffect(() => {
    if (!canSeeOrders) return;

    const loadPending = async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", storeId)
        .in("status", PENDING_STATUSES);
      setPendingOrders(count || 0);
    };

    loadPending();
    const timer = setInterval(loadPending, 60_000);
    return () => clearInterval(timer);
  }, [canSeeOrders, storeId]);

  return {
    shop,
    accessState,
    jobTitle,
    allowedMenus,
    userInfo,
    pendingOrders,
    toast,
    isOwner,
    isEmployee,
    refetch: fetchShopDetail,
  };
}