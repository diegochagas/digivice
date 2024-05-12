import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Digivice',
  description: 'The Digivice, sometimes referred to as the "holy device", is a model of Digivice that is used by the Chosen Children in Digimon Adventure'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'production' && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${process.env.GOOGLE_ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
          >
          </script>
        )}
      </head>

      <body className={inter.className}>{children}</body>
    </html>
  )
}
