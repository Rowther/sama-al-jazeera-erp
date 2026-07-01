import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

const siteUrl = "https://www.datastream.ae"
const siteName = "DataStream"
const siteTitle = "DataStream - Multi-Tenant ERP & CRM Platform | UAE"
const siteDescription = "Leading Multi-Tenant ERP & CRM Platform in UAE. Manage work orders, clients, employees, and business operations efficiently. Cloud-based enterprise resource planning software."

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  authors: [{ name: "Mohammed Tariq" }],
  creator: "Mohammed Tariq",
  publisher: "DataStream",
  keywords: ["ERP software UAE", "CRM platform", "work order management", "multi-tenant CRM", "business management software", "enterprise resource planning", "Dubai ERP", "UAE business software", "cloud ERP", "client management", "employee management"],
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  other: {
    "language": "English",
    "revisit-after": "7 days",
    "rating": "general",
    "geo.region": "AE",
    "geo.placename": "United Arab Emirates",
    "google-site-verification": "google11befcaadd7bbb9b",
    "theme-color": "#3b82f6",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": siteName,
    "viewport": "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    type: "website",
    siteName,
    locale: "en_US",
    images: [{ url: `${siteUrl}/logo512.png`, width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [`${siteUrl}/logo512.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/logo192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: siteName },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="canonical" href={siteUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="google-site-verification" content="google11befcaadd7bbb9b" />
        <Script id="google-analytics" strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-2R32MWEZ7S" />
        <Script id="google-analytics-init" strategy="afterInteractive">
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-2R32MWEZ7S', {'send_page_view': true, 'anonymize_ip': true});
          `}
        </Script>
        <Script id="schema-org" type="application/ld+json" strategy="beforeInteractive">
          {`
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "DataStream",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "description": "DataStream is a comprehensive multi-tenant ERP and CRM platform designed for businesses in the UAE. Manage work orders, clients, employees, and streamline your business operations with our cloud-based solution.",
            "url": "${siteUrl}",
            "image": "${siteUrl}/logo512.png",
            "featureList": ["Work Order Management", "Client Relationship Management", "Employee Management", "Multi-Tenant Architecture", "Real-time Notifications", "Mobile Responsive"]
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
