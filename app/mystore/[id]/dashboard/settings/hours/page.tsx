"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toHHmm } from "../_lib/utils";
import { PageLoader, SaveBar, SectionHeader } from "../_lib/ui";
import { useToast } from "../_lib/toast";

// day_of_week: 0 = Minggu, 1 = Senin, ... 6 = Sabtu (sama dengan Date.getDay())
const DAYS = [
  { label: "Senin", dow: 1 },
  { label: "Selasa", dow: 2 },
  { label: "Rabu", dow: 3 },
  { label: "Kamis", dow: 4 },
  { label: "Jumat", dow: 5 },
  { label: "Sabtu", dow: 6 },
  { label: "Minggu", dow: 0 },
];

const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "22:00";

interface HourRow {
  day_of_week: number;
  is_closed: boolean;
  open_time: string; // "HH:mm"
  close_time: string; // "HH:mm"
}

const buildDefaultHours = (): HourRow[] =>
  DAYS.map((d) => ({
    day_of_week: d.dow,
    is_closed: false,
    open_time: DEFAULT_OPEN,
    close_time: DEFAULT_CLOSE,
  }));

export default function ShopHoursPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [hours, setHours] = useState<HourRow[]>(buildDefaultHours());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const updateHour = (dow: number, patch: Partial<HourRow>) =>
    setHours((prev) => prev.map((h) => (h.day_of_week === dow ? { ...h, ...patch } : h)));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("shop_operating_hours")
        .select("day_of_week, open_time, close_time, is_closed")
        .eq("shop_id", storeId);

      if (cancelled) return;

      if (error) {
        toast.error(error.message || "Gagal memuat jam operasional.");
      } else {
        // Hari yang belum punya baris tetap tampil dengan nilai default
        setHours(
          buildDefaultHours().map((def) => {
            const found = data?.find((h) => h.day_of_week === def.day_of_week);
            if (!found) return def;
            return {
              day_of_week: def.day_of_week,
              is_closed: found.is_closed,
              open_time: toHHmm(found.open_time, DEFAULT_OPEN),
              close_time: toHHmm(found.close_time, DEFAULT_CLOSE),
            };
          })
        );
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, storeId, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Jam tutup harus lebih besar dari jam buka
    const invalidDay = hours.find(
      (h) => !h.is_closed && (!h.open_time || !h.close_time || h.close_time <= h.open_time)
    );
    if (invalidDay) {
      const label = DAYS.find((d) => d.dow === invalidDay.day_of_week)?.label;
      toast.error(
        `Jam operasional hari ${label} tidak valid: jam tutup harus lebih besar dari jam buka.`
      );
      return;
    }

    try {
      setIsSaving(true);

      // Unik per shop_id + day_of_week
      const payload = hours.map((h) => ({
        shop_id: storeId,
        day_of_week: h.day_of_week,
        is_closed: h.is_closed,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
      }));

      const { error } = await supabase
        .from("shop_operating_hours")
        .upsert(payload, { onConflict: "shop_id,day_of_week" });

      if (error) throw error;
      toast.success("Perubahan berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-5"
    >
      <SectionHeader
        title="Jam Operasional Toko"
        description="Centang hari toko buka, lalu atur jam buka dan tutupnya"
      />

      <div className="space-y-2.5">
        {DAYS.map((day) => {
          const row = hours.find((h) => h.day_of_week === day.dow)!;
          const isOpenDay = !row.is_closed;

          return (
            <div
              key={day.dow}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-2 text-xs"
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOpenDay}
                  onChange={(e) => updateHour(day.dow, { is_closed: !e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">{day.label}</span>
                {!isOpenDay && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-500">
                    Libur
                  </span>
                )}
              </label>

              <div
                className={`flex items-center gap-2 pl-7 sm:pl-0 ${
                  !isOpenDay ? "opacity-40" : ""
                }`}
              >
                <input
                  type="time"
                  value={row.open_time}
                  disabled={!isOpenDay}
                  onChange={(e) => updateHour(day.dow, { open_time: e.target.value })}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs disabled:cursor-not-allowed"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="time"
                  value={row.close_time}
                  disabled={!isOpenDay}
                  onChange={(e) => updateHour(day.dow, { close_time: e.target.value })}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs disabled:cursor-not-allowed"
                />
              </div>
            </div>
          );
        })}
      </div>

      <SaveBar isSaving={isSaving} />
    </form>
  );
}