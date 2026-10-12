import type { ShopItem } from "./katalogShared";

// ---------- Helper: waktu & status buka ----------

export interface JakartaNow {
  dow: number; // 0 = Minggu ... 6 = Sabtu
  minutes: number; // menit sejak 00:00
}

const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Ambil hari & menit sekarang berdasarkan zona waktu Asia/Jakarta (WIB)
export function getJakartaNow(): JakartaNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return { dow: WEEKDAY_TO_DOW[weekday] ?? 0, minutes: hour * 60 + minute };
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
};

const toHHmm = (time: string) => time.slice(0, 5);

export interface ShopStatus {
  label: string;
  isOpenNow: boolean;
  todayHours: string | null; // contoh: "08:00–22:00"
}

export function getShopStatus(shop: ShopItem, now: JakartaNow): ShopStatus {
  const today = shop.shop_operating_hours?.find((h) => h.day_of_week === now.dow);

  const hasHours = !!today && !today.is_closed && !!today.open_time && !!today.close_time;
  const todayHours = hasHours
    ? `${toHHmm(today!.open_time!)}–${toHHmm(today!.close_time!)}`
    : null;

  // Pemilik menutup toko secara manual lewat toggle is_open
  if (!shop.is_open) {
    return { label: "Tutup Sementara", isOpenNow: false, todayHours };
  }

  // Belum ada jadwal untuk hari ini: ikuti status is_open
  if (!today) {
    return { label: "Buka Sekarang", isOpenNow: true, todayHours: null };
  }

  // Libur di hari ini
  if (!hasHours) {
    return { label: "Libur Hari Ini", isOpenNow: false, todayHours: null };
  }

  const openAt = toMinutes(today!.open_time!);
  const closeAt = toMinutes(today!.close_time!);

  if (now.minutes < openAt) {
    return {
      label: `Buka pukul ${toHHmm(today!.open_time!)}`,
      isOpenNow: false,
      todayHours,
    };
  }
  if (now.minutes >= closeAt) {
    return { label: "Tutup", isOpenNow: false, todayHours };
  }
  return { label: "Buka Sekarang", isOpenNow: true, todayHours };
}