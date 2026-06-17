/**
 * Root application layout.
 */

import "@/styles/global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multi User Chat Bot",
  description: "Shared passcode-based product chat assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}