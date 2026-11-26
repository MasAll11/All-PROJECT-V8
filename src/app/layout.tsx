import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALL×PROJECT V8 — One thoughtful space",
  description: "A connected workspace for AI, learning, productivity and everyday tools.",
  manifest: "/manifest.json",
  applicationName: "ALL×PROJECT",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b1020",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
