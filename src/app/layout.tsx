import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "TelStaff Viewer — Edmonton Fire Rescue",
  description:
    "Real-time staffing dashboard for Edmonton Fire Rescue firefighters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="noise-bg min-h-full flex flex-col bg-background text-foreground font-body">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
