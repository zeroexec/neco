"use client";

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  X,
  Loader2,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Users,
  KeyRound,
} from "lucide-react";

type EmployeeStatus = "pending" | "active" | "inactive";

interface EmployeeProfile {
  full_name: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
  email: string | null;
}

interface Employee {
  id: string;
  user_id: string;
  job_title: string | null;
  status: EmployeeStatus;
  allowed_menus: string[];
  created_at: string;
  profile: EmployeeProfile | null;
}

// Menu dashboard yang bisa diberikan ke karyawan (sesuai constraint di database)
const MENU_OPTIONS = [
  { key: "dashboard", label: "Ringkasan", desc: "Lihat ringkasan penjualan" },
  { key: "pos", label: "Kasir (POS)", desc: "Buat transaksi di tempat" },
  { key: "orders", label: "Pesanan", desc: "Kelola pesanan masuk" },
  { key: "products", label: "Produk", desc: "Kelola produk dan stok" },
];

const STATUS_UI: Record<EmployeeStatus, { label: string; cls: string }> = {
  pending: { label: "Menunggu", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  active: { label: "Aktif", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { label: "Nonaktif", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const FILTERS: { key: "all" | EmployeeStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Nonaktif" },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function EmployeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shopCode, setShopCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EmployeeStatus>("all");
  const [copied, setCopied] = useState(false);

  // Modal edit
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<EmployeeStatus>("pending");
  const [editMenus, setEditMenus] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modal hapus
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
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

  // ===== Ambil data =====
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [shopRes, empRes] = await Promise.all([
        supabase.from("shops").select("shop_code").eq("id", storeId).single(),
        supabase
          .from("shop_employees")
          .select(
            "id, user_id, job_title, status, allowed_menus, created_at, profiles(full_name, avatar_url, whatsapp_number, email)"
          )
          .eq("shop_id", storeId)
          .order("created_at", { ascending: false }),
      ]);

      if (shopRes.error) throw shopRes.error;
      if (empRes.error) throw empRes.error;

      setShopCode(shopRes.data?.shop_code ?? "");

      const rows: Employee[] = (empRes.data ?? []).map((row: any) => {
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          user_id: row.user_id,
          job_title: row.job_title,
          status: row.status,
          allowed_menus: row.allowed_menus ?? [],
          created_at: row.created_at,
          profile: p ?? null,
        };
      });
      setEmployees(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("Gagal memuat karyawan:", message);
      setLoadError("Data karyawan gagal dimuat. Coba muat ulang halaman.");
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== Filter =====
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
      const haystack = [
        emp.profile?.full_name,
        emp.profile?.email,
        emp.profile?.whatsapp_number,
        emp.job_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [employees, searchQuery, statusFilter]);

  const countOf = (s: EmployeeStatus) => employees.filter((e) => e.status === s).length;

  // ===== Aksi =====
  const handleCopyCode = async () => {
    if (!shopCode) return;
    try {
      await navigator.clipboard.writeText(shopCode);
      setCopied(true);
      showToast("success", "Kode toko disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("error", "Gagal menyalin kode toko.");
    }
  };

  const openEdit = (emp: Employee, approve = false) => {
    setEditing(emp);
    setEditTitle(emp.job_title ?? "");
    setEditStatus(approve ? "active" : emp.status);
    setEditMenus(emp.allowed_menus);
  };

  const toggleMenu = (key: string) =>
    setEditMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || isSaving) return;

    setIsSaving(true);
    try {
      const payload = {
        job_title: editTitle.trim() || null,
        status: editStatus,
        allowed_menus: editMenus,
      };

      const { error } = await supabase
        .from("shop_employees")
        .update(payload)
        .eq("id", editing.id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((emp) => (emp.id === editing.id ? { ...emp, ...payload } : emp))
      );
      setEditing(null);
      showToast("success", "Data karyawan berhasil disimpan.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan data karyawan.";
      console.error("Gagal menyimpan karyawan:", message);
      showToast("error", "Gagal menyimpan data karyawan. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting || isDeleting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("shop_employees")
        .delete()
        .eq("id", deleting.id);

      if (error) throw error;

      setEmployees((prev) => prev.filter((emp) => emp.id !== deleting.id));
      setDeleting(null);
      showToast("success", "Karyawan dikeluarkan dari toko.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghapus karyawan.";
      console.error("Gagal menghapus karyawan:", message);
      showToast("error", "Gagal menghapus karyawan. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = [
    { label: "Total Karyawan", value: employees.length, cls: "text-slate-900" },
    { label: "Aktif", value: countOf("active"), cls: "text-emerald-600" },
    { label: "Menunggu", value: countOf("pending"), cls: "text-amber-600" },
    { label: "Nonaktif", value: countOf("inactive"), cls: "text-slate-500" },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto">
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

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
          Kelola Karyawan
        </h1>
        <p className="text-xs text-slate-500">
          Setujui karyawan yang bergabung dan atur menu yang boleh mereka akses
        </p>
      </div>

      {/* Kode toko untuk karyawan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">Kode Toko</p>
            <p className="text-xs text-slate-500">
              Berikan kode ini ke karyawan agar mereka bisa mengajukan bergabung
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold tracking-widest text-slate-900">
            {isLoading ? "······" : shopCode || "-"}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            disabled={!shopCode}
            aria-label="Salin kode toko"
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1"
          >
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            {isLoading ? (
              <div className="h-7 w-10 bg-slate-200 rounded-md animate-pulse" />
            ) : (
              <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {loadError && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Cari & filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, atau jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar karyawan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 bg-slate-200 rounded-md" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">
              {employees.length === 0 ? "Belum ada karyawan" : "Karyawan tidak ditemukan"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {employees.length === 0
                ? "Bagikan kode toko di atas agar karyawan bisa mengajukan bergabung"
                : "Coba ubah kata kunci atau filter status"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredEmployees.map((emp) => {
              const name = emp.profile?.full_name || "Tanpa nama";
              const status = STATUS_UI[emp.status];

              return (
                <li
                  key={emp.id}
                  className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Profil */}
                  <div className="flex items-center gap-3 min-w-0 md:w-72 md:shrink-0">
                    {emp.profile?.avatar_url ? (
                      <img
                        src={emp.profile.avatar_url}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {getInitials(name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 truncate">{name}</p>
                        <span
                          className={`md:hidden shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {emp.job_title || "Belum ada jabatan"} · Bergabung {formatDate(emp.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Kontak & akses menu */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                      {emp.profile?.email && (
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{emp.profile.email}</span>
                        </span>
                      )}
                      {emp.profile?.whatsapp_number && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {emp.profile.whatsapp_number}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {emp.allowed_menus.length > 0 ? (
                        emp.allowed_menus.map((key) => (
                          <span
                            key={key}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                          >
                            {MENU_OPTIONS.find((m) => m.key === key)?.label || key}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                          Belum ada akses menu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & aksi */}
                  <div className="flex items-center justify-between md:justify-end gap-3 md:shrink-0">
                    <span
                      className={`hidden md:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.cls}`}
                    >
                      {status.label}
                    </span>

                    <div className="flex items-center gap-1 ml-auto md:ml-0">
                      {emp.status === "pending" && (
                        <button
                          onClick={() => openEdit(emp, true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Setujui
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(emp)}
                        aria-label="Atur karyawan"
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(emp)}
                        aria-label="Keluarkan karyawan"
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ================= MODAL ATUR KARYAWAN ================= */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h2 className="font-extrabold text-base text-slate-900">Atur Karyawan</h2>
                <p className="text-xs text-slate-500 truncate">
                  {editing.profile?.full_name || "Tanpa nama"}
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                aria-label="Tutup"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col min-h-0">
              <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
                {/* Jabatan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan (opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasir, Pelayan"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(STATUS_UI) as EmployeeStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditStatus(s)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          editStatus === s
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {STATUS_UI[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Akses menu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Menu yang boleh diakses
                  </label>
                  <div className="space-y-1.5">
                    {MENU_OPTIONS.map((menu) => {
                      const checked = editMenus.includes(menu.key);
                      return (
                        <label
                          key={menu.key}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            checked
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMenu(menu.key)}
                            className="w-4 h-4 accent-emerald-600 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800">{menu.label}</p>
                            <p className="text-[11px] text-slate-500">{menu.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Menu Karyawan dan Pengaturan hanya untuk pemilik toko.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL HAPUS KARYAWAN ================= */}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 space-y-4">
            <div className="space-y-1.5">
              <h2 className="font-extrabold text-base text-slate-900">
                Keluarkan karyawan?
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">
                  {deleting.profile?.full_name || "Karyawan ini"}
                </span>{" "}
                tidak akan bisa mengakses dashboard toko lagi. Untuk bergabung kembali, mereka
                harus mengajukan ulang memakai kode toko.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? "Memproses..." : "Keluarkan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}