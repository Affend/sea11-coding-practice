import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SEA Coding Platform - Algoritma & Struktur Data',
  description: 'Platform belajar Algoritma & Pemrograman C dan Struktur Data Arduino UNO dengan eksekusi kode di browser',
  keywords: ['C programming', 'Arduino', 'algorithms', 'data structures', 'coding practice', 'education'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
