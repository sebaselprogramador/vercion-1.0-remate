import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { ProveedorSesion } from "@/lib/sesion";

const fuente = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--fuente",
});

export const metadata: Metadata = {
  title: "Remate — Subastas en vivo en Cochabamba",
  description: "Registro de pujas y adjudicación para subastas realizadas durante transmisiones en vivo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={fuente.variable}><ProveedorSesion>{children}</ProveedorSesion></body>
    </html>
  );
}
