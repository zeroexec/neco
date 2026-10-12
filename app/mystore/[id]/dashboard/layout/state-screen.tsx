"use client";

import React from "react";
import Link from "next/link";
import { Store, Loader2, AlertCircle, ShieldAlert, type LucideIcon } from "lucide-react";
import type { AccessState } from "./utils";

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
        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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

/** Menampilkan layar yang sesuai dengan status akses. Dipakai saat dashboard belum boleh dirender. */
export function AccessStateScreen({
  state,
  noMenuAccess,
  onRetry,
}: {
  state: AccessState;
  noMenuAccess: boolean;
  onRetry: () => void;
}) {
  if (state === "loading") {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (state === "unauthenticated") {
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

  if (state === "notfound") {
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

  if (state === "denied") {
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

  if (state === "error") {
    return (
      <StateScreen
        icon={AlertCircle}
        title="Gagal memuat toko"
        description="Terjadi kesalahan saat mengambil data toko. Periksa koneksi Anda lalu coba lagi."
      >
        <button onClick={onRetry} className={primaryBtn}>
          Coba Lagi
        </button>
        <Link href="/" className={secondaryBtn}>
          Kembali ke Beranda
        </Link>
      </StateScreen>
    );
  }

  if (noMenuAccess) {
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

  return null;
}