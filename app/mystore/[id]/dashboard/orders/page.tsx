"use client";

import React, { use } from "react";
import { useOrders } from "./components/use-orders";
import { OrderFilters, OrderGrid } from "./components/OrderList";
import { OrderDetailModal, OrderInfoModal, OrderToasts } from "./components/OrderModals";

export default function OrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = use(params);
  const o = useOrders(storeId);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Pencarian & filter */}
      <OrderFilters
        searchQuery={o.searchQuery}
        onSearch={o.setSearchQuery}
        selectedType={o.selectedType}
        onType={o.setSelectedType}
        statusFilter={o.statusFilter}
        onStatus={o.setStatusFilter}
        activeCount={o.activeCount}
        totalCount={o.orders.length}
        statusCounts={o.statusCounts}
      />

      {/* Pesanan aktif (di bawah kartu pencarian, kiri) */}
      <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 w-fit">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-bold text-emerald-800">{o.activeCount} Pesanan Aktif</span>
      </div>

      {/* Daftar pesanan */}
      <OrderGrid
        orders={o.filteredOrders}
        totalCount={o.orders.length}
        isLoading={o.isLoading}
        loadError={o.loadError}
        statusFilter={o.statusFilter}
        onRetry={o.retry}
        onShowAll={() => o.setStatusFilter("all")}
        onOpen={o.setSelectedId}
      />

      {/* Modal 1: detail */}
      {o.selectedOrder && (
        <OrderDetailModal
          order={o.selectedOrder}
          isBusy={o.isBusy}
          onClose={o.closeDetail}
          onOpenInfo={() => o.setInfoOpen(true)}
          onChangeStatus={o.changeStatus}
          onApplyChange={o.applyChange}
        />
      )}

      {/* Modal 2: info pelanggan, pembayaran & aksi */}
      {o.selectedOrder && o.infoOpen && (
        <OrderInfoModal
          order={o.selectedOrder}
          isBusy={o.isBusy}
          onBack={() => o.setInfoOpen(false)}
          onChangeStatus={o.changeStatus}
          onApplyChange={o.applyChange}
        />
      )}

      {/* Toast: urungkan & galat */}
      <OrderToasts
        toast={o.toast}
        actionError={o.actionError}
        onUndo={o.handleUndo}
        onDismissToast={o.dismissToast}
        onDismissError={() => o.setActionError(null)}
      />
    </div>
  );
}