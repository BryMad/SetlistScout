import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// SetlistScout's own voice: techy display + mono for data. Spotify content
// zones (track rows, search results) deliberately stay on the platform
// sans-serif per Spotify's design guidelines — the contrast is the point.
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display-face",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "SetlistScout",
  description: "Know the setlist before the show.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${mono.variable} flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased`}
      >
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
