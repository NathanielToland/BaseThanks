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
        <meta
          name="talentapp:project_verification"
          content="e6673702518edc99a1461beadf316fe7e6e637aca82fafe9c4dba92c37584157790f83bc0835bf452b43c7b34bbf9de53f56900cae9abd9db2fcf9903d9f40bc"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
