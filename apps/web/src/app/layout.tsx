import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@uppy/dashboard/dist/style.min.css";
import "@uppy/core/dist/style.min.css";
import "@uppy/audio/dist/style.min.css";
import "@uppy/webcam/dist/style.min.css";
import "@livekit/components-styles";
import "@/styles/uppy.css";
import "@/styles/calls.css";
import "@/styles/editor.css";
import "@/styles/globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { FeatureRouteGate } from "@/components/feature-flags-provider";
import { Toaster } from "@/components/ui/toast";
import { CallWindow } from "../features/rooms/components/call-window";

/** Runtime = edge require in order to make next-auth works with cf-pages */
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Wodge App",
  description: "A collaborative app",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: [
    "wodge",
    "rich text",
    "collaboration",
    "documents",
    "notes",
    "meetings",
    "chat",
    "files",
  ],

  authors: [
    {
      name: "Amr Yasser",
    },
    {
      name: "Begad Wael",
    },

    {
      name: "Marwan Khaled",
    },
    {
      name: "Omar Hassan",
    },
    {
      name: "Ahmed El Masry",
    },
  ],

  icons: [
    { rel: "apple-touch-icon", url: "icons/icon-128x128.png" },
    { rel: "icon", url: "icons/icon-128x128.png" },
  ],
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#fff" }],
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
  width: "device-width",
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="relative overflow-hidden font-sans">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <FeatureRouteGate>{children}</FeatureRouteGate>
            <CallWindow />
          </ThemeProvider>
        </Providers>
        <Toaster richColors />
      </body>
    </html>
  );
}
