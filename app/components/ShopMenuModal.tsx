"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, UtensilsCrossed, ArrowLeft, CheckCircle2 } from "lucide-react";
import VariantSheet from "./ShopMenuModal/VariantSheet";
import MenuView from "./ShopMenuModal/MenuView";
import CheckoutView from "./ShopMenuModal/CheckoutView";
import SuccessView from "./ShopMenuModal/SuccessView";
import {
  ALL_CATEGORY,
  categoryOf,
  getDiscountedPrice,
  type AuthState,
  type CartLine,
  type OrdererProfile,
  type ProductItem,
  type ServiceType,
  type VariantGroup,
  type VariantOption,
  type View,
} from "./ShopMenuModal/shared";

interface ShopMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string | null;
  shopName: string;
  canOrder?: boolean; // false saat toko sedang tutup
  acceptsDelivery?: boolean; // dari shops.accepts_delivery
  acceptsPickup?: boolean; // dari shops.accepts_pickup
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
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

  // Keranjang
  const [cart, setCart] = useState<CartLine[]>([]);
  const [variantProduct, setVariantProduct] = useState<ProductItem | null>(null);

  // Pemesan (otomatis dari profil)
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [profile, setProfile] = useState<OrdererProfile | null>(null);

  // Form checkout (pembayaran selalu tunai)
  const [serviceType, setServiceType] = useState<ServiceType>("delivery");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hasil pesanan
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderType, setOrderType] = useState<ServiceType>("delivery");

  // Reset semua state pesanan saat berganti toko
  useEffect(() => {
    setCart([]);
    setView("menu");
    setSearch("");
    setSelectedCategory(ALL_CATEGORY);
    setVariantProduct(null);
    setSubmitError(null);
    setOrderNumber(null);
    setNotes("");
    setServiceType("delivery");
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
           discount_type, discount_value, discount_ends_at,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized: ProductItem[] = (data ?? []).map((p: any) => ({
          ...p,
          price: Number(p.price),
          discount_value: p.discount_value != null ? Number(p.discount_value) : null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          product_variant_groups: (p.product_variant_groups ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((g: any) => ({
              ...g,
              product_variant_options: (g.product_variant_options ?? [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((o: any) => o.is_available)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    cart.filter((l) => l.productId === productId).reduce((sum, l) => sum + l.quantity, 0);

  const canAddMore = (product: ProductItem) =>
    !product.track_stock || qtyOfProduct(product.id) < product.stock;

  const addToCart = (product: ProductItem, options: VariantOption[]) => {
    if (!canAddMore(product)) return;

    const sorted = [...options].sort((a, b) => a.id.localeCompare(b.id));
    const optionIds = sorted.map((o) => o.id);
    const key = `${product.id}:${optionIds.join(",")}`;

    // Diskon hanya untuk harga produk; tambahan harga varian tidak didiskon
    const adjustments = sorted.reduce((s, o) => s + o.price_adjustment, 0);
    const unitPrice = getDiscountedPrice(product) + adjustments;
    const originalUnitPrice = product.price + adjustments;

    const name = sorted.length
      ? `${product.name} (${sorted.map((o) => o.name).join(", ")})`
      : product.name;

    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        { key, productId: product.id, name, unitPrice, originalUnitPrice, quantity: 1, optionIds },
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
  const cartOriginalTotal = cart.reduce((s, l) => s + l.originalUnitPrice * l.quantity, 0);
  const cartDiscount = cartOriginalTotal - cartTotal;

  // ---------- Kategori, pencarian & pengelompokan ----------

  // Daftar kategori mengikuti urutan produk dari database
  const categories = useMemo(
    () => Array.from(new Set(products.map(categoryOf))),
    [products]
  );

  // Jika kategori terpilih sudah tidak ada (mis. produk dimuat ulang), kembali ke "Semua"
  const activeCategory =
    selectedCategory !== ALL_CATEGORY && categories.includes(selectedCategory)
      ? selectedCategory
      : ALL_CATEGORY;

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchCategory = activeCategory === ALL_CATEGORY || categoryOf(p) === activeCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });

    const groups: Record<string, ProductItem[]> = {};
    list.forEach((p) => {
      const key = categoryOf(p);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return { entries: Object.entries(groups), count: list.length };
  }, [products, search, activeCategory]);

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

  const serviceAccepted = serviceType === "delivery" ? acceptsDelivery : acceptsPickup;
  const noServiceAvailable = !acceptsDelivery && !acceptsPickup;

  const canSubmit =
    cart.length > 0 &&
    authState === "user" &&
    missingFields.length === 0 &&
    serviceAccepted &&
    !isSubmitting;

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
        profile.address_note?.trim() ? `Patokan: ${profile.address_note.trim()}` : null,
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
          payment_method: "cash", // semua pesanan dibayar tunai
          notes: notes.trim() || null,
          subtotal: cartOriginalTotal, // sebelum diskon
          discount: cartDiscount,
          total_amount: cartTotal,
          created_by: user.id,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // 2) Simpan item pesanan (harga satuan sudah termasuk diskon)
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
      setOrderDiscount(cartDiscount);
      setOrderType(serviceType);
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

  return (
    <div
      className="neco-modal-overlay fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Menu ${shopName}`}
    >
      {/* Animasi masuk: ringan, hanya berjalan saat modal muncul */}
      <style>{`
        @keyframes neco-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes neco-sheet-up {
          from { opacity: 0.6; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes neco-pop-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .neco-modal-overlay { animation: neco-fade-in 0.18s ease-out; }
        .neco-modal-panel { animation: neco-sheet-up 0.26s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @media (min-width: 640px) {
          .neco-modal-panel { animation: neco-pop-in 0.22s ease-out; }
        }
        @media (prefers-reduced-motion: reduce) {
          .neco-modal-overlay, .neco-modal-panel { animation: none; }
        }
      `}</style>

      <div
        className="neco-modal-panel relative bg-white w-full sm:max-w-lg h-[88vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
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

        {view === "menu" && (
          <MenuView
            isLoading={isLoading}
            errorMessage={errorMessage}
            products={products}
            groups={filteredGroups}
            search={search}
            onSearchChange={setSearch}
            categories={categories}
            selectedCategory={activeCategory}
            onSelectCategory={setSelectedCategory}
            canOrder={canOrder}
            noServiceAvailable={noServiceAvailable}
            cartCount={cartCount}
            cartTotal={cartTotal}
            qtyOfProduct={qtyOfProduct}
            canAddMore={canAddMore}
            onAddSimple={(product) => addToCart(product, [])}
            onAddClick={handleAddClick}
            onChangeQty={changeQty}
            onOpenCheckout={() => setView("checkout")}
          />
        )}

        {view === "checkout" && (
          <CheckoutView
            authState={authState}
            profile={profile}
            missingFields={missingFields}
            fullAddress={fullAddress}
            mapsLink={mapsLink}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            acceptsDelivery={acceptsDelivery}
            acceptsPickup={acceptsPickup}
            cart={cart}
            products={products}
            canAddMore={canAddMore}
            onChangeQty={changeQty}
            onBackToMenu={() => setView("menu")}
            notes={notes}
            onNotesChange={setNotes}
            cartTotal={cartTotal}
            cartOriginalTotal={cartOriginalTotal}
            cartDiscount={cartDiscount}
            submitError={submitError}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onClose={onClose}
          />
        )}

        {view === "success" && (
          <SuccessView
            orderNumber={orderNumber}
            orderType={orderType}
            orderTotal={orderTotal}
            orderDiscount={orderDiscount}
            shopName={shopName}
            onClose={onClose}
          />
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