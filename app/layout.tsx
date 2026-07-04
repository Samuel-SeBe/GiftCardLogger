import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base so link previews (iMessage/WhatsApp) resolve the OG image.
  metadataBase: new URL("https://www.giftcardsnapper.com"),
  title: "Gift Card Snapper",
  description: "Snap your gift cards. Get rows in Google Sheets.",
  openGraph: {
    title: "Gift Card Snapper",
    description: "Snap your gift cards. Get rows in Google Sheets.",
    url: "https://www.giftcardsnapper.com",
    siteName: "Gift Card Snapper",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gift Card Snapper",
    description: "Snap your gift cards. Get rows in Google Sheets.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
