"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import ProductFormModal, { Product } from "./components/ProductFormModal";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Package,
  MoreVertical,
  AlertCircle,
  Infinity as InfinityIcon,
} from "lucide-react";

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // State menu dropdown aktif
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Tutup menu jika klik di luar area menu titik tiga manapun
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-product-menu]")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
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
  }, [storeId]);

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
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
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: nextStatus } : p
        )
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
      fetchProducts();
    }
  };

  const handleDelete = async (id: string) => {
    setActiveMenuId(null);
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;
    try {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting product:", err);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "Semua" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Ekstrak Kategori Unik
  const categories: string[] = [
    "Semua",
    ...Array.from(
      new Set(
        products
          .map((p) => p.category)
          .filter((cat): cat is string => Boolean(cat))
      )
    ),
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Daftar Produk
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Kelola {products.length} produk di toko Anda
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk</span>
        </button>
      </div>

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
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
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
          <Loader2 className="w-6 h-6 animate-spin text-zinc-900" />
          <span>Memuat data produk...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center flex flex-col items-center justify-center text-zinc-400 text-xs gap-2 shadow-sm">
          <Package className="w-10 h-10 text-zinc-300 stroke-1" />
          <span>Tidak ada produk yang ditemukan.</span>
        </div>
      ) : (
        /* Card Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredProducts.map((product) => {
            const tracksStock = product.track_stock ?? true;
            const isOutOfStock = tracksStock && product.stock <= 0;
            const isLowStock =
              tracksStock &&
              product.stock > 0 &&
              product.stock <= (product.min_stock ?? 0);

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-sm hover:border-zinc-300 transition-all flex flex-col justify-between gap-3 group relative"
              >
                {/* Header Card: Gambar & Info Produk */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail Gambar */}
                  <div className="w-14 h-14 rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden shrink-0 flex items-center justify-center text-zinc-400 relative">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-zinc-300" />
                    )}
                  </div>

                  {/* Info Produk */}
                  <div className="flex-1 min-w-0 space-y-1 pr-6">
                    <h3 className="font-semibold text-zinc-900 text-sm leading-snug line-clamp-1">
                      {product.name}
                    </h3>

                    {/* Badges Info (Kategori & SKU) */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-zinc-500">
                      {product.category && (
                        <span className="px-2 py-0.5 bg-zinc-100 rounded-md font-medium text-zinc-600">
                          {product.category}
                        </span>
                      )}
                      {product.sku && (
                        <span className="font-mono text-zinc-400">
                          {product.sku}
                        </span>
                      )}
                    </div>

                    {/* Harga */}
                    <p className="font-bold text-zinc-900 text-sm pt-0.5">
                      Rp {product.price?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>

                  {/* Menu Titik Tiga (Pojok Kanan Atas) */}
                  <div className="absolute top-3.5 right-3" data-product-menu>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === product.id ? null : product.id
                        );
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                      title="Opsi Produk"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Dropdown Menu */}
                    {activeMenuId === product.id && (
                      <div className="absolute right-0 top-7 w-52 bg-white rounded-xl border border-zinc-200 shadow-xl py-1 z-20 text-xs text-zinc-700">
                        {/* Saklar Tampilkan di Toko (is_available) */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.is_available}
                          onClick={() => toggleAvailability(product)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-zinc-50 transition-colors text-left cursor-pointer select-none"
                        >
                          <span className="font-medium text-zinc-700">
                            Tampilkan di toko
                          </span>
                          <span
                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              product.is_available
                                ? "bg-emerald-600"
                                : "bg-zinc-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                product.is_available
                                  ? "translate-x-4"
                                  : "translate-x-0"
                              }`}
                            />
                          </span>
                        </button>

                        <div className="my-1 border-t border-zinc-100" />

                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 transition-colors text-left font-medium text-zinc-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 transition-colors text-left font-medium text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Card: Stok & Status Availability Switcher */}
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                  {/* Info Stok */}
                  <div className="flex items-center gap-1 text-[11px]">
                    {!tracksStock ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <InfinityIcon className="w-3 h-3" /> Selalu tersedia
                      </span>
                    ) : isOutOfStock ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Habis
                      </span>
                    ) : isLowStock ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Menipis: {product.stock} {product.unit || "pcs"}
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        Stok:{" "}
                        <strong className="text-zinc-800 font-medium">
                          {product.stock}
                        </strong>{" "}
                        {product.unit || "pcs"}
                      </span>
                    )}
                  </div>

                  {/* Button Toggle Status */}
                  <button
                    type="button"
                    onClick={() => toggleAvailability(product)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      product.is_available
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        product.is_available ? "bg-emerald-600" : "bg-zinc-400"
                      }`}
                    />
                    <span>{product.is_available ? "Aktif" : "Nonaktif"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Component */}
      <ProductFormModal
        isOpen={isModalOpen}
        storeId={storeId}
        editingProduct={editingProduct}
        categories={categories.filter((c) => c !== "Semua")}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}