"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase"; // sesuaikan dengan lokasi klien Supabase Anda
import type { CheckoutPayment, PanelCartItem } from "./CartPanel";
import {
  getDiscountedPrice,
  hasStockLimit,
  isSoldOutProduct,
  type Notice,
  type Product,
  type StockPrompt,
} from "./utils";

const ALL_CATEGORY = "Semua";

type CartMap = Record<string, number>;

export function usePOS(storeId: string) {
  // ===== Produk =====
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ===== Pencarian (teks ketikan & saran dikelola lokal di kolom pencarian) =====
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

  // ===== Keranjang: { productId: quantity } =====
  // cartRef selalu berisi nilai terbaru agar handler bisa stabil (tidak dibuat ulang tiap perubahan)
  const [cartQty, setCartQtyState] = useState<CartMap>({});
  const cartRef = useRef<CartMap>({});
  const setCart = useCallback((updater: (prev: CartMap) => CartMap) => {
    const next = updater(cartRef.current);
    cartRef.current = next;
    setCartQtyState(next);
  }, []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== Modal =====
  const [stockPrompt, setStockPrompt] = useState<StockPrompt | null>(null);
  const [addQty, setAddQty] = useState("");
  const [stockError, setStockError] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // ---------- Muat produk ----------
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, shop_id, sku, name, category, price, stock, min_stock, unit, track_stock, image_url, is_available, discount_type, discount_value, discount_ends_at"
      )
      .eq("shop_id", storeId)
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage("Gagal memuat produk. Periksa koneksi lalu coba lagi.");
    } else {
      setProducts((data ?? []) as Product[]);
    }
    setIsLoadingProducts(false);
  }, [storeId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ---------- Turunan ----------
  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const productByIdRef = useRef(productById);
  productByIdRef.current = productById;

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category || "Umum"));
    return [ALL_CATEGORY, ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = appliedSearch.toLowerCase();
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === ALL_CATEGORY || (p.category || "Umum") === selectedCategory;
      const matchSearch =
        !q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, appliedSearch, selectedCategory]);

  // Jalankan pencarian (dipanggil kolom pencarian: tombol cari / Enter / pilih saran / kosongkan)
  const submitSearch = useCallback((value: string) => {
    setAppliedSearch(value.trim());
  }, []);

  const panelCart: PanelCartItem[] = useMemo(() => {
    const items: PanelCartItem[] = [];
    for (const [id, quantity] of Object.entries(cartQty)) {
      const p = productById.get(id);
      if (!p || quantity <= 0) continue;
      items.push({
        id,
        name: p.name,
        price: getDiscountedPrice(p), // harga satuan setelah diskon
        originalPrice: Number(p.price),
        quantity,
        stock: hasStockLimit(p) ? (p.stock as number) : null,
      });
    }
    return items;
  }, [cartQty, productById]);

  const qtyById = cartQty;
  const totalItemCount = panelCart.reduce((s, i) => s + i.quantity, 0);
  const grandTotal = panelCart.reduce((s, i) => s + i.price * i.quantity, 0);

  const promptProduct = stockPrompt ? productById.get(stockPrompt.productId) ?? null : null;
  const promptStockAfter = (promptProduct?.stock ?? 0) + (parseInt(addQty, 10) || 0);

  // ---------- Prompt stok ----------
  const openStockPrompt = useCallback(
    (product: Product, target: number, increment: boolean) => {
      const needed = Math.max(1, target - (product.stock ?? 0));
      setStockPrompt({ productId: product.id, target, needed, increment });
      setAddQty(String(needed));
      setStockError("");
    },
    []
  );

  const closeStockPrompt = useCallback(() => {
    setStockPrompt(null);
    setAddQty("");
    setStockError("");
  }, []);

  const changeAddQty = useCallback((value: string) => {
    setAddQty(value);
    setStockError("");
  }, []);

  // Ubah jumlah di keranjang ke `target`, atau minta tambah stok bila kurang
  const requestQty = useCallback(
    (product: Product, target: number, increment: boolean) => {
      if (hasStockLimit(product) && target > (product.stock as number)) {
        openStockPrompt(product, target, increment);
        return;
      }
      setCart((prev) => {
        const next = { ...prev };
        if (target <= 0) delete next[product.id];
        else next[product.id] = target;
        return next;
      });
    },
    [openStockPrompt, setCart]
  );

  // ---------- Aksi keranjang (semua stabil: dibaca lewat ref) ----------
  const handleAddToCart = useCallback(
    (product: Product) => {
      const current = productByIdRef.current.get(product.id) ?? product;
      if (!current.is_available && !isSoldOutProduct(current)) return;
      requestQty(current, (cartRef.current[current.id] || 0) + 1, true);
    },
    [requestQty]
  );

  const handleUpdateQuantity = useCallback(
    (id: string, delta: number) => {
      const product = productByIdRef.current.get(id);
      if (!product) return;
      requestQty(product, (cartRef.current[id] || 0) + delta, delta > 0);
    },
    [requestQty]
  );

  const handleClearCart = useCallback(() => setCart(() => ({})), [setCart]);

  const handleStockShortage = useCallback(
    (id: string, increment: boolean) => {
      const product = productByIdRef.current.get(id);
      if (!product) return;
      const current = cartRef.current[id] || 0;
      openStockPrompt(product, increment ? current + 1 : current, increment);
    },
    [openStockPrompt]
  );

  const handleSubmitStockPrompt = useCallback(async () => {
    if (!stockPrompt || !promptProduct || isAddingStock) return;

    const qty = parseInt(addQty, 10) || 0;
    if (qty <= 0) {
      setStockError("Masukkan jumlah stok yang valid.");
      return;
    }
    if (promptStockAfter < stockPrompt.target) {
      setStockError(
        `Stok masih kurang dari kebutuhan (${stockPrompt.target}). Minimal tambah ${stockPrompt.needed}.`
      );
      return;
    }

    setIsAddingStock(true);
    const { error } = await supabase
      .from("products")
      .update({ stock: promptStockAfter })
      .eq("id", promptProduct.id)
      .eq("shop_id", storeId);
    setIsAddingStock(false);

    if (error) {
      setStockError("Gagal menyimpan stok. Coba lagi.");
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === promptProduct.id ? { ...p, stock: promptStockAfter } : p))
    );
    if (stockPrompt.increment) {
      setCart((prev) => ({ ...prev, [promptProduct.id]: stockPrompt.target }));
    }
    closeStockPrompt();
  }, [
    stockPrompt,
    promptProduct,
    isAddingStock,
    addQty,
    promptStockAfter,
    storeId,
    closeStockPrompt,
    setCart,
  ]);

  // ---------- Checkout ----------
  const handleCheckout = useCallback(
    async (payment: CheckoutPayment) => {
      if (isSubmitting || panelCart.length === 0) return;

      // Validasi ulang stok sebelum menyimpan
      for (const item of panelCart) {
        if (item.stock !== null && item.quantity > item.stock) {
          handleStockShortage(item.id, false);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            shop_id: storeId,
            source: "pos",
            service_type: "walk_in",
            status: "completed",
            payment_status: "paid",
            payment_method: payment.paymentMethod,
            subtotal: payment.subtotal, // sebelum diskon
            discount: payment.discountAmount,
            total_amount: payment.totalAmount,
            cash_given: payment.cashGiven,
            change_amount: payment.changeAmount,
            notes: payment.notes,
          })
          .select("id")
          .single();

        if (orderError || !order) throw orderError ?? new Error("Pesanan gagal dibuat");

        const { error: itemsError } = await supabase.from("order_items").insert(
          panelCart.map((item) => ({
            order_ref_id: order.id,
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          }))
        );

        if (itemsError) {
          await supabase.from("orders").delete().eq("id", order.id); // batalkan pesanan yatim
          throw itemsError;
        }

        // Kurangi stok dari sisi klien (hanya produk yang stoknya dihitung)
        const stockUpdates = panelCart
          .filter((item) => item.stock !== null)
          .map((item) => ({ id: item.id, newStock: (item.stock as number) - item.quantity }));

        const results = await Promise.all(
          stockUpdates.map((u) =>
            supabase
              .from("products")
              .update({ stock: u.newStock })
              .eq("id", u.id)
              .eq("shop_id", storeId)
          )
        );
        const stockFailed = results.some((r) => r.error);

        setProducts((prev) =>
          prev.map((p) => {
            const u = stockUpdates.find((x) => x.id === p.id);
            return u ? { ...p, stock: u.newStock } : p;
          })
        );
        setCart(() => ({}));
        setIsCartOpen(false);

        setNotice(
          stockFailed
            ? {
                type: "warning",
                title: "Transaksi tersimpan",
                message: "Namun stok sebagian barang gagal diperbarui. Periksa halaman produk.",
                change: payment.changeAmount ?? undefined,
              }
            : {
                type: "success",
                title: "Transaksi berhasil",
                message: `${totalItemCount} barang, total ${formatTotal(grandTotal)}`,
                change: payment.changeAmount ?? undefined,
              }
        );
      } catch (err) {
        setNotice({
          type: "error",
          title: "Transaksi gagal",
          message: err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, panelCart, storeId, handleStockShortage, totalItemCount, grandTotal, setCart]
  );

  return {
    // katalog
    allProducts: products,
    filteredProducts,
    categories,
    selectedCategory,
    setSelectedCategory,
    submitSearch,
    qtyById,
    isLoadingProducts,
    errorMessage,
    loadProducts,
    handleAddToCart,
    // keranjang
    panelCart,
    totalItemCount,
    grandTotal,
    isCartOpen,
    setIsCartOpen,
    isSubmitting,
    handleUpdateQuantity,
    handleClearCart,
    handleCheckout,
    handleStockShortage,
    // modal stok
    stockPrompt,
    promptProduct,
    addQty,
    promptStockAfter,
    stockError,
    isAddingStock,
    changeAddQty,
    handleSubmitStockPrompt,
    closeStockPrompt,
    // notifikasi
    notice,
    setNotice,
  };
}

const formatTotal = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;