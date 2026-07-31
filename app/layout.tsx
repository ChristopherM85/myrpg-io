import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://myrpg.io"),
  title: "MyRPG.IO — MMO intelligence, human approved",
  description: "A trustworthy MMO news, discovery, and game directory experience.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "MyRPG.IO", description: "MMO intelligence, human-approved.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "MyRPG.IO", description: "MMO intelligence, human-approved.", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
