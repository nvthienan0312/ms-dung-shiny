import type { Metadata } from "next";
import "./globals.css";
import { CenterProvider } from "@/context/CenterContext";

export const metadata: Metadata = {
  title: "Ms. Dung Shiny - Quản Lý Trung Tâm Tiếng Anh",
  description: "Hệ thống quản lý đào tạo, thời khóa biểu và sổ liên lạc điện tử Ms. Dung Shiny",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 antialiased">
        <CenterProvider>{children}</CenterProvider>
      </body>
    </html>
  );
}
