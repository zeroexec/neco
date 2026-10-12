"use client";

import React from "react";
import {
  User,
  Phone,
  MapPin,
  X,
  Loader2,
  MessageCircle,
  RotateCcw,
  FileText,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Modal, StatusBadge, TypeBadge } from "./ui";
import {
  GREEN_BTN,
  GREEN_BTN_DISABLED,
  NEXT_ACTION,
  PREV_STATUS,
  STATUS_LABEL,
  displayOrderId,
  formatDateTime,
  formatRupiah,
  isActiveStatus,
  parseDeliveryNote,
  paymentMethodLabel,
  timeAgo,
  toWaNumber,
  type Order,
  type OrderPatch,
  type OrderStatus,
  type ToastState,
} from "./utils";

type ChangeStatus = (order: Order, to: OrderStatus, message: string) => void;
type ApplyChange = (order: Order, patch: OrderPatch, message: string) => void;

const SECTION_TITLE = "text-xs font-bold text-slate-400 uppercase tracking-wider";

/* ---------- Tombol-tombol footer (dipakai di kedua modal) ---------- */

// Tandai dibayar / batalkan tanda lunas: ada di setiap modal detail
function PaidButton({
  order,
  isBusy,
  onApplyChange,
}: {
  order: Order;
  isBusy: boolean;
  onApplyChange: ApplyChange;
}) {
  if (order.paymentStatus === "unpaid") {
    if (order.status === "cancelled") return null;
    return (
      <button
        onClick={() => onApplyChange(order, { payment_status: "paid" }, "Ditandai sudah dibayar")}
        disabled={isBusy}
        className="w-full py-2.5 border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Tandai Sudah Dibayar
      </button>
    );
  }

  return (
    <button
      onClick={() => onApplyChange(order, { payment_status: "unpaid" }, "Tanda lunas dibatalkan")}
      disabled={isBusy}
      className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      Batalkan Tanda Lunas
    </button>
  );
}

/* ---------- Modal 1: detail (fokus ke pesanan) ---------- */

export function OrderDetailModal({
  order,
  isBusy,
  onClose,
  onOpenInfo,
  onChangeStatus,
  onApplyChange,
}: {
  order: Order;
  isBusy: boolean;
  onClose: () => void;
  onOpenInfo: () => void;
  onChangeStatus: ChangeStatus;
  onApplyChange: ApplyChange;
}) {
  const nextAction = NEXT_ACTION[order.status];

  return (
    <Modal
      title={`Pesanan ${displayOrderId(order)}`}
      subtitle={`${order.customerName} • ${timeAgo(order.createdAt)}`}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          <PaidButton order={order} isBusy={isBusy} onApplyChange={onApplyChange} />
          <div className="flex gap-2">
            <button
              onClick={onOpenInfo}
              className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <User className="w-4 h-4" />
              Info & Aksi
            </button>
            {nextAction && (
              <button
                onClick={() => onChangeStatus(order, nextAction.to, nextAction.toast)}
                disabled={isBusy}
                className={`flex-[1.6] py-3 ${GREEN_BTN} ${GREEN_BTN_DISABLED} font-bold text-xs rounded-xl flex items-center justify-center gap-1.5`}
              >
                {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {nextAction.label}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={order.type} tableNumber={order.tableNumber} />
        <StatusBadge status={order.status} />
      </div>

      {/* Yang dipesan */}
      <div className="space-y-2">
        <h3 className={SECTION_TITLE}>Yang Dipesan</h3>
        <ul className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
          {order.items.length === 0 && (
            <li className="p-4 text-xs text-slate-400">Tidak ada item.</li>
          )}
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3.5">
              <span className="min-w-9 h-9 px-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums">
                {item.quantity}×
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-snug">{item.name}</p>
                <p className="text-[11px] text-slate-400">@ {formatRupiah(item.price)}</p>
              </div>
              <span className="text-xs font-bold text-slate-800 shrink-0 tabular-nums">
                {formatRupiah(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Catatan pelanggan */}
      <div className="space-y-2">
        <h3 className={SECTION_TITLE}>Catatan Pelanggan</h3>
        {order.notes ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-amber-900 leading-relaxed whitespace-pre-line break-words">
              {order.notes}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 px-1">Tidak ada catatan dari pelanggan.</p>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-sm font-bold text-slate-900">Total</span>
        <span className="text-base font-black text-emerald-600 tabular-nums">
          {formatRupiah(order.total)}
        </span>
      </div>
    </Modal>
  );
}

/* ---------- Alamat pelanggan (antar) ---------- */

function CustomerAddress({ order }: { order: Order }) {
  if (!order.address) return null;
  const { landmark, mapsUrl } = parseDeliveryNote(order.deliveryNote);

  return (
    <div className="flex items-start gap-2 text-slate-600 pt-2.5 border-t border-slate-100">
      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
      <div className="space-y-1 min-w-0">
        <p className="leading-relaxed">{order.address}</p>
        {landmark && (
          <p className="text-[11px] text-slate-500 whitespace-pre-line">{landmark}</p>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Lihat titik lokasi
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------- Modal 2: info pelanggan, pembayaran & aksi ---------- */

export function OrderInfoModal({
  order,
  isBusy,
  onBack,
  onChangeStatus,
  onApplyChange,
}: {
  order: Order;
  isBusy: boolean;
  onBack: () => void;
  onChangeStatus: ChangeStatus;
  onApplyChange: ApplyChange;
}) {
  const nextAction = NEXT_ACTION[order.status];
  const prevStatus = PREV_STATUS[order.status];
  const canCancel = isActiveStatus(order.status);

  return (
    <Modal
      layer="z-[60]"
      title={`Info & Aksi ${displayOrderId(order)}`}
      subtitle={formatDateTime(order.createdAt)}
      onClose={onBack}
      onBack={onBack}
      footer={
        <div className="space-y-2">
          <PaidButton order={order} isBusy={isBusy} onApplyChange={onApplyChange} />

          {nextAction && (
            <button
              onClick={() => onChangeStatus(order, nextAction.to, nextAction.toast)}
              disabled={isBusy}
              className={`w-full py-2.5 ${GREEN_BTN} ${GREEN_BTN_DISABLED} font-bold text-xs rounded-xl`}
            >
              {nextAction.label}
            </button>
          )}

          {(prevStatus || canCancel) && (
            <div className="flex gap-2">
              {prevStatus && (
                <button
                  onClick={() =>
                    onChangeStatus(
                      order,
                      prevStatus,
                      `Pesanan dikembalikan ke ${STATUS_LABEL[prevStatus]}`
                    )
                  }
                  disabled={isBusy}
                  className="flex-1 py-2.5 px-2 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-bold text-[11px] leading-tight rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {order.status === "cancelled"
                      ? "Pulihkan Pesanan"
                      : `Kembali ke ${STATUS_LABEL[prevStatus]}`}
                  </span>
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => onChangeStatus(order, "cancelled", "Pesanan dibatalkan")}
                  disabled={isBusy}
                  className="flex-1 py-2.5 px-2 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-bold text-[11px] leading-tight rounded-xl transition-colors"
                >
                  Batalkan Pesanan
                </button>
              )}
            </div>
          )}
        </div>
      }
    >
      {/* Status */}
      <div className="flex items-center justify-between gap-2">
        <h3 className={SECTION_TITLE}>Status Pesanan</h3>
        <StatusBadge status={order.status} />
      </div>

      {/* Pelanggan */}
      <div className="space-y-2">
        <h3 className={SECTION_TITLE}>Informasi Pelanggan</h3>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold">{order.customerName}</span>
          </div>

          {order.customerPhone && (
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span className="flex items-center gap-2 min-w-0">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{order.customerPhone}</span>
              </span>
              <a
                href={`https://wa.me/${toWaNumber(order.customerPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>
          )}

          <CustomerAddress order={order} />
        </div>
      </div>

      {/* Pembayaran */}
      <div className="space-y-2">
        <h3 className={SECTION_TITLE}>Informasi Pembayaran</h3>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
          <div className="flex justify-between gap-3 text-slate-600">
            <span>Metode</span>
            <span className="font-semibold text-slate-800 text-right">
              {paymentMethodLabel(order.paymentMethod)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Status Bayar</span>
            <span
              className={`font-bold uppercase ${
                order.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {order.paymentStatus === "paid" ? "Lunas" : "Belum Bayar"}
            </span>
          </div>

          <div className="flex justify-between pt-2.5 border-t border-slate-200 font-extrabold text-sm text-slate-900">
            <span>Total Pembayaran</span>
            <span className="text-emerald-600 tabular-nums">{formatRupiah(order.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Toast (di atas): hijau untuk urungkan, merah untuk galat ---------- */

export function OrderToasts({
  toast,
  actionError,
  onUndo,
  onDismissToast,
  onDismissError,
}: {
  toast: ToastState | null;
  actionError: string | null;
  onUndo: () => void;
  onDismissToast: () => void;
  onDismissError: () => void;
}) {
  if (!toast && !actionError) return null;

  return (
    <div className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toast && (
        <div
          role="status"
          className="pointer-events-auto w-full max-w-md flex items-center justify-between gap-3 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white text-xs font-semibold pl-4 pr-2 py-2 rounded-xl shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/60"
        >
          <span className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{toast.message}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onUndo}
              className="px-3 py-2 rounded-lg font-extrabold text-white hover:bg-white/15 active:bg-white/20 transition-colors"
            >
              Urungkan
            </button>
            <button
              onClick={onDismissToast}
              aria-label="Tutup"
              className="p-2 rounded-lg text-emerald-100 hover:bg-white/15 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="pointer-events-auto w-full max-w-md flex items-start gap-3 bg-rose-600 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg"
        >
          <p className="flex-1 leading-relaxed">{actionError}</p>
          <button
            onClick={onDismissError}
            aria-label="Tutup pesan"
            className="shrink-0 p-0.5 hover:bg-rose-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}