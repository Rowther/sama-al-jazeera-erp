import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sama Al Jazeera ERP - Business Operating System",
  description: "Modern ERP system for manufacturing management built by Mohammed Tariq",
  authors: [{ name: "Mohammed Tariq" }],
  creator: "Mohammed Tariq",
  publisher: "Mohammed Tariq",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sama Al Jazeera ERP",
    description: "Modern ERP system for manufacturing management. Built by Mohammed Tariq, Full Stack Developer from Bangalore, India.",
    type: "website",
    siteName: "Sama Al Jazeera ERP",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <Script id="schema-org" type="application/ld+json" strategy="beforeInteractive">
          {`
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Sama Al Jazeera ERP",
            "description": "Modern ERP system for manufacturing management",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "author": {
              "@type": "Person",
              "name": "Mohammed Tariq",
              "jobTitle": "Full Stack Developer",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Bangalore",
                "addressCountry": "India"
              }
            }
          }
          `}
        </Script>
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
