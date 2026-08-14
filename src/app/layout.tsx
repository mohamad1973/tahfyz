import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/provider";
import { InstallPrompt } from "@/components/install-prompt";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Tahfyz — Quran Academy for International Students",
    template: "%s · Tahfyz",
  },
  description:
    "Learn Quran and Islamic sciences with Egyptian teachers. Live online Hifz, Tajweed, and more for students in the US and Europe.",
  applicationName: "Tahfyz",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tahfyz",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#3d5a40",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable} h-full`}>
      <body suppressHydrationWarning className="min-h-full antialiased mesh-bg">
        <LanguageProvider>
          {children}
          <InstallPrompt />
        </LanguageProvider>
      </body>
    </html>
  );
}
