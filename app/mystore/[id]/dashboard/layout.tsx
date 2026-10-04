"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  Store,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  Calculator,
  Users,
  Loader2,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

interface ShopDetail {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  location: string;
  address_detail: string | null;
  avatar_url: string | null;
  is_open: boolean;
}

interface OperatingHour {
  day_of_week: number; // 0 = Minggu, 1 = Senin, ... 6 = Sabtu (sama dengan Date.getDay())
  open_time: string | null; // "HH:MM:SS"
  close_time: string | null;
  is_closed: boolean;
}

interface NavItem {
  key: string; // dicocokkan dengan shop_employees.allowed_menus
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
  ownerOnly?: boolean; // menu khusus pemilik toko
}

interface UserInfo {
  name: string;
  email: string | null;
  avatar: string | null;
}

type AccessState =
  | "loading"
  | "owner"
  | "employee"
  | "unauthenticated"
  | "notfound"
  | "denied"
  | "error";

// Status pesanan yang dianggap "perlu diproses" (sesuaikan dengan nilai di orders.status)
const PENDING_STATUSES = ["pending"];

// ===== Helper: cek apakah toko seharusnya buka sekarang =====
const toMinutes = (t: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

const isOpenNow = (hours: OperatingHour[], now: Date): boolean => {
  const day = now.getDay();
  const prevDay = (day + 6) % 7;
  const cur = now.getHours() * 60 + now.getMinutes();

  // Jam buka yang melewati tengah malam dari hari kemarin (mis. 18:00 - 02:00)
  const yesterday = hours.find((h) => h.day_of_week === prevDay);
  if (yesterday && !yesterday.is_closed) {
    const yo = toMinutes(yesterday.open_time);
    const yc = toMinutes(yesterday.close_time);
    if (yo !== null && yc !== null && yc < yo && cur < yc) return true;
  }

  const today = hours.find((h) => h.day_of_week === day);
  if (!today || today.is_closed) return false;

  const o = toMinutes(today.open_time);
  const c = toMinutes(today.close_time);

  if (o === null || c === null || o === c) return true; // tanpa jam / 24 jam
  if (c > o) return cur >= o && cur < c;
  return cur >= o; // melewati tengah malam: sisanya dicek lewat hari berikutnya
};

// ===== Helper: inisial nama untuk avatar =====
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// ===== Komponen layar status (belum login, tanpa akses, dll) =====
const primaryBtn =
  "w-full inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors";
const secondaryBtn =
  "w-full inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors";

function StateScreen({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-extrabold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;
  const pathname = usePathname();
  const router = useRouter();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [allowedMenus, setAllowedMenus] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Tutup drawer otomatis saat pindah halaman
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Tutup drawer dengan tombol Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Kunci scroll halaman saat drawer terbuka (mobile)
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // 2. Ubah status buka/tutup (hanya pemilik)
  const applyStatus = async (newStatus: boolean, auto = false) => {
    setIsTogglingStatus(true);
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
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleToggleStatus = () => {
    if (!isOwner || !shop || isTogglingStatus) return;
    applyStatus(!shop.is_open);
  };

  // 3. Sinkron otomatis dengan jam operasional (dijalankan di sisi pemilik)
  //    - Saat data dimuat, status disesuaikan dengan jadwal
  //    - Setelah itu dicek tiap 30 detik; status hanya berubah saat jadwal berganti
  //      (jadi saklar manual tetap bisa dipakai di antara pergantian jadwal)
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

  // ===== Menu & hak akses =====
  const allNavItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Ringkasan",
      href: `/mystore/${storeId}/dashboard`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      key: "pos",
      label: "Kasir (POS)",
      href: `/mystore/${storeId}/dashboard/pos`,
      icon: Calculator,
    },
    {
      key: "orders",
      label: "Pesanan",
      href: `/mystore/${storeId}/dashboard/orders`,
      icon: ShoppingBag,
      badge: pendingOrders > 0 ? String(pendingOrders) : undefined,
    },
    {
      key: "products",
      label: "Produk",
      href: `/mystore/${storeId}/dashboard/products`,
      icon: Package,
    },
    {
      key: "employees",
      label: "Karyawan",
      href: `/mystore/${storeId}/dashboard/employees`,
      icon: Users,
      ownerOnly: true,
    },
    {
      key: "settings",
      label: "Pengaturan",
      href: `/mystore/${storeId}/dashboard/settings`,
      icon: Settings,
      ownerOnly: true,
    },
  ];

  // Pemilik: semua menu. Karyawan: hanya menu yang diizinkan pemilik (tanpa menu khusus pemilik).
  const visibleNav = allNavItems.filter((item) =>
    isOwner ? true : isEmployee && !item.ownerOnly && allowedMenus.includes(item.key)
  );

  const checkIsActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const currentItem = allNavItems.find((i) => checkIsActive(i.href, i.exact));
  const canViewCurrent =
    isOwner || (isEmployee && !!currentItem && visibleNav.some((v) => v.key === currentItem.key));

  // Karyawan yang membuka menu tanpa izin dialihkan ke menu pertama yang diizinkan
  useEffect(() => {
    if (!isEmployee || visibleNav.length === 0 || canViewCurrent) return;
    router.replace(visibleNav[0].href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, canViewCurrent, pathname, allowedMenus]);

  const homeHref = isOwner ? "/mystore" : "/employee";
  const homeLabel = isOwner ? "Kembali ke Semua Toko" : "Kembali ke Daftar Toko";
  const roleLabel = isOwner ? "Pemilik Toko" : jobTitle ? `Karyawan · ${jobTitle}` : "Karyawan";

  // ================= LAYAR STATUS =================
  if (accessState === "loading") {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <StateScreen
        icon={ShieldAlert}
        title="Anda belum masuk"
        description="Masuk ke akun Anda terlebih dahulu untuk membuka dashboard toko."
      >
        <Link href="/auth/login" className={primaryBtn}>
          Masuk ke Akun
        </Link>
        <Link href="/" className={secondaryBtn}>
          Kembali ke Beranda
        </Link>
      </StateScreen>
    );
  }

  if (accessState === "notfound") {
    return (
      <StateScreen
        icon={Store}
        title="Toko tidak ditemukan"
        description="Toko yang Anda cari tidak ada atau sudah dihapus."
      >
        <Link href="/" className={primaryBtn}>
          Kembali ke Beranda
        </Link>
      </StateScreen>
    );
  }

  if (accessState === "denied") {
    return (
      <StateScreen
        icon={ShieldAlert}
        title="Anda tidak punya akses"
        description="Akun ini bukan pemilik atau karyawan aktif toko ini. Jika sudah mengajukan bergabung, tunggu persetujuan dari pemilik toko."
      >
        <Link href="/employee" className={primaryBtn}>
          Dashboard Karyawan
        </Link>
        <Link href="/" className={secondaryBtn}>
          Kembali ke Beranda
        </Link>
      </StateScreen>
    );
  }

  if (accessState === "error") {
    return (
      <StateScreen
        icon={AlertCircle}
        title="Gagal memuat toko"
        description="Terjadi kesalahan saat mengambil data toko. Periksa koneksi Anda lalu coba lagi."
      >
        <button onClick={fetchShopDetail} className={primaryBtn}>
          Coba Lagi
        </button>
        <Link href="/" className={secondaryBtn}>
          Kembali ke Beranda
        </Link>
      </StateScreen>
    );
  }

  if (isEmployee && visibleNav.length === 0) {
    return (
      <StateScreen
        icon={ShieldAlert}
        title="Belum ada akses menu"
        description="Pemilik toko belum memberi Anda akses ke menu dashboard. Hubungi pemilik toko untuk mengatur hak akses Anda."
      >
        <Link href="/employee" className={primaryBtn}>
          Kembali ke Daftar Toko
        </Link>
      </StateScreen>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      {/* ================= TOAST ================= */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-sm pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold bg-white ${
              toast.type === "success"
                ? "border-emerald-200 text-emerald-700"
                : "border-rose-200 text-rose-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ================= HEADER (Mobile Only) ================= */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-3 flex items-center gap-3 shadow-xs">
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Buka menu"
          className="p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold text-sm text-slate-900 truncate">
            {shop?.name || `Toko #${storeId}`}
          </h1>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            shop?.is_open
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              shop?.is_open ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          {shop?.is_open ? "Buka" : "Tutup"}
        </span>
      </header>

      {/* ================= OVERLAY (Mobile Only) ================= */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ================= SIDEBAR (Drawer di mobile, tetap di desktop) ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200/80 shrink-0 flex flex-col shadow-xl md:shadow-xs transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:z-30 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Sidebar: [<] [logo toko] [nama & kategori] */}
        <div className="shrink-0 px-3 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
          <Link
            href={homeHref}
            aria-label={homeLabel}
            title={homeLabel}
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {shop?.avatar_url ? (
            <img
              src={shop.avatar_url}
              alt={shop.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Store className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-sm text-slate-900 truncate leading-tight">
              {shop?.name || `Toko #${storeId}`}
            </h2>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {shop?.category || "Umum"}
            </p>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Tutup menu"
            className="md:hidden shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigasi Utama (scroll sendiri bila menu panjang) */}
        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-1">
          <p className="px-3 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Menu Utama
          </p>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = checkIsActive(item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`min-w-5 text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white text-emerald-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar: Card akun + saklar status toko */}
        <div className="shrink-0 p-3 border-t border-slate-100">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-3">
            {/* Siapa yang login */}
            <div className="flex items-center gap-3">
              {userInfo?.avatar ? (
                <img
                  src={userInfo.avatar}
                  alt={userInfo.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                    isOwner ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {getInitials(userInfo?.name || "?")}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">
                  {userInfo?.name || "Pengguna"}
                </p>
                {userInfo?.email && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{userInfo.email}</p>
                )}
              </div>
            </div>

            <span
              className={`inline-flex max-w-full items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isOwner
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              <span className="truncate">{roleLabel}</span>
            </span>

            <div className="h-px bg-slate-200/80" />

            {/* Saklar status toko */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold leading-tight flex items-center gap-1.5 ${
                    shop?.is_open ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      shop?.is_open ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {shop?.is_open ? "Toko Buka" : "Toko Tutup"}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">
                  {!isOwner
                    ? "Diatur oleh pemilik toko"
                    : hours.length > 0
                    ? "Otomatis sesuai jam operasional"
                    : "Atur jam operasional untuk otomatis"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isTogglingStatus && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!shop?.is_open}
                  aria-label="Status toko buka atau tutup"
                  onClick={handleToggleStatus}
                  disabled={!isOwner || isTogglingStatus || !shop}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                    shop?.is_open ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      shop?.is_open ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {canViewCurrent ? (
          children
        ) : (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
      </main>
    </div>
  );
}