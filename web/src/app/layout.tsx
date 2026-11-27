import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "PayVerify · Verificación y Conciliación de Pagos",
  description: "Monitorea, verifica y concilia los pagos de tu organización en un solo lugar.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1433" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
