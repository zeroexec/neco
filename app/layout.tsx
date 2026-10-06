import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "./PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neco.example.com";
const SITE_NAME = "Neco";
const TITLE = "Neco | Marketplace UMKM Terdekat";
const DESCRIPTION =
  "Neco adalah platform marketplace UMKM untuk menemukan toko terdekat, melihat menu dan produk, serta memesan langsung lewat pickup, delivery, atau scan QR di meja tanpa perlu antre.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Neco",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Neco",
    "UMKM",
    "marketplace UMKM",
    "toko online",
    "pesan makanan",
    "pesan dari meja",
    "scan QR meja",
    "pesan tanpa antre",
    "kasir online",
    "toko terdekat",
  ],
  authors: [{ name: "Neco" }],
  creator: "Neco",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Neco - Marketplace UMKM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Untuk iPhone/iPad saat ditambahkan ke layar utama
  appleWebApp: {
    capable: true,
    title: "NECO",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}