"use client";

import React, { useState, use } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Utensils,
  ShoppingBag,
  Bike,
  Receipt,
  RotateCcw,
} from "lucide-react";

// Types
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
}

// Mock Products Data
const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Kopi Kenangan Mantan",
    category: "Kopi",
    price: 18000,
    stock: 25,
    image: "☕",
  },
  {
    id: "p2",
    name: "Americano Ice",
    category: "Kopi",
    price: 15000,
    stock: 40,
    image: "🧊",
  },
  {
    id: "p3",
    name: "Uji Matcha Latte",
    category: "Non-Kopi",
    price: 28000,
    stock: 12,
    image: "🍵",
  },
  {
    id: "p4",
    name: "Earl Grey Milk Tea",
    category: "Non-Kopi",
    price: 22000,
    stock: 18,
    image: "🧋",
  },
  {
    id: "p5",
    name: "Butter Croissant",
    category: "Pastry",
    price: 25000,
    stock: 8,
    image: "🥐",
  },
  {
    id: "p6",
    name: "Cheese Danish",
    category: "Pastry",
    price: 27000,
    stock: 5,
    image: "🧀",
  },
  {
    id: "p7",
    name: "French Fries",
    category: "Snack",
    price: 18000,
    stock: 30,
    image: "🍟",
  },
  {
    id: "p8",
    name: "Red Velvet Cake",
    category: "Snack",
    price: 32000,
    stock: 6,
    image: "🍰",
  },
];

const CATEGORIES = ["Semua", "Kopi", "Non-Kopi", "Pastry", "Snack"];

export default function POSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  // States
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "card">("cash");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{
    orderId: string;
    total: number;
    cash: number;
    change: number;
    items: CartItem[];
  } | null>(null);

  // Filter Products
  const filteredProducts = MOCK_PRODUCTS.filter((product) => {
    const matchesCategory =
      selectedCategory === "Semua" || product.category === selectedCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart Operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setCart([]);

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.1); // Tax 10%
  const grandTotal = subtotal + tax;

  const numCashGiven = parseFloat(cashGiven) || 0;
  const changeAmount = paymentMethod === "cash" ? numCashGiven - grandTotal : 0;

  // Checkout Handler
  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && numCashGiven < grandTotal) return;

    const newTx = {
      orderId: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
      total: grandTotal,
      cash: paymentMethod === "cash" ? numCashGiven : grandTotal,
      change: changeAmount,
      items: [...cart],
    };

    setLastTransaction(newTx);
    setIsSuccessModalOpen(true);
  };

  const handleResetForNewOrder = () => {
    setCart([]);
    setCashGiven("");
    setIsSuccessModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 bg-slate-100 overflow-hidden">
      {/* ================= LEFT SECTION: CATALOG ================= */}
      <div className="flex-1 flex flex-col h-full space-y-4 min-w-0">
        {/* Header & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Kasir (POS)
            </h1>
            <p className="text-xs text-slate-500">
              Pilih produk untuk ditambahkan ke keranjang pesanan
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari menu produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((item) => item.id === product.id);
              const qtyInCart = cartItem?.quantity || 0;

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`group relative bg-white border p-3.5 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all shadow-xs flex flex-col justify-between ${
                    qtyInCart > 0 ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-slate-200/80"
                  }`}
                >
                  {qtyInCart > 0 && (
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10">
                      {qtyInCart}
                    </span>
                  )}

                  <div className="space-y-2">
                    <div className="w-full h-20 bg-slate-50 rounded-xl flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                      {product.image}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {product.category}
                      </p>
                      <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-extrabold text-emerald-600">
                      Rp {product.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Stok: {product.stock}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= RIGHT SECTION: CART & CHECKOUT ================= */}
      <div className="w-full lg:w-96 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col h-full shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              Detail Pesanan
            </h2>
            <p className="text-[11px] text-slate-400">
              {cart.reduce((a, b) => a + b.quantity, 0)} Item dipilih
            </p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          )}
        </div>

        {/* Order Type Toggle */}
        <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setOrderType("dine-in")}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                orderType === "dine-in"
                  ? "bg-emerald-600 text-white font-bold"
                  : "hover:bg-slate-50"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dine In</span>
            </button>
            <button
              onClick={() => setOrderType("takeaway")}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                orderType === "takeaway"
                  ? "bg-emerald-600 text-white font-bold"
                  : "hover:bg-slate-50"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
            <button
              onClick={() => setOrderType("delivery")}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                orderType === "delivery"
                  ? "bg-emerald-600 text-white font-bold"
                  : "hover:bg-slate-50"
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Receipt className="w-12 h-12 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Keranjang masih kosong</p>
              <p className="text-[10px] text-slate-400">
                Klik produk di sebelah kiri untuk ditambahkan
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] font-semibold text-emerald-600">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Calculation Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50 shrink-0">
          {/* Summary Prices */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Pajak PB1 (10%)</span>
              <span>Rp {tax.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Bayar</span>
              <span className="text-emerald-600">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold pt-1">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                paymentMethod === "cash"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Tunai</span>
            </button>
            <button
              onClick={() => setPaymentMethod("qris")}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                paymentMethod === "qris"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QRIS</span>
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                paymentMethod === "card"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Kartu</span>
            </button>
          </div>

          {/* Cash Input & Preset Buttons */}
          {paymentMethod === "cash" && (
            <div className="space-y-2 pt-1">
              <input
                type="number"
                placeholder="Jumlah Uang Diterima"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-800"
              />
              <div className="flex gap-1.5">
                {[grandTotal, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashGiven(amt.toString())}
                    className="flex-1 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
                  >
                    {amt === grandTotal
                      ? "Uang Pas"
                      : `Rp ${(amt / 1000).toFixed(0)}rb`}
                  </button>
                ))}
              </div>
              {numCashGiven > 0 && (
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span className="text-slate-500">Kembalian:</span>
                  <span
                    className={
                      changeAmount >= 0 ? "text-emerald-600" : "text-rose-600"
                    }
                  >
                    Rp {changeAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Checkout Button */}
          <button
            disabled={
              cart.length === 0 ||
              (paymentMethod === "cash" && numCashGiven < grandTotal)
            }
            onClick={handleCheckout}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Proses Bayar (Rp {grandTotal.toLocaleString("id-ID")})</span>
          </button>
        </div>
      </div>

      {/* ================= TRANSACTION SUCCESS MODAL ================= */}
      {isSuccessModalOpen && lastTransaction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lastTransaction.orderId}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Belanja:</span>
                <span className="font-bold text-slate-900">
                  Rp {lastTransaction.total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Bayar ({paymentMethod.toUpperCase()}):</span>
                <span className="font-bold text-slate-900">
                  Rp {lastTransaction.cash.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Kembalian:</span>
                <span className="text-emerald-600">
                  Rp {lastTransaction.change.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleResetForNewOrder}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Transaksi Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}