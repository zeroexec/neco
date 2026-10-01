"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import {
  ShoppingBag as CartIcon,
  Search,
  Barcode,
  Loader2,
  Infinity as InfinityIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PackagePlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

import CartPanel, {
  CheckoutPayment,
  CartItem as PanelCartItem,
  Modal,
} from "./components/CartPanel";
import { useDebouncedValue } from "./components/useDebouncedValue";

// ===== Types =====
interface Product {
  id: string;
  shop_id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  price: number;
  stock?: number | null;
  min_stock?: number | null;
  unit?: string | null;
  track_stock?: boolean;
  image_url?: string | null;
  is_available: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

interface StockPrompt {
  productId: string;
  target: number; // jumlah yang dibutuhkan di keranjang
  needed: number; // minimal tambah stok agar target tercukupi
  increment: boolean; // true = naikkan jumlah keranjang 1 setelah stok ditambah
}

interface Notice {
  type: "success" | "error" | "warning";
  title: string;
  message?: string;
  change?: number;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// Produk punya batas stok hanya jika stoknya dihitung dan nilainya ada
const hasStockLimit = (product: Product): boolean =>
  (product.track_stock ?? true) &&
  product.stock !== undefined &&
  product.stock !== null;

const isSoldOutProduct = (product: Product): boolean =>
  hasStockLimit(product) && (product.stock as number) <= 0;

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
  const debouncedQuery = useDebouncedValue(searchQuery.trim().toLowerCase(), 300);
  const [cart, setCart] = useState<CartItem[]>([]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Modal custom
  const [notice, setNotice] = useState<Notice | null>(null);
  const [stockPrompt, setStockPrompt] = useState<StockPrompt | null>(null);
  const [addQty, setAddQty] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockError, setStockError] = useState("");

  // ===== Fetch Produk =====
  const loadProducts = async (silent = false) => {
    try {
      if (!silent) setIsLoadingProducts(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // ===== Tambah stok =====
  const addStock = async (id: string, amount: number) => {
    const product = products.find((p) => p.id === id);
    if (!product || !hasStockLimit(product)) {
      throw new Error("Produk tidak ditemukan atau stoknya tidak dihitung.");
    }

    const newStock = (product.stock as number) + amount;

    const { error } = await supabase
      .from("products")
      .update({
        stock: newStock,
        is_available: true, // stok terisi lagi -> aktif kembali
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: newStock, is_available: true } : p))
    );
  };

  // ===== Cart Handlers =====
  const pushToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Satu pintu untuk modal stok kurang (dari kartu produk maupun dari CartPanel)
  const openStockPrompt = (product: Product, target: number, increment: boolean) => {
    const needed = Math.max(1, target - ((product.stock as number) ?? 0));
    setStockPrompt({ productId: product.id, target, needed, increment });
    setAddQty(String(needed));
    setStockError("");
  };

  const closeStockPrompt = () => {
    if (isAddingStock) return;
    setStockPrompt(null);
    setStockError("");
  };

  // Klik kartu produk
  const handleAddToCart = (product: Product) => {
    // Nonaktif manual (stok masih ada) tetap diblokir; yang habis boleh klik untuk tambah stok
    if (!product.is_available && !isSoldOutProduct(product)) return;

    const existing = cart.find((item) => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (hasStockLimit(product) && currentQty + 1 > (product.stock as number)) {
      openStockPrompt(product, currentQty + 1, true);
      return;
    }

    pushToCart(product);
  };

  // Dipanggil CartPanel saat tombol + atau Bayar menemukan stok kurang
  const handleStockShortage = (id: string, increment: boolean) => {
    const product = products.find((p) => p.id === id);
    const item = cart.find((i) => i.id === id);
    if (!product || !item) return;
    openStockPrompt(product, item.quantity + (increment ? 1 : 0), increment);
  };

  // Stok untuk tombol + dan Bayar dicek di CartPanel; di sini hanya ubah jumlah
  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleClearCart = () => setCart([]);

  const handleSubmitStockPrompt = async () => {
    if (!stockPrompt) return;
    const amount = parseInt(addQty, 10) || 0;

    if (amount <= 0) {
      setStockError("Jumlah tambah stok harus lebih dari 0.");
      return;
    }
    if (amount < stockPrompt.needed) {
      setStockError(`Minimal tambah ${stockPrompt.needed} agar jumlah tercukupi.`);
      return;
    }

    const product = products.find((p) => p.id === stockPrompt.productId);
    if (!product) return;

    setIsAddingStock(true);
    setStockError("");
    try {
      await addStock(product.id, amount);
      if (stockPrompt.increment) pushToCart(product); // masuk / naik 1 di keranjang
      setStockPrompt(null);
    } catch (err: any) {
      console.error("Gagal menambah stok:", err);
      setStockError("Gagal menambah stok. Silakan coba lagi.");
    } finally {
      setIsAddingStock(false);
    }
  };

  // Data keranjang untuk CartPanel: stok selalu diambil dari data produk terbaru
  const panelCart: PanelCartItem[] = cart.map((item) => {
    const fresh = products.find((p) => p.id === item.id) ?? item;
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      stock: hasStockLimit(fresh) ? (fresh.stock as number) : null, // null = tanpa batas
    };
  });

  // Total untuk floating bar mobile
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ===== Checkout =====
  const handleCheckout = async (payment: CheckoutPayment) => {
    if (cart.length === 0) return;

    const isCash = payment.paymentMethod === "cash";
    // Validasi uang diterima hanya untuk pembayaran tunai
    if (isCash && (payment.cashGiven ?? 0) < grandTotal) return;

    const change = isCash ? payment.changeAmount ?? 0 : 0;

    setIsSubmitting(true);

    try {
      // Step A: Insert Order (order_number diisi otomatis oleh trigger)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          shop_id: storeId,
          source: "pos",
          service_type: "walk_in",
          status: "completed",
          customer_name: "Pelanggan Umum",
          subtotal: grandTotal,
          tax: 0,
          discount: 0,
          total_amount: grandTotal,
          payment_method: payment.paymentMethod,
          payment_status: "paid",
          cash_given: isCash ? payment.cashGiven : null,
          change_amount: isCash ? payment.changeAmount : null,
          paid_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          notes: payment.notes,
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

        if (itemsError) {
          // Rollback manual: hapus order agar tidak ada order tanpa item
          await supabase.from("orders").delete().eq("id", orderData.id);
          throw itemsError;
        }

        // Step C: Update Stok (hanya produk yang stoknya dihitung)
        const failedStockUpdates: string[] = [];

        for (const item of cart) {
          // Pakai data produk terbaru dari state, bukan salinan di keranjang
          const current = products.find((p) => p.id === item.id) ?? item;
          if (!hasStockLimit(current)) continue;

          const newStock = Math.max(0, (current.stock as number) - item.quantity);

          const { error: stockError } = await supabase
            .from("products")
            .update({
              stock: newStock,
              // Stok habis -> otomatis nonaktif
              is_available: newStock > 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          if (stockError) {
            console.error("Gagal update stok:", item.name, stockError);
            failedStockUpdates.push(item.name);
          }
        }

        setCart([]);
        setIsMobileCartOpen(false);

        if (failedStockUpdates.length > 0) {
          setNotice({
            type: "warning",
            title: "Transaksi tersimpan, stok belum sinkron",
            message: `Stok gagal diperbarui untuk: ${failedStockUpdates.join(
              ", "
            )}. Periksa stok secara manual.`,
            change: change > 0 ? change : undefined,
          });
        } else {
          setNotice({
            type: "success",
            title: "Transaksi berhasil disimpan",
            change: change > 0 ? change : undefined,
          });
        }

        await loadProducts(true);
      }
    } catch (err: any) {
      console.error("Gagal simpan transaksi:", err);
      setNotice({
        type: "error",
        title: "Transaksi gagal",
        message: err.message || "Gagal menyimpan transaksi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Katalog: filter & render =====
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          selectedCategory === "Semua" || product.category === selectedCategory;

        const matchesSearch =
          debouncedQuery === "" ||
          product.name.toLowerCase().includes(debouncedQuery) ||
          (product.sku && product.sku.toLowerCase().includes(debouncedQuery));

        return matchesCategory && matchesSearch;
      }),
    [products, selectedCategory, debouncedQuery]
  );

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

  // Data untuk modal tambah stok
  const promptProduct = stockPrompt
    ? products.find((p) => p.id === stockPrompt.productId) ?? null
    : null;
  const promptStockAfter = promptProduct
    ? ((promptProduct.stock as number) ?? 0) + (parseInt(addQty, 10) || 0)
    : 0;

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
            <button onClick={() => loadProducts()} className="font-bold hover:underline shrink-0">
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

                const tracksStock = product.track_stock ?? true;
                const limited = hasStockLimit(product);
                const isSoldOut = isSoldOutProduct(product);
                const isInactive = !product.is_available;
                // Habis tetap bisa diklik (untuk tambah stok); nonaktif manual diblokir
                const isBlocked = isInactive && !isSoldOut;
                const isLowStock =
                  limited &&
                  !isSoldOut &&
                  (product.stock as number) <= (product.min_stock ?? 0);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isBlocked && handleAddToCart(product)}
                    className={`group relative bg-white border p-3 rounded-2xl transition-all flex flex-col justify-between select-none ${
                      isBlocked
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                        : isSoldOut
                        ? "opacity-70 cursor-pointer border-slate-200 hover:border-amber-400 hover:shadow-md"
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
                        className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                          isSoldOut
                            ? "text-rose-500"
                            : isInactive
                            ? "text-slate-400"
                            : isLowStock
                            ? "text-amber-600"
                            : !tracksStock
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }`}
                      >
                        {isSoldOut ? (
                          "Habis · Tambah stok"
                        ) : isInactive ? (
                          "Nonaktif"
                        ) : !tracksStock ? (
                          <>
                            <InfinityIcon className="w-3 h-3" /> Tersedia
                          </>
                        ) : limited ? (
                          `Stok: ${product.stock} ${product.unit || "pcs"}`
                        ) : (
                          "Tersedia"
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Cart (Kanan) ===== */}
      <CartPanel
        cart={panelCart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onStockShortage={handleStockShortage}
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

      {/* ===== Modal: stok tidak cukup + tambah stok (satu-satunya, dipakai kartu & panel) ===== */}
      <Modal open={!!stockPrompt && !!promptProduct} onClose={closeStockPrompt}>
        {stockPrompt && promptProduct && (
          <>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  {isSoldOutProduct(promptProduct) ? "Stok habis" : "Stok tidak cukup"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-slate-700">{promptProduct.name}</span>{" "}
                  hanya tersisa {promptProduct.stock ?? 0} {promptProduct.unit || "pcs"},
                  sedangkan kamu butuh {stockPrompt.target}.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <PackagePlus className="w-3.5 h-3.5" />
                Tambah stok
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={addQty}
                onChange={(e) => {
                  setAddQty(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setStockError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitStockPrompt();
                }}
                disabled={isAddingStock}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Stok setelah ditambah:{" "}
                <span className="font-bold text-slate-600">{promptStockAfter}</span>
              </p>
              {stockError && (
                <p className="text-[11px] font-semibold text-rose-600">{stockError}</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={closeStockPrompt}
                disabled={isAddingStock}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Tutup
              </button>
              <button
                onClick={handleSubmitStockPrompt}
                disabled={isAddingStock}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white flex items-center justify-center gap-1.5"
              >
                {isAddingStock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{stockPrompt.increment ? "Simpan & Masukkan" : "Simpan Stok"}</span>
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ===== Modal: pemberitahuan hasil transaksi (pengganti alert) ===== */}
      <Modal open={!!notice} onClose={() => setNotice(null)}>
        {notice && (
          <>
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  notice.type === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : notice.type === "warning"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {notice.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : notice.type === "warning" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{notice.title}</h3>
                {notice.message && (
                  <p className="text-xs text-slate-500 mt-0.5 break-words">{notice.message}</p>
                )}
              </div>
            </div>

            {notice.change !== undefined && (
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">
                <span>Kembalian</span>
                <span className="text-base">{formatRp(notice.change)}</span>
              </div>
            )}

            <button
              onClick={() => setNotice(null)}
              autoFocus
              className="w-full py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
            >
              OK
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}