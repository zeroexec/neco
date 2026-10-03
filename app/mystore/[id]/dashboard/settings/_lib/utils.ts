import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

export const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden";
export const inputIconCls = `${inputCls} pl-9`;
export const labelCls = "text-xs font-semibold text-slate-700";
export const hintCls = "text-[10px] text-slate-400";
export const errorCls = "text-[11px] text-rose-600";

// ---------- Google Maps & koordinat ----------

const ALLOWED_MAPS_HOSTS = [
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
];

export function isValidMapsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return ALLOWED_MAPS_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

// Pisahkan "lat, lng" (menerima pemisah koma / spasi / titik koma / tanda kurung)
export function parseCoords(value: string): { lat: number; lng: number } | null {
  const m = value
    .trim()
    .match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

export const formatCoords = (lat: number, lng: number) => `${lat}, ${lng}`;

// Ambil koordinat dari link Google Maps panjang (@lat,lng | q=lat,lng | !3dlat!4dlng)
export function extractCoordsFromUrl(url: string): string | null {
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `${m[1]}, ${m[2]}`;
  }
  return null;
}

// ---------- Instagram ----------

// Menerima "@username", "username", atau link instagram.com
export function normalizeInstagram(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const username = v.replace(/^@/, "").replace(/^instagram\.com\//i, "");
  return `https://instagram.com/${username}`;
}

export function isValidInstagram(value: string) {
  const normalized = normalizeInstagram(value);
  if (!normalized) return true;
  try {
    const url = new URL(normalized);
    return (
      ["instagram.com", "www.instagram.com"].includes(url.hostname) &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

// ---------- Waktu ----------

// Postgres mengembalikan "08:00:00", input type="time" butuh "08:00"
export const toHHmm = (value: string | null | undefined, fallback: string) =>
  value ? value.slice(0, 5) : fallback;

// ---------- Upload gambar toko ----------

// Path: shop-images/<shop_id>/<kind>-<timestamp>.<ext>
export async function uploadShopImage(
  supabase: SupabaseClient,
  storeId: string,
  kind: "logo" | "cover",
  file: File
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Ukuran berkas maksimal 2MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${storeId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("shop-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  return supabase.storage.from("shop-images").getPublicUrl(path).data.publicUrl;
}