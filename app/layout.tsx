import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Isyarat — bahasa isyarat jadi teks, langsung di browser",
    template: "%s · Isyarat",
  },
  description:
    "Isyarat menerjemahkan ejaan jari SIBI dan kosakata isyarat menjadi teks secara real-time. Semua diproses di perangkatmu — video tidak pernah dikirim ke server.",
  keywords: ["bahasa isyarat", "SIBI", "BISINDO", "penerjemah isyarat", "aksesibilitas", "MediaPipe"],
  authors: [{ name: "Isyarat" }],
  openGraph: {
    title: "Isyarat — bahasa isyarat jadi teks",
    description:
      "Kamera jadi jembatan: ejaan jari SIBI dikenali on-device, real-time, tanpa upload video.",
    type: "website",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrains.variable} ${instrument.variable}`}>
      <body className="min-h-screen font-sans">
        <div className="grid-overlay" aria-hidden />
        <div
          className="glow"
          aria-hidden
          style={{
            top: "-18rem",
            left: "-10rem",
            width: "38rem",
            height: "38rem",
            background: "rgba(125, 243, 197, 0.16)",
          }}
        />
        <div
          className="glow"
          aria-hidden
          style={{
            top: "-14rem",
            right: "-12rem",
            width: "34rem",
            height: "34rem",
            background: "rgba(154, 139, 255, 0.16)",
          }}
        />
        <SiteHeader />
        <main className="relative">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
