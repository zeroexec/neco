"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Plus, Trash2, Layers, Loader2, Upload, Package } from "lucide-react";

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  category?: string | null;
  image_url?: string | null;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
  sku?: string | null;
  cost_price?: number | null;
  unit?: string | null;
  min_stock?: number | null;
  track_stock?: boolean;
}

interface VariantOption {
  id?: string;
  name: string;
  price_adjustment: number | string;
  is_available: boolean;
}

interface VariantGroup {
  id?: string;
  name: string;
  is_required: boolean;
  allow_multiple: boolean;
  options: VariantOption[];
}

interface ProductFormModalProps {
  isOpen: boolean;
  storeId: string;
  editingProduct: Product | null;
  categories?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

// ===== Storage gambar: bucket "shops", folder khusus produk =====
// Struktur: shops/{storeId}/products/...
// (logo & foto toko memakai folder lain: {storeId}/logo/ dan {storeId}/cover/)
const BUCKET = "shops";
const PRODUCT_IMAGE_FOLDER = "products";

// Ambil path file di bucket dari URL publik. Mengembalikan null bila bukan dari bucket "shops".
const getStoragePath = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const raw = url.slice(idx + marker.length).split("?")[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

// Hapus gambar dari storage berdasarkan URL publiknya (gagal tidak menghentikan alur utama)
const removeImage = async (url: string | null | undefined) => {
  const path = getStoragePath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn("Gagal menghapus gambar lama:", error.message);
};

/**
 * Helper function untuk kompresi gambar berbasis Canvas browser
 * Menjaga kualitas visual (80%) dan meresize jika melebihi maxWidth/maxHeight.
 */
const compressImage = (file: File, maxWidth = 1080, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Jika file bukan gambar, kembalikan file asli
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skala ulang dimensi jika melebihi maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Kompres menjadi format JPEG dengan kualitas tajam
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};

const EMPTY_FORM = {
  sku: "",
  name: "",
  category: "",
  price: "",
  track_stock: true,
  stock: "",
  min_stock: "",
  unit: "pcs",
};

export default function ProductFormModal({
  isOpen,
  storeId,
  editingProduct,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [productForm, setProductForm] = useState(EMPTY_FORM);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);

  // Cleanup Object URL untuk mencegah memory leak
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingProduct) {
      setProductForm({
        sku: editingProduct.sku || "",
        name: editingProduct.name,
        category: editingProduct.category || "",
        price: editingProduct.price.toString(),
        track_stock: editingProduct.track_stock ?? true,
        stock: editingProduct.stock?.toString() ?? "",
        min_stock: editingProduct.min_stock?.toString() ?? "",
        unit: editingProduct.unit || "pcs",
      });

      setImagePreview(editingProduct.image_url || null);
      setImageFile(null);

      const fetchVariants = async () => {
        try {
          const { data: groups, error: groupErr } = await supabase
            .from("product_variant_groups")
            .select("*")
            .eq("product_id", editingProduct.id);

          if (groupErr) throw groupErr;

          if (groups && groups.length > 0) {
            const groupIds = groups.map((g) => g.id);
            const { data: options, error: optErr } = await supabase
              .from("product_variant_options")
              .select("*")
              .in("group_id", groupIds);

            if (optErr) throw optErr;

            const formattedGroups: VariantGroup[] = groups.map((g) => ({
              id: g.id,
              name: g.name,
              is_required: g.is_required,
              allow_multiple: g.allow_multiple,
              options: (options || [])
                .filter((o) => o.group_id === g.id)
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  price_adjustment: o.price_adjustment,
                  is_available: o.is_available,
                })),
            }));

            setVariantGroups(formattedGroups);
          } else {
            setVariantGroups([]);
          }
        } catch (err) {
          console.error("Error fetching variants:", err);
        }
      };

      fetchVariants();
    } else {
      setProductForm(EMPTY_FORM);
      setImagePreview(null);
      setImageFile(null);
      setVariantGroups([]);
    }
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);

      // Auto kompresi gambar sebelum disimpan di state
      const compressed = await compressImage(file, 1080, 0.82);

      // Validasi ulang ukuran jika setelah dikompresi masih > 2MB
      if (compressed.size > 2 * 1024 * 1024) {
        alert("Ukuran gambar masih terlalu besar (di atas 2MB). Silakan pilih gambar lain.");
        return;
      }

      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch (error) {
      console.error("Gagal mengompres gambar:", error);
      alert("Gagal memproses gambar. Silakan coba lagi.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
  };

  // Unggah ke bucket "shops" di folder {storeId}/products/
  const uploadImage = async (file: File): Promise<string | null> => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `${storeId}/${PRODUCT_IMAGE_FOLDER}/${unique}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addVariantGroup = () => {
    setVariantGroups([
      ...variantGroups,
      {
        name: "",
        is_required: false,
        allow_multiple: false,
        options: [{ name: "", price_adjustment: 0, is_available: true }],
      },
    ]);
  };

  const removeVariantGroup = (index: number) => {
    setVariantGroups(variantGroups.filter((_, i) => i !== index));
  };

  const addVariantOption = (groupIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].options.push({
      name: "",
      price_adjustment: 0,
      is_available: true,
    });
    setVariantGroups(updated);
  };

  const removeVariantOption = (groupIndex: number, optionIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].options = updated[groupIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setVariantGroups(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;

    // Validasi stok jika dihitung
    if (productForm.track_stock) {
      const stockNum = Number(productForm.stock);
      const minStockNum = Number(productForm.min_stock || 0);
      if (productForm.stock !== "" && (isNaN(stockNum) || stockNum < 0)) {
        alert("Stok tidak boleh negatif.");
        return;
      }
      if (isNaN(minStockNum) || minStockNum < 0) {
        alert("Stok minimum tidak boleh negatif.");
        return;
      }
    }

    // Untuk rollback: file baru yang sudah terunggah & penanda produk sudah tersimpan
    let newUploadedUrl: string | null = null;
    let productSaved = false;

    try {
      setIsSubmitting(true);

      let imageUrl: string | null = imagePreview;

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (!uploadedUrl) {
          // Batalkan penyimpanan agar URL blob sementara tidak ikut masuk database
          throw new Error("Gagal mengunggah gambar produk.");
        }
        newUploadedUrl = uploadedUrl;
        imageUrl = uploadedUrl;
      }

      const stockValue = productForm.track_stock
        ? Math.floor(Number(productForm.stock) || 0)
        : 0;
      const minStockValue = productForm.track_stock
        ? Math.floor(Number(productForm.min_stock) || 0)
        : 0;

      const payload = {
        shop_id: storeId,
        sku: productForm.sku || null,
        name: productForm.name,
        category: productForm.category || null,
        price: Number(productForm.price),
        image_url: imageUrl,
        track_stock: productForm.track_stock,
        stock: stockValue,
        min_stock: minStockValue,
        unit: productForm.unit.trim() || "pcs",
        // Selalu tersedia -> true. Jika stok dihitung -> tersedia selama stok > 0
        is_available: productForm.track_stock ? stockValue > 0 : true,
        updated_at: new Date().toISOString(),
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      productSaved = true;

      // Produk sudah tersimpan -> hapus gambar lama yang tidak dipakai lagi dari storage
      const oldImageUrl = editingProduct?.image_url;
      if (oldImageUrl && oldImageUrl !== imageUrl) {
        await removeImage(oldImageUrl);
      }

      if (productId) {
        if (editingProduct) {
          const { data: oldGroups } = await supabase
            .from("product_variant_groups")
            .select("id")
            .eq("product_id", productId);

          if (oldGroups && oldGroups.length > 0) {
            const groupIds = oldGroups.map((g) => g.id);
            await supabase
              .from("product_variant_options")
              .delete()
              .in("group_id", groupIds);

            await supabase
              .from("product_variant_groups")
              .delete()
              .eq("product_id", productId);
          }
        }

        for (const group of variantGroups) {
          if (!group.name.trim()) continue;

          const { data: groupData, error: groupErr } = await supabase
            .from("product_variant_groups")
            .insert([
              {
                product_id: productId,
                name: group.name,
                is_required: group.is_required,
                allow_multiple: group.allow_multiple,
              },
            ])
            .select()
            .single();

          if (groupErr) throw groupErr;

          const optionsPayload = group.options
            .filter((opt) => opt.name.trim())
            .map((opt) => ({
              group_id: groupData.id,
              name: opt.name,
              price_adjustment: Number(opt.price_adjustment) || 0,
              is_available: opt.is_available,
            }));

          if (optionsPayload.length > 0) {
            const { error: optErr } = await supabase
              .from("product_variant_options")
              .insert(optionsPayload);

            if (optErr) throw optErr;
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving product:", err);

      // Produk gagal tersimpan -> buang file baru yang sudah terlanjur diunggah
      if (newUploadedUrl && !productSaved) {
        await removeImage(newUploadedUrl);
      }

      alert("Gagal menyimpan data produk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden border border-zinc-100">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-white shrink-0">
          <div>
            <h2 className="font-semibold text-zinc-900 text-lg leading-tight">
              {editingProduct ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {editingProduct ? "Perbarui informasi produk" : "Isi detail produk baru Anda"}
            </p>
          </div>

          {/* Tombol X dengan lingkaran interaktif */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-all duration-150 cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          
          {/* Section: Gambar Produk */}
          <div className="flex items-center gap-5 p-4 bg-zinc-50/80 rounded-xl border border-zinc-100">
            {imagePreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 shrink-0 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 hover:border-emerald-600 flex flex-col items-center justify-center cursor-pointer text-zinc-400 hover:text-emerald-600 transition-all bg-white shrink-0 relative">
                {isCompressing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isCompressing}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
            <div>
              <span className="font-medium text-zinc-800 text-sm block mb-1">Foto Produk</span>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Format PNG, JPG, WEBP. Otomatis dikompresi agar muat di bawah 2MB tanpa mengurangi ketajaman.
              </p>
            </div>
          </div>

          {/* Section Input */}
          <div className="space-y-4">
            {/* SKU Kode Produk */}
            <div>
              <label className="block font-medium text-zinc-800 mb-1 text-sm">
                SKU Kode Produk
              </label>
              <input
                type="text"
                placeholder="Contoh: PRD-001"
                value={productForm.sku}
                onChange={(e) =>
                  setProductForm({ ...productForm, sku: e.target.value })
                }
                className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Nama Produk */}
            <div>
              <label className="block font-medium text-zinc-800 mb-1 text-sm">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Ice Americano"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block font-medium text-zinc-800 mb-1 text-sm">
                Kategori
              </label>
              <input
                type="text"
                placeholder="Contoh: Kopi, Minuman, Pastry"
                value={productForm.category}
                onChange={(e) =>
                  setProductForm({ ...productForm, category: e.target.value })
                }
                className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Harga Jual */}
            <div>
              <label className="block font-medium text-zinc-800 mb-1 text-sm">
                Harga Jual (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="25000"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
                className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors font-semibold"
              />
            </div>
          </div>

          {/* Section: Stok */}
          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-zinc-900 text-base">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Stok</span>
            </div>

            {/* Switch Selalu Tersedia */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={!productForm.track_stock}
                onClick={() =>
                  setProductForm({
                    ...productForm,
                    track_stock: !productForm.track_stock,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  !productForm.track_stock ? "bg-emerald-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    !productForm.track_stock ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <span className="font-medium text-zinc-800 text-sm block">
                  Selalu tersedia
                </span>
                <span className="text-xs text-zinc-500">
                  Aktifkan jika produk tidak perlu dihitung stoknya (mis. minuman diseduh langsung).
                </span>
              </div>
            </label>

            {productForm.track_stock && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-zinc-800 mb-1 text-sm">
                    Stok
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock: e.target.value })
                    }
                    className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1 text-sm">
                    Stok Minimum
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="5"
                    value={productForm.min_stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, min_stock: e.target.value })
                    }
                    className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1 text-sm">
                    Satuan
                  </label>
                  <input
                    type="text"
                    placeholder="pcs"
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="w-full px-1 py-2 bg-transparent border-b-2 border-zinc-300 rounded-none text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Varian Produk */}
          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-zinc-900 text-base">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Opsi Varian</span>
              </div>
              <button
                type="button"
                onClick={addVariantGroup}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Grup</span>
              </button>
            </div>

            {variantGroups.map((group, gIdx) => (
              <div
                key={gIdx}
                className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3 relative"
              >
                <button
                  type="button"
                  onClick={() => removeVariantGroup(gIdx)}
                  className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-rose-600 p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="pr-8">
                  <label className="block font-medium text-zinc-700 text-xs mb-1">
                    Nama Grup Varian
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Level Sugar"
                    value={group.name}
                    onChange={(e) => {
                      const updated = [...variantGroups];
                      updated[gIdx].name = e.target.value;
                      setVariantGroups(updated);
                    }}
                    className="w-full px-1 py-1.5 bg-transparent border-b-2 border-zinc-300 rounded-none font-medium text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex gap-6 text-xs text-zinc-600 pt-1">
                  {/* Switch Wajib Pilih */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={group.is_required}
                      onClick={() => {
                        const updated = [...variantGroups];
                        updated[gIdx].is_required = !updated[gIdx].is_required;
                        setVariantGroups(updated);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        group.is_required ? "bg-emerald-600" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          group.is_required ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="font-medium text-zinc-700">Wajib Pilih</span>
                  </label>

                  {/* Switch Pilih Banyak */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={group.allow_multiple}
                      onClick={() => {
                        const updated = [...variantGroups];
                        updated[gIdx].allow_multiple = !updated[gIdx].allow_multiple;
                        setVariantGroups(updated);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        group.allow_multiple ? "bg-emerald-600" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          group.allow_multiple ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="font-medium text-zinc-700">Pilih Banyak</span>
                  </label>
                </div>

                {/* List Option Varian */}
                <div className="space-y-2 pt-2 border-t border-zinc-200">
                  <span className="block font-medium text-zinc-700 text-xs">
                    Pilihan Varian
                  </span>
                  {group.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Pilihan (cth: Less Sugar)"
                        value={opt.name}
                        onChange={(e) => {
                          const updated = [...variantGroups];
                          updated[gIdx].options[oIdx].name = e.target.value;
                          setVariantGroups(updated);
                        }}
                        className="flex-1 px-1 py-1 bg-transparent border-b-2 border-zinc-300 rounded-none text-xs placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-1 top-1 text-zinc-400 text-xs">+</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={opt.price_adjustment}
                          onChange={(e) => {
                            const updated = [...variantGroups];
                            updated[gIdx].options[oIdx].price_adjustment =
                              e.target.value;
                            setVariantGroups(updated);
                          }}
                          className="w-full pl-4 pr-1 py-1 bg-transparent border-b-2 border-zinc-300 rounded-none text-xs placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariantOption(gIdx, oIdx)}
                        className="text-zinc-400 hover:text-rose-600 p-1.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addVariantOption(gIdx)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 pt-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pilihan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-zinc-600 hover:bg-zinc-100 font-medium text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs inline-flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}