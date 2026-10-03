"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  X,
  Loader2,
  UtensilsCrossed,
  ImageOff,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  Bike,
  Store,
  CheckCircle2,
  LogIn,
  UserCog,
  MapPin,
  MessageCircle,
  User,
  ExternalLink,
  Landmark,
  Banknote,
  Copy,
  Check,
} from "lucide-react";

// ---------- Tipe data (sesuai tabel Supabase) ----------

interface VariantOption {
  id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
}

interface VariantGroup {
  id: string;
  name: string;
  is_required: boolean;
  allow_multiple: boolean;
  product_variant_options: VariantOption[];
}

interface ProductItem {
  id: string;
  name: string;
  category: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  stock: number;
  track_stock: boolean;
  unit: string | null;
  product_variant_groups: VariantGroup[];
}

interface CartLine {
  key: string; // productId:optionId,optionId
  productId: string;
  name: string; // nama + varian terpilih
  unitPrice: number;
  quantity: number;
  optionIds: string[];
}

// Data pemesan dari tabel profiles
interface OrdererProfile {
  full_name: string | null;
  whatsapp_number: string | null;
  address_full: string | null;
  city: string | null;
  postal_code: string | null;
  address_note: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
}

// Rekening toko dari tabel shop_bank_accounts
interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
}

type AuthState = "loading" | "guest" | "user";
type ServiceType = "delivery" | "pickup";
type PaymentMethod = "cash" | "transfer";
type View = "menu" | "checkout" | "success";

interface ShopMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string | null;
  shopName: string;
  canOrder?: boolean; // false saat toko sedang tutup
  acceptsDelivery?: boolean; // dari shops.accepts_delivery
  acceptsPickup?: boolean; // dari shops.accepts_pickup
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const simpleKey = (productId: string) => `${productId}:`;

// ---------- Sheet pilihan varian ----------

function VariantSheet({
  product,
  onClose,
  onConfirm,
}: {
  product: ProductItem;
  onClose: () => void;
  onConfirm: (options: VariantOption[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const toggle = (group: VariantGroup, optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.allow_multiple) {
        return {
          ...prev,
          [group.id]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      // Pilihan tunggal: klik lagi untuk membatalkan jika tidak wajib
      if (current.includes(optionId) && !group.is_required) {
        return { ...prev, [group.id]: [] };
      }
      return { ...prev, [group.id]: [optionId] };
    });
  };

  const chosenOptions = product.product_variant_groups.flatMap((g) =>
    g.product_variant_options.filter((o) =>
      (selected[g.id] ?? []).includes(o.id)
    )
  );

  const isValid = product.product_variant_groups.every(
    (g) => !g.is_required || (selected[g.id] ?? []).length > 0
  );

  const unitPrice =
    product.price + chosenOptions.reduce((s, o) => s + o.price_adjustment, 0);

  return (
    <div
      className="absolute inset-0 z-10 flex items-end bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-h-[85%] rounded-t-3xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 truncate">
              {product.name}
            </h4>
            <p className="text-xs text-slate-500">{formatRupiah(product.price)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup pilihan varian"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {product.product_variant_groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-800">{group.name}</p>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${group.is_required
                      ? "bg-rose-50 text-rose-600"
                      : "bg-slate-100 text-slate-500"
                    }`}
                >
                  {group.is_required ? "Wajib" : "Opsional"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {group.allow_multiple ? "Boleh lebih dari satu" : "Pilih satu"}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.product_variant_options.map((option) => {
                  const checked = (selected[group.id] ?? []).includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(group, option.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${checked
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 shrink-0 border-2 flex items-center justify-center ${group.allow_multiple ? "rounded" : "rounded-full"
                            } ${checked
                              ? "border-emerald-600 bg-emerald-600"
                              : "border-slate-300"
                            }`}
                        >
                          {checked && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {option.name}
                        </span>
                      </span>
                      {option.price_adjustment !== 0 && (
                        <span className="text-xs font-semibold text-slate-500 shrink-0">
                          {option.price_adjustment > 0 ? "+" : "-"}
                          {formatRupiah(Math.abs(option.price_adjustment))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            disabled={!isValid}
            onClick={() => onConfirm(chosenOptions)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            Tambah • {formatRupiah(unitPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Tombol +/- jumlah ----------

function QtyStepper({
  quantity,
  onMinus,
  onPlus,
  plusDisabled,
}: {
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
  plusDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onMinus}
        aria-label="Kurangi"
        className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-bold text-slate-900">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onPlus}
        disabled={plusDisabled}
        aria-label="Tambah"
        className="w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------- Kartu rekening ----------

function BankAccountCard({
  acc,
  copied,
  onCopy,
}: {
  acc: BankAccount;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-900">{acc.bank_name}</p>
        <p className="text-sm font-mono text-slate-800 tracking-wide">
          {acc.account_number}
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          a.n. {acc.account_holder}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        {copied ? "Disalin" : "Salin"}
      </button>
    </div>
  );
}

// ---------- Komponen utama ----------

export default function ShopMenuModal({
  isOpen,
  onClose,
  shopId,
  shopName,
  canOrder = true,
  acceptsDelivery = true,
  acceptsPickup = true,
}: ShopMenuModalProps) {
  const [view, setView] = useState<View>("menu");

  // Produk
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Keranjang
  const [cart, setCart] = useState<CartLine[]>([]);
  const [variantProduct, setVariantProduct] = useState<ProductItem | null>(null);

  // Pemesan (otomatis dari profil)
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [profile, setProfile] = useState<OrdererProfile | null>(null);

  // Form checkout
  const [serviceType, setServiceType] = useState<ServiceType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Rekening toko
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Hasil pesanan
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderType, setOrderType] = useState<ServiceType>("delivery");
  const [orderPayment, setOrderPayment] = useState<PaymentMethod>("cash");

  // Reset semua state pesanan saat berganti toko
  useEffect(() => {
    setCart([]);
    setView("menu");
    setSearch("");
    setVariantProduct(null);
    setSubmitError(null);
    setOrderNumber(null);
    setNotes("");
    setServiceType("delivery");
    setPaymentMethod("cash");
    setBankAccounts([]);
  }, [shopId]);

  // Pilih layanan yang tersedia jika pilihan saat ini tidak diterima toko
  useEffect(() => {
    if (serviceType === "delivery" && !acceptsDelivery && acceptsPickup) {
      setServiceType("pickup");
    } else if (serviceType === "pickup" && !acceptsPickup && acceptsDelivery) {
      setServiceType("delivery");
    }
  }, [acceptsDelivery, acceptsPickup, serviceType]);

  // Ambil produk + varian tiap kali modal dibuka
  useEffect(() => {
    if (!isOpen || !shopId) return;

    let cancelled = false;

    const fetchProducts = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setProducts([]);

      const { data, error } = await supabase
        .from("products")
        .select(
          `id, name, category, price, image_url, is_available, stock, track_stock, unit,
           product_variant_groups (
             id, name, is_required, allow_multiple,
             product_variant_options ( id, name, price_adjustment, is_available )
           )`
        )
        .eq("shop_id", shopId)
        .eq("is_available", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Gagal mengambil menu:", error.message);
        setErrorMessage("Gagal memuat menu. Silakan coba lagi.");
      } else {
        const normalized: ProductItem[] = (data ?? []).map((p: any) => ({
          ...p,
          price: Number(p.price),
          product_variant_groups: (p.product_variant_groups ?? [])
            .map((g: any) => ({
              ...g,
              product_variant_options: (g.product_variant_options ?? [])
                .filter((o: any) => o.is_available)
                .map((o: any) => ({
                  ...o,
                  price_adjustment: Number(o.price_adjustment),
                })),
            }))
            // Grup tanpa opsi tersedia tidak ditampilkan
            .filter((g: VariantGroup) => g.product_variant_options.length > 0),
        }));
        setProducts(normalized);
      }
      setIsLoading(false);
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [isOpen, shopId]);

  // Ambil rekening aktif toko (untuk pilihan transfer)
  useEffect(() => {
    if (!isOpen || !shopId) return;
    let cancelled = false;

    const fetchBankAccounts = async () => {
      const { data, error } = await supabase
        .from("shop_bank_accounts")
        .select("id, bank_name, account_number, account_holder, is_primary")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Gagal mengambil rekening:", error.message);
        setBankAccounts([]);
        return;
      }
      setBankAccounts(data ?? []);
    };

    fetchBankAccounts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, shopId]);

  // Kembalikan ke tunai jika toko tidak punya rekening aktif
  useEffect(() => {
    if (bankAccounts.length === 0 && paymentMethod === "transfer") {
      setPaymentMethod("cash");
    }
  }, [bankAccounts.length, paymentMethod]);

  // Ambil data pemesan dari profil: saat modal dibuka dan setiap berpindah tampilan
  // (supaya data terbaru terbaca setelah pengguna melengkapi profil)
  useEffect(() => {
    if (!isOpen || view === "success") return;
    let cancelled = false;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setAuthState("guest");
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `full_name, whatsapp_number, address_full, city, postal_code, address_note,
           latitude, longitude, google_maps_url`
        )
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) console.error("Gagal mengambil profil:", error.message);

      setProfile(
        data ?? {
          full_name: user.user_metadata?.full_name ?? null,
          whatsapp_number: null,
          address_full: null,
          city: null,
          postal_code: null,
          address_note: null,
          latitude: null,
          longitude: null,
          google_maps_url: null,
        }
      );
      setAuthState("user");
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isOpen, view]);

  // Escape + kunci scroll halaman di belakang modal
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (variantProduct) setVariantProduct(null);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, variantProduct]);

  // ---------- Keranjang ----------

  const qtyOfProduct = (productId: string) =>
    cart
      .filter((l) => l.productId === productId)
      .reduce((sum, l) => sum + l.quantity, 0);

  const canAddMore = (product: ProductItem) =>
    !product.track_stock || qtyOfProduct(product.id) < product.stock;

  const addToCart = (product: ProductItem, options: VariantOption[]) => {
    if (!canAddMore(product)) return;

    const sorted = [...options].sort((a, b) => a.id.localeCompare(b.id));
    const optionIds = sorted.map((o) => o.id);
    const key = `${product.id}:${optionIds.join(",")}`;
    const unitPrice =
      product.price + sorted.reduce((s, o) => s + o.price_adjustment, 0);
    const name = sorted.length
      ? `${product.name} (${sorted.map((o) => o.name).join(", ")})`
      : product.name;

    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        { key, productId: product.id, name, unitPrice, quantity: 1, optionIds },
      ];
    });
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        const quantity = l.quantity + delta;
        return quantity <= 0 ? [] : [{ ...l, quantity }];
      })
    );
  };

  const handleAddClick = (product: ProductItem) => {
    if (product.product_variant_groups.length > 0) {
      setVariantProduct(product);
    } else {
      addToCart(product, []);
    }
  };

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  // ---------- Pencarian & pengelompokan ----------

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)
      )
      : products;

    const groups: Record<string, ProductItem[]> = {};
    list.forEach((p) => {
      const key = p.category?.trim() || "Lainnya";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return { entries: Object.entries(groups), count: list.length };
  }, [products, search]);

  // ---------- Kelengkapan data pemesan ----------

  const waDigits = (profile?.whatsapp_number ?? "").replace(/\D/g, "");

  const missingFields = useMemo(() => {
    if (authState !== "user" || !profile) return [];
    const missing: string[] = [];
    if (!profile.full_name?.trim()) missing.push("Nama lengkap");
    if (waDigits.length < 9) missing.push("Nomor WhatsApp");
    if (serviceType === "delivery" && !profile.address_full?.trim()) {
      missing.push("Alamat lengkap");
    }
    return missing;
  }, [authState, profile, waDigits.length, serviceType]);

  const fullAddress = profile
    ? [profile.address_full, profile.city, profile.postal_code]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(", ")
    : "";

  const mapsLink =
    profile?.google_maps_url?.trim() ||
    (profile?.latitude != null && profile?.longitude != null
      ? `https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`
      : null);

  const serviceAccepted =
    serviceType === "delivery" ? acceptsDelivery : acceptsPickup;
  const noServiceAvailable = !acceptsDelivery && !acceptsPickup;

  const canSubmit =
    cart.length > 0 &&
    authState === "user" &&
    missingFields.length === 0 &&
    serviceAccepted &&
    !isSubmitting;

  // ---------- Salin nomor rekening ----------

  const handleCopy = async (acc: BankAccount) => {
    try {
      await navigator.clipboard.writeText(acc.account_number);
      setCopiedId(acc.id);
      setTimeout(() => setCopiedId((c) => (c === acc.id ? null : c)), 2000);
    } catch (err) {
      console.error("Gagal menyalin nomor rekening:", err);
    }
  };

  // ---------- Kirim pesanan (insert langsung, tanpa RPC) ----------

  const handleSubmit = async () => {
    if (!shopId || !profile || !canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Silakan masuk terlebih dahulu untuk memesan.");

      // Alamat & catatan antar hanya untuk pesanan antar
      const isDelivery = serviceType === "delivery";
      const noteParts = [
        profile.address_note?.trim()
          ? `Patokan: ${profile.address_note.trim()}`
          : null,
        mapsLink ? `Lokasi: ${mapsLink}` : null,
      ].filter(Boolean);

      // 1) Buat pesanan (nomor pesanan diisi otomatis oleh trigger di database)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          shop_id: shopId,
          source: "web",
          service_type: serviceType,
          customer_id: user.id,
          customer_name: profile.full_name?.trim(),
          customer_phone: profile.whatsapp_number?.trim(),
          delivery_address: isDelivery ? fullAddress : null,
          delivery_note: isDelivery && noteParts.length ? noteParts.join("\n") : null,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          subtotal: cartTotal,
          total_amount: cartTotal,
          created_by: user.id,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // 2) Simpan item pesanan
      const { error: itemsError } = await supabase.from("order_items").insert(
        cart.map((l) => ({
          order_ref_id: order.id,
          product_id: l.productId,
          product_name: l.name,
          price: l.unitPrice,
          quantity: l.quantity,
          subtotal: l.unitPrice * l.quantity,
        }))
      );

      if (itemsError) {
        // Batalkan pesanan agar tidak menggantung tanpa item
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }

      setOrderNumber(order.order_number as number);
      setOrderTotal(cartTotal);
      setOrderType(serviceType);
      setOrderPayment(paymentMethod);
      setCart([]);
      setNotes("");
      setView("success");
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message;
      console.error("Gagal membuat pesanan:", message);
      setSubmitError(message || "Gagal mengirim pesanan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const plainInputClass =
    "w-full bg-slate-100 text-slate-800 text-sm px-3 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Menu ${shopName}`}
    >
      <div
        className="relative bg-white w-full sm:max-w-lg h-[88vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {view === "checkout" ? (
              <button
                onClick={() => setView("menu")}
                aria-label="Kembali ke menu"
                className="p-1.5 -ml-1.5 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                {view === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <UtensilsCrossed className="w-4 h-4" />
                )}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 truncate">
                {view === "menu" && `Menu ${shopName}`}
                {view === "checkout" && "Pesanan Anda"}
                {view === "success" && "Pesanan Terkirim"}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {view === "menu" &&
                  (isLoading ? "Memuat..." : `${products.length} produk tersedia`)}
                {view !== "menu" && shopName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= VIEW: MENU ================= */}
        {view === "menu" && (
          <>
            {/* Pencarian */}
            <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari menu atau kategori..."
                  className="w-full bg-slate-100 text-slate-800 text-xs pl-8 pr-8 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-slate-300 transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Hapus pencarian"
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!canOrder && (
                <p className="text-[11px] font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
                  Toko sedang tutup, pemesanan belum tersedia. Menu masih bisa dilihat.
                </p>
              )}
              {canOrder && noServiceAvailable && (
                <p className="text-[11px] font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                  Toko ini belum menerima pesanan online. Menu masih bisa dilihat.
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-5">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  <p className="text-xs font-medium">Memuat menu...</p>
                </div>
              ) : errorMessage ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-rose-600 font-medium">
                    {errorMessage}
                  </p>
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-sm text-slate-700">
                    Belum ada menu
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Toko ini belum menambahkan produk.
                  </p>
                </div>
              ) : filteredGroups.count === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-sm text-slate-700">
                    Menu tidak ditemukan
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Coba kata kunci lain.
                  </p>
                </div>
              ) : (
                filteredGroups.entries.map(([category, items]) => (
                  <section key={category} className="space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {category}
                    </h4>

                    <ul className="space-y-2.5">
                      {items.map((product) => {
                        const isSoldOut =
                          product.track_stock && product.stock <= 0;
                        const hasVariants =
                          product.product_variant_groups.length > 0;
                        const qty = qtyOfProduct(product.id);
                        const addDisabled = !canAddMore(product);

                        return (
                          <li
                            key={product.id}
                            className={`flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200/80 ${isSoldOut ? "opacity-60" : ""
                              }`}
                          >
                            <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageOff className="w-5 h-5 text-slate-300" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-slate-900 truncate">
                                {product.name}
                              </p>
                              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatRupiah(product.price)}
                              </p>

                              {/* Info stok */}
                              {product.track_stock ? (
                                isSoldOut ? (
                                  <span className="inline-block mt-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                    Habis
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${product.stock <= 5
                                        ? "text-amber-700 bg-amber-50"
                                        : "text-emerald-700 bg-emerald-50"
                                      }`}
                                  >
                                    {product.stock <= 5
                                      ? `Sisa ${product.stock} ${product.unit || "pcs"}`
                                      : `Stok: ${product.stock} ${product.unit || "pcs"}`}
                                  </span>
                                )
                              ) : (
                                <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  Selalu tersedia
                                </span>
                              )}

                              {hasVariants && !isSoldOut && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Ada pilihan varian
                                </p>
                              )}
                            </div>

                            {/* Kontrol pesan */}
                            {canOrder && !noServiceAvailable && !isSoldOut && (
                              <>
                                {!hasVariants && qty > 0 ? (
                                  <QtyStepper
                                    quantity={qty}
                                    onMinus={() =>
                                      changeQty(simpleKey(product.id), -1)
                                    }
                                    onPlus={() => addToCart(product, [])}
                                    plusDisabled={addDisabled}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddClick(product)}
                                    disabled={addDisabled}
                                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors"
                                  >
                                    {hasVariants && qty > 0
                                      ? `Tambah (${qty})`
                                      : "Tambah"}
                                  </button>
                                )}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>

            {/* Bar keranjang */}
            {canOrder && !noServiceAvailable && cartCount > 0 && (
              <div className="p-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setView("checkout")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-between px-4 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    {cartCount} item
                  </span>
                  <span>Lihat Pesanan • {formatRupiah(cartTotal)}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ================= VIEW: CHECKOUT ================= */}
        {view === "checkout" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Belum login */}
              {authState === "guest" && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <p className="text-xs font-semibold text-amber-800">
                    Masuk dulu untuk memesan. Data pemesan dan alamat akan terisi otomatis dari profil Anda.
                  </p>
                  <Link
                    href="/auth/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Masuk ke Akun
                  </Link>
                </div>
              )}

              {/* Metode pemesanan */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  Metode Pemesanan
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "delivery",
                        label: "Pesan Antar",
                        Icon: Bike,
                        enabled: acceptsDelivery,
                      },
                      {
                        value: "pickup",
                        label: "Ambil Sendiri",
                        Icon: Store,
                        enabled: acceptsPickup,
                      },
                    ] as const
                  ).map(({ value, label, Icon, enabled }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setServiceType(value)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${serviceType === value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                {(!acceptsDelivery || !acceptsPickup) && (
                  <p className="text-[11px] text-slate-400">
                    {!acceptsDelivery && "Toko ini belum menerima pesanan antar."}
                    {!acceptsPickup && "Toko ini belum menerima pesanan ambil sendiri."}
                  </p>
                )}
              </div>

              {/* Metode pembayaran (hanya jika toko punya rekening aktif) */}
              {bankAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-800">
                    Metode Pembayaran
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          value: "cash",
                          label:
                            serviceType === "delivery"
                              ? "Bayar di Tempat"
                              : "Bayar di Toko",
                          Icon: Banknote,
                        },
                        {
                          value: "transfer",
                          label: "Transfer Bank",
                          Icon: Landmark,
                        },
                      ] as const
                    ).map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-colors ${paymentMethod === value
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === "transfer" && (
                    <p className="text-[11px] text-slate-500">
                      Nomor rekening toko akan ditampilkan setelah pesanan dikirim.
                    </p>
                  )}
                </div>
              )}

              {/* Ringkasan pesanan */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">Ringkasan</p>
                <ul className="space-y-2">
                  {cart.map((line) => {
                    const product = products.find((p) => p.id === line.productId);
                    const plusDisabled = product ? !canAddMore(product) : true;
                    return (
                      <li
                        key={line.key}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200/80"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {line.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatRupiah(line.unitPrice)}
                          </p>
                        </div>
                        <QtyStepper
                          quantity={line.quantity}
                          onMinus={() => changeQty(line.key, -1)}
                          onPlus={() => changeQty(line.key, 1)}
                          plusDisabled={plusDisabled}
                        />
                      </li>
                    );
                  })}
                </ul>
                {cart.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Pesanan kosong.{" "}
                    <button
                      onClick={() => setView("menu")}
                      className="text-emerald-600 font-semibold"
                    >
                      Kembali ke menu
                    </button>
                  </p>
                )}
              </div>

              {/* Data pemesan (otomatis dari profil, hanya baca) */}
              {authState === "loading" && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Memuat data pemesan...
                </div>
              )}

              {authState === "user" && profile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">
                      Data Pemesan
                    </p>
                    <Link
                      href="/profile"
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      Ubah di profil
                    </Link>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {profile.full_name?.trim() || (
                          <span className="text-rose-600">Nama belum diisi</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <MessageCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-700 truncate">
                        {profile.whatsapp_number?.trim() || (
                          <span className="text-rose-600">
                            Nomor WhatsApp belum diisi
                          </span>
                        )}
                      </p>
                    </div>

                    {serviceType === "delivery" && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 text-xs text-slate-700 space-y-1">
                          {fullAddress ? (
                            <>
                              <p className="leading-relaxed">{fullAddress}</p>
                              {profile.address_note?.trim() && (
                                <p className="text-[11px] text-slate-500">
                                  Patokan: {profile.address_note}
                                </p>
                              )}
                              {mapsLink && (
                                <a
                                  href={mapsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                                >
                                  Lihat titik lokasi
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="text-rose-600">
                              Alamat belum diisi
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {missingFields.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                      <p className="text-[11px] font-medium text-rose-700">
                        Lengkapi dulu di profil: {missingFields.join(", ")}.
                      </p>
                      <Link
                        href="/profile"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        Lengkapi Profil
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Catatan pesanan */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">Catatan</p>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan pesanan (opsional)"
                  maxLength={200}
                  className={plainInputClass}
                />
              </div>

              {/* Total */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatRupiah(cartTotal)}</span>
                </div>
                {serviceType === "delivery" && (
                  <p className="text-[11px] text-slate-400">
                    Ongkos kirim belum termasuk dan akan dikonfirmasi oleh toko.
                  </p>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-1">
                  <span>Total</span>
                  <span>{formatRupiah(cartTotal)}</span>
                </div>
              </div>

              {submitError && (
                <p className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
                  {submitError}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim pesanan...
                  </>
                ) : (
                  `Kirim Pesanan • ${formatRupiah(cartTotal)}`
                )}
              </button>
            </div>
          </>
        )}

        {/* ================= VIEW: SUCCESS ================= */}
        {view === "success" && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <p className="font-bold text-base text-slate-900">
                Pesanan berhasil dikirim!
              </p>
              <p className="text-xs text-slate-500 mt-1">Nomor pesanan Anda</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                #{orderNumber}
              </p>
            </div>
            <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
              {orderType === "delivery"
                ? "Pesanan akan diantar ke alamat Anda. Toko akan menghubungi Anda untuk konfirmasi."
                : `Silakan ambil pesanan Anda di ${shopName} setelah pesanan siap.`}
            </p>

            {orderPayment === "transfer" && bankAccounts.length > 0 && (
              <div className="w-full max-w-xs text-left space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  Transfer ke salah satu rekening berikut:
                </p>
                {bankAccounts.map((acc) => (
                  <BankAccountCard
                    key={acc.id}
                    acc={acc}
                    copied={copiedId === acc.id}
                    onCopy={() => handleCopy(acc)}
                  />
                ))}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cantumkan nomor pesanan #{orderNumber} saat transfer.
                  {orderType === "delivery" &&
                    " Nominal akhir termasuk ongkir akan dikonfirmasi oleh toko."}
                </p>
              </div>
            )}

            <p className="text-sm font-bold text-slate-900">
              Total {formatRupiah(orderTotal)}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              Selesai
            </button>
          </div>
        )}

        {/* Sheet varian */}
        {variantProduct && (
          <VariantSheet
            product={variantProduct}
            onClose={() => setVariantProduct(null)}
            onConfirm={(options) => {
              addToCart(variantProduct, options);
              setVariantProduct(null);
            }}
          />
        )}
      </div>
    </div>
  );
}