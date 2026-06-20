import type { Metadata } from "next";

import "@lunchlink/ui/globals.css";

export const metadata: Metadata = {
  title: "LunchLink",
  description: "University meal plans for Uganda",
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
