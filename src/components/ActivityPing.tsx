"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PING_DEBOUNCE_MS = 30_000; // ping at most every 30 seconds
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"] as const;

export function ActivityPing() {
  const { token } = useAuth();
  const lastPingRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = useCallback(() => {
    if (!token) return;
    const now = Date.now();
    if (now - lastPingRef.current < PING_DEBOUNCE_MS) return;
    lastPingRef.current = now;
    fetch("/api/users/me/activity", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const handle = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(ping, 2000);
    };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, handle);
    }
    ping();
    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, handle);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token, ping]);

  return null;
}
