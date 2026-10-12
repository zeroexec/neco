"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Loader2, Package } from "lucide-react";
import ProductFormModal from "./components/ProductFormModal";
import ProductCard from "./components/ProductCard";
import ProductActionModal from "./components/ProductActionModal";
import DiscountModal from "./components/DiscountModal";
import { Product, GREEN_BTN } from "./components/utils";

export default function ProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  // Modal form tambah/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal opsi produk (muncul saat kartu diklik) & modal diskon
  const [actionProductId, setActionProductId] = useState<string | null>(null);
  const [discountProductId, setDiscountProductId] = useState<string | null>(null);

  // Ambil produk dari state terbaru agar modal selalu menampilkan data mutakhir
  const actionProduct = products.find((p) => p.id === actionProductId) ?? null;
  const discountProduct = products.find((p) => p.id === discountProductId) ?? null;

  const fetchProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setActionProductId(null);
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleOpenDiscount = (product: Product) => {
    setActionProductId(null);
    setDiscountProductId(product.id);
  };

  const toggleAvailability = async (product: Product) => {
    const nextStatus = !product.is_available;
    const tracksStock = product.track_stock ?? true;

    // Produk dengan stok habis tidak boleh diaktifkan
    if (nextStatus && tracksStock && product.stock <= 0) {
      alert("Stok produk habis. Tambahkan stok terlebih dahulu lewat menu Edit.");
      return;
    }

    try {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: nextStatus } : p))
      );

      const { error } = await supabase
        .from("products")
        .update({
          is_available: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating status:", err);
      fetchProducts(false);
    }
  };

  const handleDelete = async (product: Product) => {
    setActionProductId(null);
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;
    try {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting product:", err);
      fetchProducts(false);
    }
  };

  const filteredProducts = products.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) || (item.sku && item.sku.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === "Semua" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Ekstrak kategori unik
  const categories: string[] = [
    "Semua",
    ...Array.from(
      new Set(products.map((p) => p.category).filter((cat): cat is string => Boolean(cat)))
    ),
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Control Bar: Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-all shadow-sm"
          />
        </div>

        {/* Filter Kategori Horizontal */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? GREEN_BTN
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* State Loading & Empty */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Memuat data produk...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center flex flex-col items-center justify-center text-zinc-400 text-xs gap-2 shadow-sm">
          <Package className="w-10 h-10 text-zinc-300 stroke-1" />
          <span>Tidak ada produk yang ditemukan.</span>
        </div>
      ) : (
        // pb-24: ruang agar tombol bulat di pojok tidak menutupi kartu terakhir
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pb-24">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={(p) => setActionProductId(p.id)}
            />
          ))}
        </div>
      )}

      {/* Tombol tambah produk: bulat, pojok kanan bawah */}
      <button
        type="button"
        onClick={handleOpenAdd}
        aria-label="Tambah Produk"
        title="Tambah Produk"
        className={`fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700 ${GREEN_BTN}`}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal opsi produk */}
      <ProductActionModal
        product={actionProduct}
        onClose={() => setActionProductId(null)}
        onToggleAvailability={toggleAvailability}
        onDiscount={handleOpenDiscount}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Modal diskon */}
      <DiscountModal
        product={discountProduct}
        onClose={() => setDiscountProductId(null)}
        onSaved={() => fetchProducts(false)}
      />

      {/* Modal form tambah/edit */}
      <ProductFormModal
        isOpen={isModalOpen}
        storeId={storeId}
        editingProduct={editingProduct}
        categories={categories.filter((c) => c !== "Semua")}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchProducts(false)}
      />
    </div>
  );
}