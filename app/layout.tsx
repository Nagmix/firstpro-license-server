import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام تراخيص الأول برو",
  description: "لوحة تحكم إدارة تراخيص تطبيق الأول برو المحاسبي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
