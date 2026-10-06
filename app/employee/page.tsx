"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  KeyRound,
  Store,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Clock,
  Ban,
  X,
} from "lucide-react";

// Gradasi yang sama dengan header beranda
const GRADIENT = "bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500";

type EmployeeStatus = "pending" | "active" | "inactive";

interface Membership {
  id: string;
  status: EmployeeStatus;
  job_title: string | null;
  allowed_menus: string[];
  shop: {
    id: string;
    name: string;
    category: string;
    avatar_url: string | null;
  } | null;
}

const MENU_LABEL: Record<string, string> = {
  dashboard: "Ringkasan",
  pos: "Kasir (POS)",
  orders: "Pesanan",
  products: "Produk",
};

const STATUS_UI: Record<EmployeeStatus, { label: string; cls: string }> = {
  pending: { label: "Menunggu persetujuan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  active: { label: "Aktif", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { label: "Nonaktif", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function EmployeeEntryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ===== Ambil daftar toko tempat user menjadi karyawan =====
  const loadMemberships = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("shop_employees")
      .select(
        "id, status, job_title, allowed_menus, created_at, shops(id, name, category, avatar_url)"
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows: Membership[] = (data ?? []).map((row: any) => {
      const s = Array.isArray(row.shops) ? row.shops[0] : row.shops;
      return {
        id: row.id,
        status: row.status,
        job_title: row.job_title,
        allowed_menus: row.allowed_menus ?? [],
        shop: s ?? null,
      };
    });
    setMemberships(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!data.user) {
          setUserId(null);
          return;
        }
        setUserId(data.user.id);
        await loadMemberships(data.user.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        console.error("Gagal memuat data karyawan:", message);
        if (!cancelled) setLoadError("Data gagal dimuat. Coba muat ulang halaman.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMemberships]);

  // ===== Ajukan bergabung memakai kode toko =====
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isJoining) return;

    const shopCode = code.trim().toUpperCase();
    if (shopCode.length < 4) {
      showToast("error", "Masukkan kode toko yang valid.");
      return;
    }

    setIsJoining(true);
    try {
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("id, name, owner_id")
        .eq("shop_code", shopCode)
        .maybeSingle();

      if (shopError) throw shopError;

      if (!shop) {
        showToast("error", "Kode toko tidak ditemukan. Periksa kembali kodenya.");
        return;
      }
      if (shop.owner_id === userId) {
        showToast("error", "Anda adalah pemilik toko ini.");
        return;
      }

      const { error: insertError } = await supabase
        .from("shop_employees")
        .insert({ shop_id: shop.id, user_id: userId });

      if (insertError) {
        if (insertError.code === "23505") {
          showToast("error", "Anda sudah terdaftar di toko ini.");
          return;
        }
        throw insertError;
      }

      setCode("");
      await loadMemberships(userId);
      showToast("success", `Permintaan terkirim ke ${shop.name}. Tunggu persetujuan pemilik.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengajukan bergabung";
      console.error("Gagal mengajukan bergabung:", message);
      showToast("error", "Gagal mengajukan bergabung. Silakan coba lagi.");
    } finally {
      setIsJoining(false);
    }
  };

  // ===== Batalkan pengajuan (hanya yang masih menunggu) =====
  const handleCancel = async (membership: Membership) => {
    if (cancellingId) return;
    setCancellingId(membership.id);
    try {
      const { error } = await supabase
        .from("shop_employees")
        .delete()
        .eq("id", membership.id)
        .eq("status", "pending");

      if (error) throw error;

      setMemberships((prev) => prev.filter((m) => m.id !== membership.id));
      showToast("success", "Pengajuan dibatalkan.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membatalkan pengajuan";
      console.error("Gagal membatalkan pengajuan:", message);
      showToast("error", "Gagal membatalkan pengajuan. Silakan coba lagi.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Toast */}
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

      {/* Baris atas (menempel): tombol kembali + logo + brand */}
      <div className={`sticky top-0 z-40 h-14 w-full ${GRADIENT}`}>
        <div className="max-w-2xl mx-auto h-full px-4 sm:px-6 flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            aria-label="Kembali ke Beranda"
            className="p-2 -ml-2 text-white hover:bg-emerald-800/40 active:bg-emerald-800/60 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>

          <Link href="/" className="flex items-center gap-2" aria-label="Ke beranda">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
              <img
                src="/logo.png"
                alt=""
                className="w-full h-full object-contain scale-100"
              />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
              NECO<span className="text-emerald-200">.</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Hero: judul halaman */}
      <div className={`w-full ${GRADIENT}`}>
        <div className="max-w-2xl mx-auto text-center px-4 sm:px-6 pt-2 sm:pt-4 pb-12 sm:pb-14">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Dashboard Karyawan
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-emerald-50">
            Gabung ke toko dengan kode dari pemilik, lalu masuk ke dashboard toko Anda
          </p>
        </div>
      </div>

      {/* Konten: kartu pertama sedikit menumpuk ke area hijau */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 -mt-6 pb-10 space-y-5 sm:space-y-6">
        {/* Belum login */}
        {!isLoading && !userId ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-emerald-900/5 p-6 text-center space-y-1">
            <p className="text-sm font-bold text-slate-800">Anda belum masuk</p>
            <p className="text-xs text-slate-500">
              Masuk ke akun Anda terlebih dahulu untuk bergabung sebagai karyawan.
            </p>
            <Link
              href="/auth/login"
              className="mt-3 inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Masuk ke Akun
            </Link>
          </div>
        ) : (
          <>
            {/* Form gabung */}
            <form
              onSubmit={handleJoin}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-emerald-900/5 p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Gabung dengan Kode Toko</p>
                  <p className="text-xs text-slate-500">
                    Minta kode toko kepada pemilik, lalu masukkan di sini.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  maxLength={8}
                  placeholder="Contoh: K7MQ3X"
                  autoCapitalize="characters"
                  autoComplete="off"
                  disabled={isLoading || isJoining}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold tracking-widest uppercase placeholder:font-sans placeholder:font-normal placeholder:tracking-normal focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || isJoining || code.trim().length < 4}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isJoining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isJoining ? "Mengirim..." : "Ajukan Bergabung"}</span>
                </button>
              </div>
            </form>

            {loadError && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loadError}</span>
              </div>
            )}

            {/* Daftar toko */}
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Toko Tempat Saya Bekerja
              </h2>

              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-white border border-slate-200/80 rounded-2xl" />
                  ))}
                </div>
              ) : memberships.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 py-10 px-4 text-center">
                  <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Belum bergabung ke toko mana pun</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Masukkan kode toko di atas untuk mengajukan bergabung
                  </p>
                </div>
              ) : (
                memberships.map((m) => {
                  const status = STATUS_UI[m.status];
                  const shopName = m.shop?.name || "Toko tidak ditemukan";

                  return (
                    <div
                      key={m.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        {m.shop?.avatar_url ? (
                          <img
                            src={m.shop.avatar_url}
                            alt={shopName}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                            <Store className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-sm text-slate-900 truncate">
                            {shopName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {m.shop?.category || "Umum"}
                            {m.job_title ? ` · ${m.job_title}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.cls}`}
                        >
                          {m.status === "pending" ? "Menunggu" : status.label}
                        </span>
                      </div>

                      {m.status === "active" && (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {m.allowed_menus.length > 0 ? (
                              m.allowed_menus.map((key) => (
                                <span
                                  key={key}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                                >
                                  {MENU_LABEL[key] || key}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                                Pemilik belum memberi akses menu
                              </span>
                            )}
                          </div>

                          {m.shop && (
                            <Link
                              href={`/mystore/${m.shop.id}/dashboard`}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                            >
                              <span>Masuk Dashboard</span>
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </>
                      )}

                      {m.status === "pending" && (
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            Menunggu persetujuan pemilik toko
                          </p>
                          <button
                            onClick={() => handleCancel(m)}
                            disabled={cancellingId === m.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-60"
                          >
                            {cancellingId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>Batalkan</span>
                          </button>
                        </div>
                      )}

                      {m.status === "inactive" && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          Akses Anda dinonaktifkan oleh pemilik toko
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}