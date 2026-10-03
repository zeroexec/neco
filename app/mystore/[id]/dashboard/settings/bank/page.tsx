"use client";

import React, { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "../_lib/toast";
import { Landmark, Plus, Pencil, Trash2, Star, Loader2, X } from "lucide-react";

interface BankAccount {
  id: string;
  shop_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  is_active: boolean;
}

const BANKS = [
  "BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga", "Permata", "BTN", "Muamalat",
  "DANA", "GoPay", "OVO", "ShopeePay",
];

export default function BankSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: shopId } = use(params);

  const toast = useToast();
  // SESUAIKAN dengan API toast di ../_lib/toast kamu
  const notify = (type: "success" | "error", msg: string) => {
    if (type === "success") toast.success(msg);
    else toast.error(msg);
  };

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [bankName, setBankName] = useState(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Modal hapus
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shop_bank_accounts")
        .select("*")
        .eq("shop_id", shopId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setAccounts(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("Gagal memuat rekening:", msg);
      notify("error", "Gagal memuat data rekening");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const openAdd = () => {
    setEditing(null);
    setBankName(BANKS[0]);
    setAccountNumber("");
    setAccountHolder("");
    setFormError("");
    setIsFormOpen(true);
  };

  const openEdit = (acc: BankAccount) => {
    setEditing(acc);
    setBankName(acc.bank_name);
    setAccountNumber(acc.account_number);
    setAccountHolder(acc.account_holder);
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    const number = accountNumber.replace(/\s+/g, "");
    const holder = accountHolder.trim();

    if (!/^\d{5,20}$/.test(number)) {
      setFormError("Nomor rekening harus berupa angka (5–20 digit).");
      return;
    }
    if (holder.length < 3) {
      setFormError("Nama pemilik rekening wajib diisi.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      if (editing) {
        const { error } = await supabase
          .from("shop_bank_accounts")
          .update({ bank_name: bankName, account_number: number, account_holder: holder })
          .eq("id", editing.id);
        if (error) throw error;
        notify("success", "Rekening berhasil diperbarui");
      } else {
        const { error } = await supabase.from("shop_bank_accounts").insert({
          shop_id: shopId,
          bank_name: bankName,
          account_number: number,
          account_holder: holder,
          is_primary: accounts.length === 0, // rekening pertama otomatis jadi utama
        });
        if (error) throw error;
        notify("success", "Rekening berhasil ditambahkan");
      }
      setIsFormOpen(false);
      await fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("Gagal menyimpan rekening:", msg);
      setFormError("Gagal menyimpan rekening. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPrimary = async (acc: BankAccount) => {
    if (acc.is_primary || busyId) return;
    setBusyId(acc.id);
    try {
      // Lepas status utama dulu agar tidak melanggar unique index
      const { error: e1 } = await supabase
        .from("shop_bank_accounts")
        .update({ is_primary: false })
        .eq("shop_id", shopId)
        .eq("is_primary", true);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("shop_bank_accounts")
        .update({ is_primary: true, is_active: true })
        .eq("id", acc.id);
      if (e2) throw e2;

      notify("success", `${acc.bank_name} dijadikan rekening utama`);
      await fetchAccounts();
    } catch (err: unknown) {
      console.error("Gagal set rekening utama:", err);
      notify("error", "Gagal mengubah rekening utama");
      await fetchAccounts();
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (acc: BankAccount) => {
    if (busyId) return;
    if (acc.is_primary && acc.is_active) {
      notify("error", "Rekening utama tidak bisa dinonaktifkan. Pilih rekening utama lain dulu.");
      return;
    }
    setBusyId(acc.id);
    try {
      const { error } = await supabase
        .from("shop_bank_accounts")
        .update({ is_active: !acc.is_active })
        .eq("id", acc.id);
      if (error) throw error;
      setAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (err: unknown) {
      console.error("Gagal mengubah status rekening:", err);
      notify("error", "Gagal mengubah status rekening");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("shop_bank_accounts")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      // Jika yang dihapus rekening utama, jadikan rekening pertama yang tersisa sebagai utama
      if (deleteTarget.is_primary) {
        const next = accounts.find((a) => a.id !== deleteTarget.id);
        if (next) {
          await supabase
            .from("shop_bank_accounts")
            .update({ is_primary: true, is_active: true })
            .eq("id", next.id);
        }
      }

      notify("success", "Rekening dihapus");
      setDeleteTarget(null);
      await fetchAccounts();
    } catch (err: unknown) {
      console.error("Gagal menghapus rekening:", err);
      notify("error", "Gagal menghapus rekening");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900">Rekening Pembayaran</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekening ini ditampilkan ke pembeli yang memilih metode transfer.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Belum ada rekening</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Tambahkan rekening agar pembeli bisa transfer.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {accounts.map((acc) => (
              <li
                key={acc.id}
                className={`border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  acc.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">{acc.bank_name}</span>
                      {acc.is_primary && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <Star className="w-3 h-3 fill-current" /> Utama
                        </span>
                      )}
                      {!acc.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-slate-700 tracking-wide">{acc.account_number}</p>
                    <p className="text-[11px] text-slate-400 truncate">a.n. {acc.account_holder}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {!acc.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(acc)}
                      disabled={busyId === acc.id}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {busyId === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Jadikan utama"}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActive(acc)}
                    disabled={busyId === acc.id}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {acc.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => openEdit(acc)}
                    aria-label="Ubah rekening"
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(acc)}
                    aria-label="Hapus rekening"
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ============ MODAL TAMBAH / UBAH ============ */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeForm}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editing ? "Ubah Rekening" : "Tambah Rekening"}
              </h3>
              <button
                onClick={closeForm}
                aria-label="Tutup"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Bank / E-Wallet</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nomor Rekening / HP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="Contoh: 1234567890"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Sesuai buku tabungan"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={closeForm}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL KONFIRMASI HAPUS ============ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hapus rekening ini?</h3>
              <p className="text-xs text-slate-500 mt-1">
                {deleteTarget.bank_name} · {deleteTarget.account_number} akan dihapus dan tidak lagi
                tampil ke pembeli.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}