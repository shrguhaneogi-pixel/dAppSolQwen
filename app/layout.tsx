import type { Metadata, Viewport } from "next";

import "./globals.css";

import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "AtmoGrid — DePIN Air-Quality Oracle on Solana",
  description:
    "Register a virtual sensor node on-chain, transmit simulated air-quality data and light up the network globe.",
  keywords: ["Solana", "DePIN", "Air Quality", "Oracle", "Anchor", "Three.js"],
  authors: [{ name: "AtmoGrid" }],
  openGraph: {
    title: "AtmoGrid — DePIN Air-Quality Oracle",
    description: "Gamified environmental monitoring, minted as PDAs on Solana devnet.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
