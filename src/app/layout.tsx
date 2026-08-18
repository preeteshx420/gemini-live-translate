import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: "AiOnPhone — Live Translate by Mednaath",
  description:
    "Real-time multi-language video calls powered by Mednaath Technology's AiOnPhone. Everyone speaks their language.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-32.png",  type: "image/png", sizes: "32x32" },
      { url: "/logo-16.png",  type: "image/png", sizes: "16x16" },
    ],
    apple: [
      { url: "/logo-180.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/logo-32.png",
  },
  openGraph: {
    title: "AiOnPhone — Live Translate",
    description: "Real-time multi-language video calls by Mednaath Technology.",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
