"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function TrackPageView({ event, props }: { event: string; props?: Record<string, string | number | boolean> }) {
  useEffect(() => {
    trackEvent(event, props);
  }, [event, props]);
  return null;
}
