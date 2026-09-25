import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArkBrain — Your Team\'s Institutional Memory',
  description: 'The semantic knowledge graph that answers why your team made every decision. Connect Slack, GitHub, Notion — ask anything.',
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
        {children}
      </body>
    </html>
  )
}
