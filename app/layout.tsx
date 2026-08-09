import type { Metadata } from "next";
import "./globals.css";
import "./network-access.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://myrpg.io"),
  title: "MyRPG.IO — MMO intelligence, human approved",
  description: "A trustworthy MMO news, discovery, and game directory experience.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
