import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Carpool Optimizer",
  description: "Fastest drop-off order for group drives. Built on Google Maps DirectionsService.",
  manifest: "/manifest.webmanifest",
  applicationName: "Carpool Optimizer",
  appleWebApp: {
    capable: true,
    title: "Carpool",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
