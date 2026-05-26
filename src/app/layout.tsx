import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Golf Group OS',
  description: 'The official history book of your golf group',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=DM+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  )
}
