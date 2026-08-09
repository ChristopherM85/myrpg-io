import type { Metadata } from "next";
import "./globals.css";
import "./network-access.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://myrpg.io"),
  title: "MyRPG.IO — MMO intelligence, human approved",
  description: "A trustworthy MMO news, discovery, and game directory experience.",
  icons: {
    icon: [{ url: "/favicon-48.png?v=20260809", sizes: "48x48", type: "image/png" }, { url: "/favicon.svg?v=20260809", sizes: "any", type: "image/svg+xml" }],
    shortcut: "/favicon.ico?v=20260809",
    apple: [{ url: "/apple-touch-icon.png?v=20260809", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest?v=20260809",
  themeColor: "#0b1020",
  openGraph: { title: "MyRPG.IO", description: "MMO intelligence, human-approved.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "MyRPG.IO", description: "MMO intelligence, human-approved.", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identitySchema = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", name: "MyRPG.IO", url: "https://myrpg.io", description: "MMO intelligence with source-linked, human-reviewed editorial coverage." },
    { "@type": "WebSite", name: "MyRPG.IO", url: "https://myrpg.io", description: "MMO news, discovery, release dates, and factual game profiles with human accountability." },
  ] };
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identitySchema) }} /></body></html>;
}
