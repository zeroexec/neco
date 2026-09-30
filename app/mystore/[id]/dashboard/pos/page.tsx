"use client";

import React, { useState, useEffect, use } from "react";
import { ShoppingBag as CartIcon, Search, Barcode, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

import CartPanel, { CheckoutPayment } from "./components/CartPanel";

// ===== Types =====
interface Product {
  id: string;
  shop_id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  price: number;
  stock?: number | null;
  image_url?: string | null;
  is_available: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POSPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  // States Produk & Kategori
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Semua"]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States Filter & Keranjang
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // ===== Fetch Produk =====
  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", storeId)
        .order("name", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setProducts([]);
        setCategories(["Semua"]);
      } else {
        setProducts(data);
        extractCategories(data);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data dari Supabase:", err);
      setErrorMessage(err.message || "Gagal mengambil data dari server.");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const extractCategories = (items: Product[]) => {
    const uniqueCats = Array.from(
      new Set(items.map((item) => item.category).filter((cat): cat is string => Boolean(cat)))
    );
    setCategories(["Semua", ...uniqueCats]);
  };

  useEffect(() => {
    if (storeId) {
      loadProducts();
    }
  }, [storeId]);

  // ===== Cart Handlers =====
  const handleAddToCart = (product: Product) => {
    if (!product.is_available) return;

    const existing = cart.find((item) => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (
      product.stock !== undefined &&
      product.stock !== null &&
      currentQty + 1 > product.stock
    ) {
      alert(`Stok ${product.name} tidak mencukupi (Sisa: ${product.stock})`);
      return;
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const product = products.find((p) => p.id === id);

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;

            if (
              delta > 0 &&
              product?.stock !== undefined &&
              product?.stock !== null &&
              newQty > product.stock
            ) {
              alert(`Stok maksimum tercapai (${product.stock})`);
              return item;
            }

            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleClearCart = () => setCart([]);

  // Total untuk floating bar mobile
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ===== Checkout =====
  const handleCheckout = async (payment: CheckoutPayment) => {
    if (cart.length === 0) return;
    if (payment.cashGiven < grandTotal) return;

    setIsSubmitting(true);

    try {
      // Step A: Insert Order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          shop_id: storeId,
          customer_name: "Pelanggan Umum",
          subtotal: grandTotal,
          discount_amount: 0,
          tax: 0,
          total_amount: grandTotal,
          payment_method: "cash",
          cash_given: payment.cashGiven,
          change_amount: payment.changeAmount,
          order_type: "dine-in",
          status: "completed",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (orderData) {
        // Step B: Insert Items
        const orderItems = cart.map((item) => ({
          order_ref_id: orderData.id,
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Step C: Update Stok
        for (const item of cart) {
          if (item.stock !== undefined && item.stock !== null) {
            const newStock = Math.max(0, item.stock - item.quantity);
            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.id);
          }
        }

        const kembalian =
          payment.changeAmount > 0
            ? `\nKembalian: Rp ${payment.changeAmount.toLocaleString("id-ID")}`
            : "";
        alert(`Transaksi berhasil disimpan!${kembalian}`);

        setCart([]);
        await loadProducts();
        setIsMobileCartOpen(false);
      }
    } catch (err: any) {
      console.error("Gagal simpan transaksi:", err);
      alert(err.message || "Gagal menyimpan transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Katalog: filter & render =====
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "Semua" || product.category === selectedCategory;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      (product.sku && product.sku.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  const renderProductImage = (product: Product) => {
    const imgSource = product.image_url;
    if (imgSource && (imgSource.startsWith("http://") || imgSource.startsWith("https://"))) {
      return (
        <img
          src={imgSource}
          alt={product.name}
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }
    return <span className="text-2xl">📦</span>;
  };

  return (
    <div className="relative flex flex-col lg:flex-row h-[calc(100dvh-3.5rem)] md:h-screen -m-4 sm:-m-6 lg:-m-8 bg-slate-50 font-sans overflow-hidden">
      {/* ===== Katalog (Kiri) ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 lg:p-5 gap-3">
        {/* Top Bar / Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Barcode className="w-5 h-5 text-emerald-600" /> Kasir Penjualan Toko
            </h1>
            <p className="text-[11px] text-slate-400">Pilih atau scan barcode barang</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama barang / SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <button onClick={loadProducts} className="font-bold hover:underline shrink-0">
              Coba lagi
            </button>
          </div>
        )}

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto px-2 pt-3 pb-24 lg:pb-3">
          {isLoadingProducts ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" /> Memuat data produk...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <p>Produk tidak ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((item) => item.id === product.id);
                const qtyInCart = cartItem?.quantity || 0;

                const isOutOfStock =
                  !product.is_available ||
                  (product.stock !== undefined && product.stock !== null && product.stock <= 0);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleAddToCart(product)}
                    className={`group relative bg-white border p-3 rounded-2xl transition-all flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                        : "cursor-pointer hover:border-emerald-500 hover:shadow-md"
                    } ${
                      qtyInCart > 0
                        ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-xs"
                        : "border-slate-200"
                    }`}
                  >
                    {qtyInCart > 0 && (
                      <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10">
                        {qtyInCart}
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="w-full h-16 sm:h-20 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                        {renderProductImage(product)}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {product.category || "Umum"}
                          </span>
                          {product.sku && (
                            <span className="text-[9px] font-mono text-slate-400">
                              {product.sku}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
                          {product.name}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-extrabold text-emerald-600">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isOutOfStock ? "text-rose-500" : "text-slate-500"
                        }`}
                      >
                        {isOutOfStock
                          ? "Habis"
                          : product.stock !== undefined && product.stock !== null
                          ? `Stok: ${product.stock}`
                          : "Tersedia"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Cart (Kanan) - komponen independen ===== */}
      <CartPanel
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        isSubmitting={isSubmitting}
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
      />

      {/* Floating Button Mobile */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <CartIcon className="w-5 h-5" />
              {totalItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItemCount}
                </span>
              )}
            </div>
            <span>{totalItemCount} Barang Terpilih</span>
          </div>
          <span className="text-emerald-400">Rp {grandTotal.toLocaleString("id-ID")} →</span>
        </button>
      </div>
    </div>
  );
}