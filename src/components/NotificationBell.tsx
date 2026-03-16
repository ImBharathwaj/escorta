"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Notification = {
  id: string;
  type: string;
  title: string | null;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_INTERVAL_MS = 25000;

function formatTime(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

export function NotificationBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const markRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    setLoading(true);
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getHref = (n: Notification): string => {
    if (n.type === "live_started" && n.referenceId) return "/live";
    if (n.type === "chat_message" && n.referenceType === "booking" && n.referenceId) {
      return `/connections/${n.referenceId}`;
    }
    if (n.type === "video_call_request" && n.referenceType === "booking" && n.referenceId) {
      return `/connections/${n.referenceId}`;
    }
    if (n.type === "video_call_accepted" && n.referenceType === "video_call_session" && n.referenceId) {
      return `/video-call/${n.referenceId}`;
    }
    if (n.type === "tip" && n.referenceType && n.referenceId) {
      if (n.referenceType === "booking") return `/connections/${n.referenceId}`;
      if (n.referenceType === "video_call") return `/video-call/${n.referenceId}`;
      if (n.referenceType === "live_session") return "/live/go";
      if (n.referenceType === "sexter_session") return "/sexter";
    }
    return "/dashboard";
  };

  if (!token) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition rounded-sm"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m-6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-medium bg-[var(--color-champagne)] text-[var(--color-obsidian)] rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-[70vh] overflow-hidden border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded shadow-lg z-[60] flex flex-col">
          <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-ivory)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={loading}
                className="text-xs tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-silver)] font-light">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={getHref(n)}
                      onClick={() => {
                        setOpen(false);
                        if (!n.readAt) markRead(n.id);
                      }}
                      className={`block p-3 text-left hover:bg-[var(--color-obsidian)]/50 transition ${!n.readAt ? "bg-[var(--color-obsidian)]/20" : ""}`}
                    >
                      <p className="text-sm text-[var(--color-ivory)] font-light line-clamp-2">
                        {n.title || (n.type === "live_started" ? "Someone is now live" : n.type === "tip" ? "You received a tip" : "New message")}
                      </p>
                      <p className="text-xs text-[var(--color-silver)] mt-1">{formatTime(n.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
