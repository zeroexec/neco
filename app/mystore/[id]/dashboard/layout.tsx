"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useDashboardData } from "./layout/use-dashboard-data";
import { buildNavItems, checkIsActive } from "./layout/utils";
import { AccessStateScreen } from "./layout/state-screen";
import { Sidebar } from "./layout/sidebar";
import { MobileHeader, MobileBottomNav, MobileMoreSheet } from "./layout/mobile-nav";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;
  const pathname = usePathname();
  const router = useRouter();

  const {
    shop,
    accessState,
    jobTitle,
    allowedMenus,
    userInfo,
    pendingOrders,
    toast,
    isOwner,
    isEmployee,
    refetch,
  } = useDashboardData(storeId);

  // Panel "Lainnya" di mobile (bottom sheet)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  // Tutup panel otomatis saat pindah halaman
  useEffect(() => {
    setIsSheetOpen(false);
  }, [pathname]);

  // ===== Menu & hak akses =====
  // Pemilik: semua menu. Karyawan: hanya menu yang diizinkan pemilik (tanpa menu khusus pemilik).
  const allNavItems = buildNavItems(storeId, pendingOrders);
  const visibleNav = allNavItems.filter((item) =>
    isOwner ? true : isEmployee && !item.ownerOnly && allowedMenus.includes(item.key)
  );

  const currentItem = allNavItems.find((i) => checkIsActive(pathname, i.href, i.exact));
  const canViewCurrent =
    isOwner || (isEmployee && !!currentItem && visibleNav.some((v) => v.key === currentItem.key));

  // Karyawan yang membuka menu tanpa izin dialihkan ke menu pertama yang diizinkan
  useEffect(() => {
    if (!isEmployee || visibleNav.length === 0 || canViewCurrent) return;
    router.replace(visibleNav[0].href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, canViewCurrent, pathname, allowedMenus]);

  const homeHref = isOwner ? "/mystore" : "/employee";
  const homeLabel = isOwner ? "Kembali ke Semua Toko" : "Kembali ke Daftar Toko";
  const roleLabel = isOwner ? "Pemilik Toko" : jobTitle ? `Karyawan · ${jobTitle}` : "Karyawan";

  // ================= LAYAR STATUS =================
  const noMenuAccess = isEmployee && visibleNav.length === 0;
  if ((!isOwner && !isEmployee) || noMenuAccess) {
    return (
      <AccessStateScreen state={accessState} noMenuAccess={noMenuAccess} onRetry={refetch} />
    );
  }

  return (
    <div className="w-full h-dvh overflow-hidden md:h-auto md:min-h-screen md:overflow-visible bg-slate-50 text-slate-800 font-sans antialiased flex flex-col md:flex-row [--mobile-nav-h:calc(4rem_+_env(safe-area-inset-bottom))] md:[--mobile-nav-h:0px] [--mobile-header-h:calc(4.5rem_+_env(safe-area-inset-top))] md:[--mobile-header-h:0px]">
      {/* ================= TOAST ================= */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-sm pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold bg-white ${
              toast.type === "success"
                ? "border-emerald-200 text-emerald-700"
                : "border-rose-200 text-rose-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile: header hijau, tetap di atas (bukan fixed, jadi tidak menimpa konten) */}
      <MobileHeader
        shop={shop}
        storeId={storeId}
        userInfo={userInfo}
        homeHref={homeHref}
        homeLabel={homeLabel}
        onOpenMenu={() => setIsSheetOpen(true)}
      />

      {/* Desktop saja: sidebar tetap */}
      <Sidebar
        storeId={storeId}
        shop={shop}
        userInfo={userInfo}
        items={visibleNav}
        pathname={pathname}
        homeHref={homeHref}
        homeLabel={homeLabel}
        roleLabel={roleLabel}
      />

      {/* ================= AREA KONTEN =================
          Di mobile hanya area ini yang di-scroll; header ada di atasnya dan bottom nav di bawahnya
          (keduanya bukan fixed), jadi elemen sticky top/bottom di halaman lain berhenti
          tepat di bawah header dan di atas bottom nav. */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto overscroll-contain md:overflow-visible">
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {canViewCurrent ? (
            children
          ) : (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          )}
        </main>
      </div>

      {/* Mobile: bottom navigation (maks. 5 tab, sisanya di "Lainnya") */}
      <MobileBottomNav
        items={visibleNav}
        pathname={pathname}
        isMenuOpen={isSheetOpen}
        onOpenMenu={() => setIsSheetOpen(true)}
      />

      {/* Mobile: panel "Lainnya" + akun (dibuka dari tab Lainnya atau avatar) */}
      <MobileMoreSheet
        isOpen={isSheetOpen}
        onClose={closeSheet}
        items={visibleNav}
        pathname={pathname}
        userInfo={userInfo}
        roleLabel={roleLabel}
        homeHref={homeHref}
        homeLabel={homeLabel}
      />
    </div>
  );
}