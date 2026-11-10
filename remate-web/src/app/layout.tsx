import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--fuente-outfit",
});

export const metadata: Metadata = {
  title: "Remate — Subastas en vivo en Cochabamba",
  description: "Registro de pujas y adjudicación para subastas realizadas durante transmisiones en vivo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={outfit.variable}>{children}</body>
    </html>
  );
}
