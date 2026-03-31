import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import InstallBanner from "@/components/InstallBanner";

export const metadata: Metadata = {
  title: "BetterStaff — Edmonton Fire Rescue",
  description:
    "Real-time staffing dashboard for Edmonton Fire Rescue firefighters",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BetterStaff",
  },
};

export const viewport: Viewport = {
  themeColor: "#060809",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="noise-bg min-h-full flex flex-col bg-background text-foreground font-body">
        <SessionProvider>
          {children}
          <InstallBanner />
        </SessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
          }}
        />
      </body>
    </html>
  );
}
