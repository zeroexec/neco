"use client";

import React, { useState, use } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  QrCode,
  Bike,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  ChevronRight,
  Calculator,
  User,
  Phone,
  MapPin,
  X,
  ArrowUpRight,
} from "lucide-react";

// Types untuk Pesanan
type OrderType = "dine_in" | "delivery" | "pickup" | "pos";
type OrderStatus = "pending" | "processing" | "ready" | "completed" | "cancelled";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  type: OrderType;
  tableNumber?: string;
  address?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  paymentStatus: "paid" | "unpaid";
  paymentMethod: string;
}

// Mock Data Pesanan
const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    customerName: "Budi Santoso",
    customerPhone: "081234567890",
    type: "dine_in",
    tableNumber: "04",
    items: [
      { id: "1", name: "Kopi Kenangan Mantan", quantity: 2, price: 18000, notes: "Less sugar, ice normal" },
      { id: "2", name: "Roti Coklat Klasik", quantity: 1, price: 15000 },
    ],
    total: 51000,
    status: "pending",
    createdAt: "10 menit lalu",
    paymentStatus: "paid",
    paymentMethod: "QRIS",
  },
  {
    id: "ORD-1002",
    customerName: "Siti Rahma",
    customerPhone: "089876543210",
    type: "delivery",
    address: "Jl. Raya Rungkut No. 45, Surabaya",
    items: [
      { id: "3", name: "Matcha Latte Ice", quantity: 1, price: 28000 },
      { id: "4", name: "Butter Croissant", quantity: 2, price: 22000 },
    ],
    total: 72000,
    status: "processing",
    createdAt: "25 menit lalu",
    paymentStatus: "paid",
    paymentMethod: "Transfer Bank",
  },
  {
    id: "ORD-1003",
    customerName: "Andi Wijaya",
    customerPhone: "085678901234",
    type: "pickup",
    items: [
      { id: "5", name: "Americano Ice", quantity: 3, price: 20000, notes: "Extra shot 1" },
    ],
    total: 60000,
    status: "ready",
    createdAt: "40 menit lalu",
    paymentStatus: "paid",
    paymentMethod: "E-Wallet",
  },
  {
    id: "ORD-1004",
    customerName: "Pelanggan Kasir",
    type: "pos",
    items: [
      { id: "1", name: "Kopi Kenangan Mantan", quantity: 1, price: 18000 },
    ],
    total: 18000,
    status: "completed",
    createdAt: "1 jam lalu",
    paymentStatus: "paid",
    paymentMethod: "Tunai",
  },
  {
    id: "ORD-1005",
    customerName: "Dewi Lestari",
    customerPhone: "082143658709",
    type: "dine_in",
    tableNumber: "02",
    items: [
      { id: "3", name: "Matcha Latte Ice", quantity: 2, price: 28000 },
    ],
    total: 56000,
    status: "cancelled",
    createdAt: "2 jam lalu",
    paymentStatus: "unpaid",
    paymentMethod: "Belum Bayar",
  },
];

export default function OrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter Pesanan
  const filteredOrders = orders.filter((order) => {
    const matchesType = selectedType === "all" || order.type === selectedType;
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  // Helper Badge Tipe Pesanan
  const getTypeBadge = (type: OrderType, tableNumber?: string) => {
    switch (type) {
      case "dine_in":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <QrCode className="w-3.5 h-3.5" />
            Meja {tableNumber || "-"}
          </span>
        );
      case "delivery":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Bike className="w-3.5 h-3.5" />
            Pesan Antar
          </span>
        );
      case "pickup":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ShoppingBag className="w-3.5 h-3.5" />
            Pick Up
          </span>
        );
      case "pos":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Calculator className="w-3.5 h-3.5" />
            Kasir (POS)
          </span>
        );
    }
  };

  // Helper Badge Status
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Baru Masuk
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <ChefHat className="w-3.5 h-3.5" />
            Diproses
          </span>
        );
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Siap Diambil/Kirim
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selesai
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Dibatalkan
          </span>
        );
    }
  };

  // Update Status Handler
  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Daftar Pesanan
          </h1>
          <p className="text-xs text-slate-500">
            Kelola dan pantau seluruh transaksi pesanan masuk secara nyata
          </p>
        </div>

        {/* Ringkasan Jumlah Pesanan Aktif */}
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-800">
              {orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length} Pesanan Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ID Pesanan atau Nama Pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-emerald-500 transition-all"
          />
        </div>

        {/* Filter Tabs & Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Tab Jenis Pesanan */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: "all", label: "Semua Tipe" },
              { id: "dine_in", label: "Pesan Meja" },
              { id: "delivery", label: "Pesan Antar" },
              { id: "pickup", label: "Pick Up" },
              { id: "pos", label: "Kasir (POS)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedType === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Baru Masuk</option>
              <option value="processing">Diproses</option>
              <option value="ready">Siap Ambil/Kirim</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Pesanan */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="p-3 bg-slate-100 text-slate-400 w-fit rounded-full mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-sm">Tidak ada pesanan ditemukan</p>
          <p className="text-xs text-slate-400">
            Coba ubah kata kunci pencarian atau filter status yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Header Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {order.id}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • {order.createdAt}
                    </span>
                  </div>
                  {getTypeBadge(order.type, order.tableNumber)}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">
                      {order.customerName}
                    </p>
                    {order.customerPhone && (
                      <p className="text-[11px] text-slate-400">
                        {order.customerPhone}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </div>

              {/* Items Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-slate-700 font-medium"
                  >
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer Card */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400">Total Pembayaran</p>
                  <p className="text-sm font-black text-emerald-600">
                    Rp {order.total.toLocaleString("id-ID")}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer / Modal Detail Pesanan */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-extrabold text-base text-slate-900">
                  Detail Pesanan {selectedOrder.id}
                </h2>
                <p className="text-xs text-slate-400">
                  Waktu: {selectedOrder.createdAt}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 sm:p-5 space-y-5 flex-1">
              {/* Type & Status */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tipe Pesanan
                  </p>
                  <div className="mt-1">
                    {getTypeBadge(selectedOrder.type, selectedOrder.tableNumber)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Status Pesanan
                  </p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              {/* Info Pelanggan */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Informasi Pelanggan
                </h3>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-bold">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.customerPhone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{selectedOrder.customerPhone}</span>
                    </div>
                  )}
                  {selectedOrder.address && (
                    <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedOrder.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Menu */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Rincian Item Menu
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 text-xs">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3.5 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>
                          Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                          Catatan: {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pembayaran */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Informasi Pembayaran
                </h3>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Metode Pembayaran</span>
                    <span className="font-semibold text-slate-800">
                      {selectedOrder.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Bayar</span>
                    <span className="font-bold text-emerald-600 uppercase">
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-sm text-slate-900">
                    <span>Total Pembayaran</span>
                    <span className="text-emerald-600">
                      Rp {selectedOrder.total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer (Aksi Update Status) */}
            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Ubah Status Pesanan
              </p>
              <div className="grid grid-cols-2 gap-2">
                {selectedOrder.status === "pending" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}
                    className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Terima & Proses Pesanan
                  </button>
                )}

                {selectedOrder.status === "processing" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "ready")}
                    className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Tandai Siap (Ambil/Kirim)
                  </button>
                )}

                {selectedOrder.status === "ready" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "completed")}
                    className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Selesaikan Pesanan
                  </button>
                )}

                {selectedOrder.status !== "completed" &&
                  selectedOrder.status !== "cancelled" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "cancelled")}
                      className="col-span-2 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-colors"
                    >
                      Batalkan Pesanan
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}