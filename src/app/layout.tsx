import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Christina Hammarström — Konst',
  description: 'Målningar av den svenska konstnären Christina Hammarström. Abstrakta och expressiva verk med teman från natur, kosmos och det mänskliga.',
  openGraph: {
    title: 'Christina Hammarström — Konst',
    description: 'Målningar av den svenska konstnären Christina Hammarström.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
