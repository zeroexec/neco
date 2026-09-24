"use client";

import React, { useState, use } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  Edit2,
  Trash2,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: "Manager" | "Kasir" | "Barista" | "Kitchen";
  email: string;
  phone: string;
  status: "Aktif" | "Nonaktif";
  joinDate: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Adlan Ridho",
    role: "Manager",
    email: "adlan@tokomu.id",
    phone: "081234567890",
    status: "Aktif",
    joinDate: "10 Jan 2024",
  },
  {
    id: "EMP-002",
    name: "Siti Rahma",
    role: "Kasir",
    email: "siti.rahma@gmail.com",
    phone: "082198765432",
    status: "Aktif",
    joinDate: "15 Feb 2024",
  },
  {
    id: "EMP-003",
    name: "Budi Santoso",
    role: "Barista",
    email: "budi.barista@gmail.com",
    phone: "085712344321",
    status: "Aktif",
    joinDate: "01 Mar 2024",
  },
  {
    id: "EMP-004",
    name: "Dewi Lestari",
    role: "Kitchen",
    email: "dewi.kitchen@gmail.com",
    phone: "081900112233",
    status: "Nonaktif",
    joinDate: "12 Apr 2024",
  },
];

export default function EmployeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;

  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    role: "Kasir" as Employee["role"],
    email: "",
    phone: "",
  });

  // Filter Data
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "All" || emp.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Handle Tambah Karyawan
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newEmp: Employee = {
      id: `EMP-00${employees.length + 1}`,
      name: formData.name,
      role: formData.role,
      email: formData.email,
      phone: formData.phone || "-",
      status: "Aktif",
      joinDate: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    setEmployees([newEmp, ...employees]);
    setFormData({ name: "", role: "Kasir", email: "", phone: "" });
    setIsAddModalOpen(false);
  };

  // Toggle Status Aktif/Nonaktif
  const toggleStatus = (id: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              status: emp.status === "Aktif" ? "Nonaktif" : "Aktif",
            }
          : emp
      )
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Kelola Karyawan
          </h1>
          <p className="text-xs text-slate-500">
            Atur staf toko, hak akses, dan peran operasional harian
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Karyawan</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500">Total Karyawan</p>
          <p className="text-2xl font-black text-slate-900">{employees.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500">Status Aktif</p>
          <p className="text-2xl font-black text-emerald-600">
            {employees.filter((e) => e.status === "Aktif").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500">Kasir & POS</p>
          <p className="text-2xl font-black text-blue-600">
            {employees.filter((e) => e.role === "Kasir").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500">Barista & Kitchen</p>
          <p className="text-2xl font-black text-purple-600">
            {employees.filter((e) => e.role === "Barista" || e.role === "Kitchen").length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {["All", "Manager", "Kasir", "Barista", "Kitchen"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === role
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {role === "All" ? "Semua Peran" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Karyawan</th>
                <th className="px-5 py-3.5">Peran (Role)</th>
                <th className="px-5 py-3.5">Kontak</th>
                <th className="px-5 py-3.5">Bergabung</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Karyawan tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User Profile */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {emp.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          emp.role === "Manager"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : emp.role === "Kasir"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {emp.role}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="px-5 py-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{emp.phone}</span>
                      </div>
                    </td>

                    {/* Join Date */}
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {emp.joinDate}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleStatus(emp.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          emp.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {emp.status === "Aktif" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{emp.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setEmployees(employees.filter((e) => e.id !== emp.id))
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Karyawan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-extrabold text-base text-slate-900">
                Tambah Karyawan Baru
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddEmployee} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Rizky"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Peran / Tanggung Jawab
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as Employee["role"],
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Kasir">Kasir (POS Access)</option>
                  <option value="Barista">Barista</option>
                  <option value="Kitchen">Kitchen Staff</option>
                  <option value="Manager">Manager (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="ahmad@gmail.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp / Telepon
                </label>
                <input
                  type="tel"
                  placeholder="08123456789"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}