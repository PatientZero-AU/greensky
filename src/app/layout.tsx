import type { Metadata } from "next";
import { VT323, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GreenSky — Live COBOL Flight Tracker | Australian Airspace",
  description:
    "Live Australian flight tracking powered by GnuCOBOL, MQTT, and a Raspberry Pi 5 K3s cluster. A demonstration of mainframe modernisation meeting modern cloud-native infrastructure — because sometimes you need 15 technologies and 12 vendors to show dots on a map.",
  metadataBase: new URL("https://greensky.electricsheep.au"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GreenSky — Live COBOL Flight Tracker",
    description:
      "Australian airspace visualised in real time on a green phosphor CRT display. Powered by GnuCOBOL on a Raspberry Pi 5 K3s cluster.",
    url: "https://greensky.electricsheep.au",
    siteName: "GreenSky",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GreenSky — Live COBOL Flight Tracker",
    description:
      "Australian airspace visualised in real time. COBOL + MQTT + Raspberry Pi 5 K3s cluster.",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "COBOL",
    "flight tracker",
    "Australian airspace",
    "GnuCOBOL",
    "Raspberry Pi",
    "K3s",
    "MQTT",
    "mainframe modernisation",
    "cloud-native",
    "CRT",
    "green screen",
    "PatientZero",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GreenSky — Live COBOL Flight Tracker",
    url: "https://greensky.electricsheep.au",
    description:
      "Live Australian flight tracking powered by GnuCOBOL, MQTT, and a Raspberry Pi 5 K3s cluster.",
    applicationCategory: "Utilities",
    operatingSystem: "ARM64 Linux",
    author: {
      "@type": "Organization",
      name: "PatientZero",
      url: "https://paul-seymour.com",
      description: "Australian AI & Software Consultancy",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    },
  };

  return (
    <html lang="en-AU">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${vt323.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
