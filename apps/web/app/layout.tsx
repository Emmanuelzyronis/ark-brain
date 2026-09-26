import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArkBrain — Your Team\'s Institutional Memory',
  description: 'Ask why your team made any decision. Get cited answers from GitHub, Slack, and Notion — not guesses.',
  keywords: ['knowledge management', 'institutional memory', 'AI', 'engineering', 'decisions'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
