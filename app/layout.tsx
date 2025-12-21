import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reset R&A - Pedidos",
  description: "Sistema de gestión de pedidos para el equipo de Research & Analytics de Reset",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
