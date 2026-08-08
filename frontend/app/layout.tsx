import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import '@/styles/globals.scss'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--cf-font-family',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Florescer · Admin',
  description: 'Painel nutricionista — Clube Florescer (Next.js)',
  icons: {
    icon: [
      { url: '/icons/logovetorcarregamento.svg', type: 'image/svg+xml' },
      { url: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={plusJakarta.variable}>
      <body style={{ fontFamily: 'var(--cf-font-family), var(--cf-font)' }}>{children}</body>
    </html>
  )
}
