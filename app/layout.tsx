import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fruitisimo Closing",
  description: "Register closing helper for Fruitisimo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The app is used one-handed at the scale; let staff zoom if they need to,
  // but never have the browser do it for them.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
