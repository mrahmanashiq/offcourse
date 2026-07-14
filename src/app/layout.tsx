import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mra-offcourse.vercel.app";
const DESCRIPTION = "A private home for the courses you already downloaded. Local-first, offline, open source.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Offcourse", template: "%s · Offcourse" },
  description: DESCRIPTION,
  applicationName: "Offcourse",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Offcourse" },
  icons: { icon: "/icons/32", apple: "/icons/180" },
  openGraph: {
    title: "Offcourse",
    description: DESCRIPTION,
    url: "/",
    siteName: "Offcourse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Offcourse",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
