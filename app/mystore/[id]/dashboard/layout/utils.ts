import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  Calculator,
  Users,
  type LucideIcon,
} from "lucide-react";

// ===== Tipe =====
export interface ShopDetail {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  location: string;
  address_detail: string | null;
  avatar_url: string | null;
  is_open: boolean;
}

export interface OperatingHour {
  day_of_week: number; // 0 = Minggu, 1 = Senin, ... 6 = Sabtu (sama dengan Date.getDay())
  open_time: string | null; // "HH:MM:SS"
  close_time: string | null;
  is_closed: boolean;
}

export interface NavItem {
  key: string; // dicocokkan dengan shop_employees.allowed_menus
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
  ownerOnly?: boolean; // menu khusus pemilik toko
}

export interface UserInfo {
  name: string;
  email: string | null;
  avatar: string | null;
}

export type AccessState =
  | "loading"
  | "owner"
  | "employee"
  | "unauthenticated"
  | "notfound"
  | "denied"
  | "error";

// Status pesanan yang dianggap "perlu diproses" (sesuaikan dengan nilai di orders.status)
export const PENDING_STATUSES = ["pending"];

// ===== Helper: cek apakah toko seharusnya buka sekarang =====
const toMinutes = (t: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

export const isOpenNow = (hours: OperatingHour[], now: Date): boolean => {
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
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// ===== Helper: menu aktif =====
export const checkIsActive = (pathname: string, href: string, exact = false) =>
  exact ? pathname === href : pathname.startsWith(href);

// ===== Daftar menu =====
export const buildNavItems = (storeId: string, pendingOrders: number): NavItem[] => [
  {
    key: "dashboard",
    label: "Ringkasan",
    href: `/mystore/${storeId}/dashboard`,
    icon: LayoutDashboard,
    exact: true,
  },
  {
    key: "pos",
    label: "Kasir",
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