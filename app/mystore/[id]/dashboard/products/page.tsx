"use client";

import React, { useState, use } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertCircle,
  XCircle,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";

// Mock Data Produk
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "PRD-001",
    name: "Kopi Kenangan Mantan",
    category: "Kopi",
    price: 18000,
    stock: 25,
    isAvailable: true,
  },
  {
    id: "PRD-002",
    name: "Uji Matcha Latte",
    category: "Non-Kopi",
    price: 28000,
    stock: 12,
    isAvailable: true,
  },
  {
    id: "PRD-003",
    name: "Butter Croissant",
    category: "Pastry",
    price: 22000,
    stock: 3, // Stok Menipis
    isAvailable: true,
  },
  {
    id: "PRD-004",
    name: "Cheese Croissant",
    category: "Pastry",
    price: 25000,
    stock: 0, // Stok Habis
    isAvailable: false,
  },
  {
    id: "PRD-005",
    name: "Americano Ice",
    category: "Kopi",
    price: 15000,
    stock: 40,
    isAvailable: true,
  },
];

export default function ProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State untuk Tambah Produk
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Kopi",
    price: "",
    stock: "",
  });

  // Filter Produk
  const filteredProducts = products.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Semua" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Ringkasan Statistik
  const totalProducts = products.length;
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= 5
  ).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;

  // Toggle Ketersediaan Stok
  const toggleAvailability = (id: string) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  // Hapus Produk
  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Tambah Produk Baru
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const addedProduct: Product = {
      id: `PRD-00${products.length + 1}`,
      name: newProduct.name,
      category: newProduct.category,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock) || 0,
      isAvailable: Number(newProduct.stock) > 0,
    };

    setProducts([addedProduct, ...products]);
    setNewProduct({ name: "", category: "Kopi", price: "", stock: "" });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Produk & Stok
          </h1>
          <p className="text-xs text-slate-500">
            Kelola katalog menu, harga, dan ketersediaan stok toko Anda
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Ringkasan Stok Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Produk</p>
            <p className="text-lg font-black text-slate-900">{totalProducts}</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Stok Menipis (≤5)</p>
            <p className="text-lg font-black text-amber-600">
              {lowStockProducts} Menu
            </p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Stok Habis</p>
            <p className="text-lg font-black text-rose-600">
              {outOfStockProducts} Menu
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {["Semua", "Kopi", "Non-Kopi", "Pastry"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table View Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Produk</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Harga</th>
                <th className="px-4 py-3.5">Stok</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {product.name}
                    <span className="block text-[10px] font-normal text-slate-400">
                      {product.id}
                    </span>
                  </td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Rp {product.price.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        product.stock === 0
                          ? "text-rose-600"
                          : product.stock <= 5
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                    >
                      {product.stock} pcs
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability(product.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                        product.isAvailable && product.stock > 0
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      {product.isAvailable && product.stock > 0 ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tersedia</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Tidak Aktif / Habis</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {product.category} • {product.id}
                  </p>
                </div>
                <span className="font-bold text-slate-900 text-sm">
                  Rp {product.price.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-xs font-semibold ${
                    product.stock === 0
                      ? "text-rose-600"
                      : product.stock <= 5
                      ? "text-amber-600"
                      : "text-slate-600"
                  }`}
                >
                  Stok: {product.stock} pcs
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailability(product.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      product.isAvailable && product.stock > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {product.isAvailable && product.stock > 0 ? "Bisa Dipesan" : "Tutup"}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Tidak ada produk yang cocok dengan pencarian.
          </div>
        )}
      </div>

      {/* Modal Tambah Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-base">
                Tambah Produk Baru
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Produk / Menu
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cafe Latte Ice"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Kopi">Kopi</option>
                    <option value="Non-Kopi">Non-Kopi</option>
                    <option value="Pastry">Pastry</option>
                    <option value="Makanan Utama">Makanan Utama</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, stock: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  required
                  placeholder="25000"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}