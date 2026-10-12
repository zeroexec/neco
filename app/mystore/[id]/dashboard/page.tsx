"use client";

import React, { use } from "react";
import { useSummary } from "./components/use-summary";
import {
  SummaryHeader,
  ErrorBanner,
  QuickActions,
  StatsGrid,
  RecentOrders,
  StockAttention,
} from "./components/SummarySections";

export default function StoreDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const s = useSummary(storeId);
  const base = `/mystore/${storeId}/dashboard`;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-6xl mx-auto">
      <SummaryHeader
        onRefresh={s.refresh}
        isBusy={s.isLoading || s.isRefreshing}
        isSpinning={s.isRefreshing}
      />

      {s.error && <ErrorBanner message={s.error} onRetry={s.refresh} />}

      <QuickActions base={base} pendingCount={s.pendingCount} />

      <StatsGrid
        isLoading={s.isLoading}
        salesToday={s.salesToday}
        transactionCount={s.transactionCount}
        pendingCount={s.pendingCount}
        outOfStockCount={s.outOfStockCount}
        lowStockCount={s.lowStockCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <RecentOrders base={base} orders={s.recentOrders} isLoading={s.isLoading} />
        <StockAttention
          base={base}
          products={s.attentionProducts}
          productCount={s.productCount}
          isLoading={s.isLoading}
        />
      </div>
    </div>
  );
}