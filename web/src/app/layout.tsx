import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth/context";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRAFT-ON",
  description: "建設現場のスポットマッチング — CRAFT-ON",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CRAFT-ON", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0a66c2",
  width: "device-width",
  initialScale: 1,
  // iOS: stop Safari from zooming the whole page when an input is focused.
  // Pinch zoom still works (iOS ignores maximum-scale for user gestures since
  // v10), so accessibility is preserved. Belt-and-braces with the 16px form
  // font rule in globals.css.
  maximumScale: 1,
  // Draw edge-to-edge in standalone/PWA mode; safe-area insets are handled in
  // AppShell (header) and BottomNav.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Apply the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </ThemeProvider>
          <ServiceWorkerRegistrar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
