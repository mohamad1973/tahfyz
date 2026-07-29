import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body suppressHydrationWarning className="min-h-full antialiased mesh-bg">
        {children}
      </body>
    </html>
  );
}
