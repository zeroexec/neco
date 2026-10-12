"use client";

import React, { use, useCallback } from "react";
import { usePOS } from "./components/use-pos";
import ProductCatalog from "./components/ProductCatalog";
import CartPanel, { CartFab } from "./components/CartPanel";
import { StockPromptModal, NoticeModal } from "./components/PosModals";

export default function POSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = use(params);
  const pos = usePOS(storeId);

  // Callback stabil: komponen anak (memo) tidak dirender ulang tanpa alasan
  const { setIsCartOpen, setNotice } = pos;
  const openCart = useCallback(() => setIsCartOpen(true), [setIsCartOpen]);
  const closeCart = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);
  const closeNotice = useCallback(() => setNotice(null), [setNotice]);

  return (
    // Tinggi = layar dikurangi header & bottom nav mobile (variabelnya diset di layout dashboard,
    // bernilai 0 di desktop). -m-* membatalkan padding <main> agar POS memenuhi area konten.
    // touch-manipulation: menghilangkan jeda tap & zoom ganda agar respon sentuhan instan.
    <div className="relative flex flex-col lg:flex-row h-[calc(100dvh_-_var(--mobile-header-h)_-_var(--mobile-nav-h))] -m-4 sm:-m-6 lg:-m-8 bg-slate-50 font-sans overflow-hidden touch-manipulation [-webkit-tap-highlight-color:transparent]">
      {/* ===== Katalog (kiri) ===== */}
      <ProductCatalog
        products={pos.filteredProducts}
        allProducts={pos.allProducts}
        categories={pos.categories}
        selectedCategory={pos.selectedCategory}
        onSelectCategory={pos.setSelectedCategory}
        onSearch={pos.submitSearch}
        qtyById={pos.qtyById}
        isLoading={pos.isLoadingProducts}
        errorMessage={pos.errorMessage}
        onRetry={pos.loadProducts}
        onAdd={pos.handleAddToCart}
        onUpdateQuantity={pos.handleUpdateQuantity}
      />

      {/* ===== Keranjang (kanan di desktop, bottom sheet di mobile) ===== */}
      <CartPanel
        cart={pos.panelCart}
        onUpdateQuantity={pos.handleUpdateQuantity}
        onClearCart={pos.handleClearCart}
        onCheckout={pos.handleCheckout}
        onStockShortage={pos.handleStockShortage}
        isSubmitting={pos.isSubmitting}
        isOpen={pos.isCartOpen}
        onClose={closeCart}
      />

      {/* ===== Tombol keranjang bulat (mobile), selalu di atas bottom nav ===== */}
      <CartFab count={pos.totalItemCount} total={pos.grandTotal} onClick={openCart} />

      {/* ===== Modal ===== */}
      <StockPromptModal
        prompt={pos.stockPrompt}
        product={pos.promptProduct}
        addQty={pos.addQty}
        stockAfter={pos.promptStockAfter}
        error={pos.stockError}
        isSaving={pos.isAddingStock}
        onQtyChange={pos.changeAddQty}
        onSubmit={pos.handleSubmitStockPrompt}
        onClose={pos.closeStockPrompt}
      />
      <NoticeModal notice={pos.notice} onClose={closeNotice} />
    </div>
  );
}