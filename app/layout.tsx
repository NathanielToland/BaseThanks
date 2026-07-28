import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "BaseThanks",
  description: "Small notes of gratitude, kept onchain."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="6a680cb5dbe69151c4c99450" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
