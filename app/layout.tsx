import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hello POC",
  description: "Deploy pipeline test",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
