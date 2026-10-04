"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  MailCheck,
} from "lucide-react";

// Domain email umum yang diizinkan untuk mendaftar
const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.id",
  "ymail.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "neco.com"
];

const MIN_PASSWORD_LENGTH = 8;

const getEmailError = (value: string): string | null => {
  const email = value.trim().toLowerCase();
  if (!email) return null;

  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null; // biarkan validasi bawaan browser

  const domain = email.slice(at + 1);
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return "Gunakan email umum seperti Gmail, Outlook, Yahoo, atau iCloud.";
  }
  return null;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.28-2.1 3.54-5.19 3.54-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.61H1.29a12 12 0 0 0 0 10.78l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.09C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

const inputClass =
  "w-full pl-10 pr-3.5 py-3 bg-white border border-slate-300 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-50 disabled:text-slate-400 transition-colors";

const inputErrorClass =
  "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";

export default function RegisterPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const isBusy = isLoading || isGoogleLoading;
  const emailError = emailTouched ? getEmailError(email) : null;
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  // Auto focus ke kolom nama saat halaman dibuka
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isBusy) return;

    setErrorMessage(null);
    setEmailTouched(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const domainError = getEmailError(cleanEmail);
    if (domainError) {
      setErrorMessage(domainError);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Email sudah terdaftar (Supabase tidak membocorkan error, identities kosong)
      if (data.user && data.user.identities?.length === 0) {
        setErrorMessage("Email ini sudah terdaftar. Silakan masuk.");
        return;
      }

      if (data.session) {
        // Konfirmasi email nonaktif: langsung masuk
        router.push("/");
        router.refresh();
      } else {
        // Konfirmasi email aktif: minta pengguna cek inbox
        setSentTo(cleanEmail);
      }
    } catch (err: unknown) {
      console.error("Gagal mendaftar:", err instanceof Error ? err.message : err);
      setErrorMessage("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (isBusy) return;

    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      // Bila berhasil, browser langsung dialihkan ke Google
      if (error) {
        setErrorMessage(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      console.error("Gagal daftar Google:", err instanceof Error ? err.message : err);
      setErrorMessage("Tidak dapat mendaftar dengan Google. Silakan coba lagi.");
      setIsGoogleLoading(false);
    }
  };

  // ===== Layar sukses: cek email =====
  if (sentTo) {
    return (
      <div className="min-h-screen w-full bg-white sm:bg-slate-50 flex items-center justify-center px-5 py-10 font-sans antialiased">
        <div className="w-full max-w-sm sm:bg-white sm:border sm:border-slate-200 sm:rounded-2xl sm:p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MailCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-slate-900">Cek email Anda</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kami mengirim tautan konfirmasi ke{" "}
              <span className="font-semibold text-slate-800 break-all">{sentTo}</span>. Buka
              tautan tersebut untuk mengaktifkan akun.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="w-full inline-flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Ke Halaman Masuk
          </Link>
          <p className="text-xs text-slate-400">
            Tidak menemukan emailnya? Periksa folder spam atau promosi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white sm:bg-slate-50 flex items-center justify-center px-5 py-10 font-sans antialiased">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 flex items-center justify-center bg-emerald-600 rounded-xl text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            NECO<span className="text-emerald-600">.</span>
          </span>
        </div>

        {/* Card */}
        <div className="sm:bg-white sm:border sm:border-slate-200 sm:rounded-2xl sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900">Buat akun baru</h1>
            <p className="text-sm text-slate-500">Mulai kelola toko dan transaksi Anda</p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-sm text-rose-700"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={isBusy}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            <span>Daftar dengan Google</span>
          </button>

          {/* Pemisah */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">atau dengan email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Form: Enter di kolom mana pun akan submit */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nama lengkap */}
            <div className="space-y-1.5">
              <label htmlFor="full_name" className="text-sm font-semibold text-slate-700">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={nameRef}
                  id="full_name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  placeholder="Nama Anda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isBusy}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  placeholder="nama@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  disabled={isBusy}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`${inputClass} ${emailError ? inputErrorClass : ""}`}
                />
              </div>
              {emailError && (
                <p id="email-error" className="text-xs text-rose-600">
                  {emailError}
                </p>
              )}
            </div>

            {/* Kata sandi */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isBusy}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Konfirmasi kata sandi */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirm_password"
                className="text-sm font-semibold text-slate-700"
              >
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="confirm_password"
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isBusy}
                  aria-invalid={confirmMismatch}
                  className={`${inputClass} ${confirmMismatch ? inputErrorClass : ""}`}
                />
              </div>
              {confirmMismatch && (
                <p className="text-xs text-rose-600">Kata sandi tidak sama.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Daftar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link
              href="/auth/login"
              className="font-bold text-emerald-600 hover:text-emerald-700"
            >
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}