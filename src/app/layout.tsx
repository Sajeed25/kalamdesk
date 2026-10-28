import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "KalamDesk", description: "Daily operations & task tracker", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#312e81", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
