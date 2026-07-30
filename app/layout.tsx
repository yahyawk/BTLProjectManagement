import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Teamflow',
  description: 'See where your team’s capacity actually goes.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
