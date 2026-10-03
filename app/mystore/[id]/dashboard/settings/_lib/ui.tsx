import React from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";

export function PageLoader({ text = "Memuat data toko..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[240px] gap-2 text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      <span className="text-xs">{text}</span>
    </div>
  );
}

export function Alert({
  type,
  children,
}: {
  type: "success" | "error";
  children: React.ReactNode;
}) {
  const isSuccess = type === "success";
  return (
    <div
      role="status"
      className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
        isSuccess
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
      <p className="text-[11px] text-slate-400">{description}</p>
    </div>
  );
}

export function SaveBar({ isSaving }: { isSaving: boolean }) {
  return (
    <div className="pt-4 border-t border-slate-100 flex justify-end">
      <button
        type="submit"
        disabled={isSaving}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
      </button>
    </div>
  );
}