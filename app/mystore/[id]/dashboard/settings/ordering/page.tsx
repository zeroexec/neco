"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bike, Store } from "lucide-react";
import { inputCls, labelCls, hintCls, errorCls } from "../_lib/utils";
import { PageLoader, SaveBar, SectionHeader } from "../_lib/ui";
import { useToast } from "../_lib/toast";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function ShopOrderingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [acceptsDelivery, setAcceptsDelivery] = useState(false);
  const [acceptsPickup, setAcceptsPickup] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [minOrder, setMinOrder] = useState("0");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("accepts_delivery, accepts_pickup, delivery_fee, min_order")
        .eq("id", storeId)
        .single();

      if (cancelled) return;

      if (error) {
        toast.error(error.message || "Gagal memuat pengaturan.");
      } else if (data) {
        setAcceptsDelivery(data.accepts_delivery ?? false);
        setAcceptsPickup(data.accepts_pickup ?? false);
        setDeliveryFee(String(data.delivery_fee ?? 0));
        setMinOrder(String(data.min_order ?? 0));
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, storeId, toast]);

  const feeNum = Number(deliveryFee);
  const minNum = Number(minOrder);
  const feeError =
    deliveryFee.trim() === "" || Number.isNaN(feeNum) || feeNum < 0
      ? "Ongkos kirim harus berupa angka 0 atau lebih."
      : null;
  const minError =
    minOrder.trim() === "" || Number.isNaN(minNum) || minNum < 0
      ? "Minimal pemesanan harus berupa angka 0 atau lebih."
      : null;
  const methodError =
    !acceptsDelivery && !acceptsPickup
      ? "Aktifkan minimal satu metode pemesanan."
      : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (feeError || minError || methodError) {
      toast.error(feeError || minError || methodError || "Periksa kembali isian Anda.");
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("shops")
        .update({
          accepts_delivery: acceptsDelivery,
          accepts_pickup: acceptsPickup,
          delivery_fee: feeNum,
          min_order: minNum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (error) throw error;
      toast.success("Perubahan berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  const methods = [
    {
      key: "delivery",
      label: "Pesan Antar",
      desc: "Pesanan diantar ke alamat pelanggan",
      Icon: Bike,
      checked: acceptsDelivery,
      onChange: setAcceptsDelivery,
    },
    {
      key: "pickup",
      label: "Ambil Sendiri",
      desc: "Pelanggan mengambil pesanan di toko",
      Icon: Store,
      checked: acceptsPickup,
      onChange: setAcceptsPickup,
    },
  ];

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-6"
    >
      <SectionHeader
        title="Pengaturan Pemesanan"
        description="Metode yang dilayani, ongkos kirim, dan minimal pemesanan"
      />

      <div className="space-y-2.5">
        <label className={labelCls}>Metode Pemesanan</label>
        {methods.map(({ key, label, desc, Icon, checked, onChange }) => (
          <label
            key={key}
            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl gap-3 cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Icon
                className={`w-4 h-4 shrink-0 ${checked ? "text-emerald-600" : "text-slate-400"}`}
              />
              <span>
                <span className="block text-xs font-bold text-slate-800">{label}</span>
                <span className="block text-[10px] text-slate-400">{desc}</span>
              </span>
            </span>
            <span className="relative inline-flex items-center shrink-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></span>
            </span>
          </label>
        ))}
        {methodError && <p className={errorCls}>{methodError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Ongkos Kirim (Rp)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={deliveryFee}
            disabled={!acceptsDelivery}
            onChange={(e) => setDeliveryFee(e.target.value)}
            className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {feeError ? (
            <p className={errorCls}>{feeError}</p>
          ) : (
            <p className={hintCls}>
              Tarif tetap per pesanan. Saat ini: {formatRupiah(feeNum || 0)}. Isi 0 untuk gratis ongkir.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Minimal Pemesanan (Rp)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            className={inputCls}
          />
          {minError ? (
            <p className={errorCls}>{minError}</p>
          ) : (
            <p className={hintCls}>
              Total belanja minimal sebelum pesanan bisa dikirim. Saat ini: {formatRupiah(minNum || 0)}.
            </p>
          )}
        </div>
      </div>

      <SaveBar isSaving={isSaving} />
    </form>
  );
}