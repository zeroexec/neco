"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { PageLoader } from "../_lib/ui";
import { useToast } from "../_lib/toast";

export default function ShopDangerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("name")
        .eq("id", storeId)
        .single();

      if (cancelled) return;

      if (error) toast.error(error.message || "Gagal memuat data toko.");
      else setShopName(data?.name ?? "");
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, storeId, toast]);

  const closeModal = () => {
    setIsModalOpen(false);
    setConfirmName("");
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== shopName) return;

    try {
      setIsDeleting(true);

      // Jam operasional ikut terhapus otomatis (ON DELETE CASCADE)
      const { error } = await supabase.from("shops").delete().eq("id", storeId);
      if (error) throw error;

      router.push("/mystore");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus toko.");
      closeModal();
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-5">
      <div className="border-b border-rose-100 pb-3">
        <h2 className="font-bold text-rose-600 text-sm">Zona Bahaya (Danger Zone)</h2>
        <p className="text-[11px] text-slate-400">
          Tindakan berisiko tinggi yang dapat mempengaruhi seluruh data toko Anda
        </p>
      </div>

      <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-rose-900">Hapus Toko Ini Permanen</h3>
            <p className="text-[11px] text-rose-700/80 leading-relaxed">
              Setelah toko dihapus, semua produk, jam operasional, riwayat transaksi, dan
              data kasir terkait akan <strong>dihapus secara permanen</strong> dan tidak
              dapat dikembalikan lagi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hapus Toko Ini</span>
        </button>
      </div>

      {/* Modal konfirmasi */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Konfirmasi Hapus Toko</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Tutup"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Untuk melanjutkan, ketikkan nama toko{" "}
              <strong className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all">
                {shopName}
              </strong>{" "}
              di bawah ini:
            </p>

            <form onSubmit={handleDelete} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Ketikkan nama toko persis..."
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={confirmName !== shopName || isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isDeleting ? "Menghapus..." : "Saya Paham, Hapus Toko"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}