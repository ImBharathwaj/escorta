import type { Metadata } from "next";
import "./globals.css";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { AgeGate } from "@/components/AgeGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingNotification } from "@/components/BookingNotification";
import { ChatWidget } from "@/components/ChatWidget";
import { SignupPromoPopup } from "@/components/SignupPromoPopup";
import { ActivityPing } from "@/components/ActivityPing";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

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
      <body>
        <AgeGate />
        <AuthProvider>
          <ActivityPing />
          <Header />
          <div className="pt-16">
            <EmailVerificationBanner />
            <main className="min-h-screen">{children}</main>
          </div>
          <BookingNotification />
          <ChatWidget />
          <SignupPromoPopup />
        </AuthProvider>
      </body>
    </html>
  );
}
