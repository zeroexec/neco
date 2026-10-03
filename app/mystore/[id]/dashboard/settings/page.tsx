"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Phone, Power, Upload, Loader2, ImagePlus, Link2, Globe } from "lucide-react";
import {
  inputCls,
  inputIconCls,
  labelCls,
  hintCls,
  errorCls,
  uploadShopImage,
} from "./_lib/utils";
import { PageLoader, SaveBar, SectionHeader } from "./_lib/ui";
import { useToast } from "./_lib/toast";

type SocialKey = "instagram" | "tiktok" | "facebook" | "youtube" | "x" | "website";

interface ProfileForm {
  name: string;
  category: string;
  whatsapp_number: string;
  description: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  youtube: string;
  x: string;
  website: string;
  is_open: boolean;
  avatar_url: string;
  cover_url: string;
}

const EMPTY: ProfileForm = {
  name: "",
  category: "",
  whatsapp_number: "",
  description: "",
  instagram: "",
  tiktok: "",
  facebook: "",
  youtube: "",
  x: "",
  website: "",
  is_open: true,
  avatar_url: "",
  cover_url: "",
};

// Daftar media sosial. hosts kosong = domain apa pun diizinkan (untuk website).
const SOCIALS: {
  key: SocialKey;
  label: string;
  placeholder: string;
  hosts: string[];
}[] = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/namatoko",
    hosts: ["instagram.com"],
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@namatoko",
    hosts: ["tiktok.com"],
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/namatoko",
    hosts: ["facebook.com", "fb.com", "fb.me"],
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@namatoko",
    hosts: ["youtube.com", "youtu.be"],
  },
  {
    key: "x",
    label: "X (Twitter)",
    placeholder: "https://x.com/namatoko",
    hosts: ["x.com", "twitter.com"],
  },
  {
    key: "website",
    label: "Website",
    placeholder: "https://namatoko.com",
    hosts: [],
  },
];

// Validasi + normalisasi link. Kosong dianggap valid (opsional).
function parseSocialUrl(
  raw: string,
  hosts: string[]
): { valid: boolean; value: string | null } {
  const input = raw.trim();
  if (!input) return { valid: true, value: null };

  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    const hasDot = host.includes(".");
    const hostOk =
      hosts.length === 0 ||
      hosts.some((h) => host === h || host.endsWith(`.${h}`));

    if (!hasDot || !hostOk) return { valid: false, value: null };
    return { valid: true, value: url.toString() };
  } catch {
    return { valid: false, value: null };
  }
}

export default function ShopProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("shops")
        .select(
          "name, category, whatsapp_number, description, instagram_url, tiktok_url, facebook_url, youtube_url, x_url, website_url, is_open, avatar_url, cover_url"
        )
        .eq("id", storeId)
        .single();

      if (cancelled) return;

      if (error) {
        toast.error(error.message || "Gagal memuat data toko.");
      } else if (data) {
        setForm({
          name: data.name ?? "",
          category: data.category ?? "",
          whatsapp_number: data.whatsapp_number ?? "",
          description: data.description ?? "",
          instagram: data.instagram_url ?? "",
          tiktok: data.tiktok_url ?? "",
          facebook: data.facebook_url ?? "",
          youtube: data.youtube_url ?? "",
          x: data.x_url ?? "",
          website: data.website_url ?? "",
          is_open: data.is_open ?? true,
          avatar_url: data.avatar_url ?? "",
          cover_url: data.cover_url ?? "",
        });
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, storeId, toast]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "cover"
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setUploading(kind);
      const url = await uploadShopImage(supabase, storeId, kind, file);
      set(kind === "logo" ? "avatar_url" : "cover_url", url);
      toast.success(
        `${kind === "logo" ? "Logo" : "Foto toko"} terunggah. Klik "Simpan Perubahan" untuk menerapkan.`
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah gambar.");
    } finally {
      setUploading(null);
    }
  };

  const waDigits = form.whatsapp_number.replace(/\D/g, "");
  const waError =
    form.whatsapp_number.trim() && (waDigits.length < 9 || waDigits.length > 15)
      ? "Nomor WhatsApp harus 9–15 digit."
      : null;

  const socialParsed = useMemo(() => {
    const result = {} as Record<SocialKey, { valid: boolean; value: string | null }>;
    for (const s of SOCIALS) {
      result[s.key] = parseSocialUrl(form[s.key], s.hosts);
    }
    return result;
  }, [form]);

  const hasSocialError = SOCIALS.some((s) => !socialParsed[s.key].valid);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (waError || hasSocialError) {
      toast.error("Periksa kembali isian yang masih salah.");
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("shops")
        .update({
          name: form.name.trim(),
          category: form.category.trim(),
          whatsapp_number: form.whatsapp_number.trim() || null,
          description: form.description.trim() || null,
          instagram_url: socialParsed.instagram.value,
          tiktok_url: socialParsed.tiktok.value,
          facebook_url: socialParsed.facebook.value,
          youtube_url: socialParsed.youtube.value,
          x_url: socialParsed.x.value,
          website_url: socialParsed.website.value,
          is_open: form.is_open,
          avatar_url: form.avatar_url || null,
          cover_url: form.cover_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (error) throw error;
      toast.success("Perubahan berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-6"
    >
      <SectionHeader
        title="Informasi Utama Toko"
        description="Identitas, tampilan, dan kontak toko"
      />

      {/* Status toko */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl gap-3">
        <div className="flex items-center gap-3">
          <Power
            className={`w-4 h-4 shrink-0 ${
              form.is_open ? "text-emerald-600" : "text-slate-400"
            }`}
          />
          <div>
            <p className="text-xs font-bold text-slate-800">Status Toko</p>
            <p className="text-[10px] text-slate-400">
              {form.is_open
                ? "Toko sedang BUKA dan siap menerima pesanan"
                : "Toko sedang TUTUP sementara"}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={form.is_open}
            onChange={(e) => set("is_open", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt={form.name} className="w-full h-full object-cover" />
          ) : (
            (form.name || "TK").substring(0, 2).toUpperCase()
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={(e) => handleUpload(e, "logo")}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading !== null}
            onClick={() => logoInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading === "logo" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{uploading === "logo" ? "Mengunggah..." : "Unggah Logo"}</span>
          </button>
          <p className={hintCls}>JPG, PNG, atau WebP, maksimal 2MB</p>
        </div>
      </div>

      {/* Foto toko (banner) */}
      <div className="space-y-2">
        <label className={labelCls}>Foto Toko</label>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={(e) => handleUpload(e, "cover")}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading !== null}
          onClick={() => coverInputRef.current?.click()}
          className="relative w-full aspect-[16/6] rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-60"
        >
          {form.cover_url ? (
            <img src={form.cover_url} alt="Foto toko" className="w-full h-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-xs font-medium">
              <ImagePlus className="w-6 h-6" />
              Unggah foto tampak depan toko
            </span>
          )}
          {uploading === "cover" && (
            <span className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </span>
          )}
        </button>
        <div className="flex items-center justify-between">
          <p className={hintCls}>Tampil sebagai banner di kartu toko. Maksimal 2MB.</p>
          {form.cover_url && (
            <button
              type="button"
              onClick={() => set("cover_url", "")}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Hapus foto
            </button>
          )}
        </div>
      </div>

      {/* Input utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Nama Toko</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Kategori</label>
          <input
            type="text"
            required
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelCls}>Nomor WhatsApp</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="tel"
              inputMode="tel"
              placeholder="Contoh: 6281234567890"
              value={form.whatsapp_number}
              onChange={(e) => set("whatsapp_number", e.target.value.replace(/[^\d+]/g, ""))}
              className={inputIconCls}
            />
          </div>
          {waError ? (
            <p className={errorCls}>{waError}</p>
          ) : (
            <p className={hintCls}>
              Gunakan kode negara tanpa spasi, misalnya 62812xxxxxxx
            </p>
          )}
        </div>
      </div>

      {/* Media sosial */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold text-slate-800">Media Sosial & Website</p>
          <p className={hintCls}>Opsional. Tempelkan link lengkap profil toko Anda.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIALS.map((s) => {
            const Icon = s.key === "website" ? Globe : Link2;
            const invalid = !socialParsed[s.key].valid;

            return (
              <div key={s.key} className="space-y-1.5">
                <label className={labelCls}>{s.label}</label>
                <div className="relative">
                  <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    inputMode="url"
                    placeholder={s.placeholder}
                    value={form[s.key]}
                    onChange={(e) => set(s.key, e.target.value)}
                    className={inputIconCls}
                  />
                </div>
                {invalid && (
                  <p className={errorCls}>
                    Masukkan link {s.label} yang valid, contoh: {s.placeholder}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Deskripsi Toko</label>
        <textarea
          rows={3}
          maxLength={500}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ceritakan singkat tentang toko Anda"
          className={inputCls}
        />
        <p className={hintCls}>{form.description.length}/500 karakter</p>
      </div>

      <SaveBar isSaving={isSaving} />
    </form>
  );
}