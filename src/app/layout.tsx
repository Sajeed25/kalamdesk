import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "KalamDesk",
  description: "Daily operations & task tracker",
  manifest: "/manifest.webmanifest",
  applicationName: "KalamDesk",
  icons: { icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "KalamDesk", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#312e81", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<OfflineBanner /><PwaRegister /></body>
    </html>
  );
}
