import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

// next/font self-hosts at build time — no runtime request, no extra dependency.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BTL Project Management App',
    template: '%s · BTL',
  },
  description:
    'See how much of your team’s capacity unplanned work is eating, and who is over capacity this week.',
}

/**
 * Applied before first paint so the correct theme is on <html> when the CSS
 * lands. Doing this in React instead would flash the wrong theme on every
 * load, which is the single most obvious "cheap app" tell.
 */
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('btl-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = stored || system;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} min-h-screen font-sans`}>{children}</body>
    </html>
  )
}
