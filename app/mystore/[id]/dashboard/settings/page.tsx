"use client";

import React, { useState, use } from "react";
import {
  Store,
  Clock,
  CreditCard,
  ShieldCheck,
  Save,
  MapPin,
  Phone,
  Mail,
  Upload,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<
    "profile" | "hours" | "payment" | "security"
  >("profile");
  const [isSaved, setIsSaved] = useState(false);

  // Form State Demo
  const [profile, setProfile] = useState({
    name: "Kopi Kenangan Senja Rungkut",
    category: "Kopi & Minuman",
    phone: "081234567890",
    email: "store.rungkut@kopikenangan.id",
    address: "Jl. Raya Rungkut No. 45, Surabaya",
    description:
      "Menyajikan racikan kopi lokal berkualitas tinggi dengan cita rasa otentik.",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Pengaturan Toko
          </h1>
          <p className="text-xs text-slate-500">
            Kelola preferensi, profil, jam operasional, dan metode pembayaran
          </p>
        </div>

        {/* Floating Notification Saved */}
        {isSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Perubahan berhasil disimpan!</span>
          </div>
        )}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sub-Navigation Sidebar */}
        <div className="space-y-1">
          {[
            { id: "profile", label: "Profil Toko", icon: Store },
            { id: "hours", label: "Jam Operasional", icon: Clock },
            { id: "payment", label: "Pembayaran & QRIS", icon: CreditCard },
            { id: "security", label: "Keamanan", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6"
          >
            {/* Tab 1: Profil Toko */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 text-sm">
                    Informasi Umum Toko
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Informasi ini akan terlihat oleh pelanggan di struk dan QR
                    menu
                  </p>
                </div>

                {/* Logo Upload */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-xl font-bold">
                    KK
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ugah Logo</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Format JPG, PNG max 2MB
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Nama Toko
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Kategori Bisnis
                    </label>
                    <input
                      type="text"
                      value={profile.category}
                      onChange={(e) =>
                        setProfile({ ...profile, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Nomor Telepon / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Email Toko
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Alamat Lengkap
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      value={profile.address}
                      onChange={(e) =>
                        setProfile({ ...profile, address: e.target.value })
                      }
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Jam Operasional */}
            {activeTab === "hours" && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 text-sm">
                    Jam Operasional Toko
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Atur jadwal buka toko otomatis untuk penerimaan pesanan
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    "Senin",
                    "Selasa",
                    "Rabu",
                    "Kamis",
                    "Jumat",
                    "Sabtu",
                    "Minggu",
                  ].map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3 w-28">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded-md text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700">
                          {day}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          defaultValue="08:00"
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          defaultValue="22:00"
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Pembayaran & QRIS */}
            {activeTab === "payment" && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 text-sm">
                    Metode Pembayaran
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Aktifkan opsi pembayaran yang didukung di toko Anda
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Tunai (Cash)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Menerima pembayaran langsung di kasir
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded-md text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          QRIS Statis / Dinamis
                        </p>
                        <p className="text-[10px] text-slate-400">
                          BCA, Mandiri, GoPay, OVO, ShopeePay
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded-md text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Tab 4: Keamanan */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 text-sm">
                    PIN & Akses Kasir
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Atur PIN keamanan untuk akses void transaksi atau laporan
                  </p>
                </div>

                <div className="space-y-3 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      PIN Toko (6 Digit)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      defaultValue="123456"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}