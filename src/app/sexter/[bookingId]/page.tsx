"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Sexter is now standalone (no connection). Redirect old booking-based URLs to sexter list. */
export default function SexterBookingRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sexter");
  }, [router]);
  return (
    <div className="pt-16 min-h-screen flex items-center justify-center">
      <p className="text-[var(--color-silver)] font-light">Redirecting to Sexter...</p>
    </div>
  );
}
