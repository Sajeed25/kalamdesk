import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "KalamDesk", description: "Daily operations & task tracker for Robokalam", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#4f46e5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
