import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { AgeGate } from "@/components/AgeGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingNotification } from "@/components/BookingNotification";
import { ChatWidget } from "@/components/ChatWidget";
import { SignupPromoPopup } from "@/components/SignupPromoPopup";
import { ActivityPing } from "@/components/ActivityPing";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { AnalyticsScript } from "@/components/AnalyticsScript";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-heading",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Escorta — Companion Discovery Platform",
  description: "Discreet, exclusive companion discovery. Connect with verified companions for arrangements, meetups, and social connections.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${outfit.variable}`}>
      <head>
        <AnalyticsScript />
      </head>
      <body>
        <AgeGate />
        <AuthProvider>
          <ActivityPing />
          <Header />
          <div className="pt-16">
            <EmailVerificationBanner />
            <main className="min-h-screen">{children}</main>
            <footer className="border-t border-[var(--color-border)] bg-[var(--color-obsidian)]/95">
              <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4 text-[11px] text-[var(--color-silver)]">
                <p className="font-light text-center sm:text-left">
                  Escorta is a discovery platform only. Offline meetups and any arrangements are at users&apos; own risk; we are not a booking or escort agency.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="font-light">
                    © {new Date().getFullYear()} Escorta. All rights reserved.
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/terms"
                      className="hover:text-[var(--color-ivory)] transition"
                    >
                      Terms of Service
                    </Link>
                    <Link
                      href="/privacy"
                      className="hover:text-[var(--color-ivory)] transition"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/guidelines"
                      className="hover:text-[var(--color-ivory)] transition"
                    >
                      Community Guidelines
                    </Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>
          <BookingNotification />
          <ChatWidget />
          <SignupPromoPopup />
        </AuthProvider>
      </body>
    </html>
  );
}
