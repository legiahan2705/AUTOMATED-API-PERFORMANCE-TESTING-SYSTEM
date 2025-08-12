import type { Metadata } from "next"
import "./globals.css"

import { Nunito, Lora } from "next/font/google"
import { Toaster } from "react-hot-toast" //import toaster


const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "700"],
})

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "Test Mate",
  description: "Automated API & Performance Testing with a Visual Interface",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className={`${nunito.variable} ${lora.variable} antialiased`}>
        {children}

        {/* Thêm toaster ở đây để toast dùng được toàn hệ thống */}
        <Toaster
          position="top-center"
          toastOptions={{
          style: {
            width: "fit-content",     // tự co giãn theo nội dung
            maxWidth: "90%",          // không tràn khỏi màn hình
            whiteSpace: "nowrap",     // không bẻ dòng, chỉ 1 dòng duy nhất
            zIndex: 9999,             // Đảm bảo toast nổi lên trên Dialog
          },
          className: "!z-[9999] shadow-lg bg-white dark:bg-zinc-900 text-sm", // Tailwind bổ sung thêm đẹp
        }}
        />

      </body>
    </html>
  )
}
