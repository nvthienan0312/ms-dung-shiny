import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CenterProvider } from "@/context/CenterContext";
import PWAInstaller from "@/components/common/PWAInstaller";

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ms. Dung Shiny - Quản Lý Trung Tâm Tiếng Anh",
  description: "Hệ thống quản lý đào tạo, thời khóa biểu và sổ liên lạc điện tử Ms. Dung Shiny",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ms. Dung Shiny",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 antialiased">
        <CenterProvider>
          {children}
          <PWAInstaller />
        </CenterProvider>
      </body>
    </html>
  );
}
