"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BlurredImage } from "@/components/BlurredImage";

type SexterClient = {
  id: string;
  name: string;
  avatarUrl: string | null;
  online: boolean;
};

type SexterEscort = {
  id: string;
  escortProfileId: string;
  aliasName: string;
  primaryPhotoId: string | null;
  primaryPhotoUrl: string | null;
  online: boolean;
  bookingId: string | null;
  canSend: boolean;
};

export default function SexterPage() {
  const router = useRouter();
  const { user, token, authReady } = useAuth();
  const [clients, setClients] = useState<SexterClient[]>([]);
  const [escorts, setEscorts] = useState<SexterEscort[]>([]);
  const [loading, setLoading] = useState(true);
  const isClient = user?.role === "client";

  useEffect(() => {
    if (!authReady) return;
    if (!token || (user?.role !== "client" && user?.role !== "escort")) {
      router.push("/login");
      return;
    }
  }, [authReady, token, user?.role, router]);

  useEffect(() => {
    if (!token || (user?.role !== "client" && user?.role !== "escort")) {
      setLoading(false);
      return;
    }
    if (isClient) {
      setLoading(true);
      fetch("/api/sexter/escorts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          setEscorts(data.escorts || []);
        })
        .catch(() => setEscorts([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      const fetchClients = () => {
        fetch("/api/sexter/clients", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
          .then((r) => r.json())
          .then((data) => {
            setClients(Array.isArray(data?.clients) ? data.clients : []);
          })
          .catch(() => setClients([]))
          .finally(() => setLoading(false));
      };
      fetchClients();
      const interval = setInterval(fetchClients, 15000);
      return () => clearInterval(interval);
    }
  }, [token, isClient]);

  if (!token || (user?.role !== "client" && user?.role !== "escort")) return null;

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-light tracking-wide text-[var(--color-ivory)] mb-6">
          Sexter
        </h1>

        {loading ? (
          <p className="text-[var(--color-silver)] font-light text-sm">Loading...</p>
        ) : isClient ? (
          escorts.length === 0 ? (
            <p className="text-[var(--color-muted)] font-light text-sm">
              No companions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {escorts.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/sexter/escort/${e.id}`}
                    className="flex items-center gap-4 p-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-charcoal)] hover:bg-[var(--color-charcoal)]/90 transition"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex items-center justify-center">
                        {e.primaryPhotoId ? (
                          <BlurredImage
                            photoId={e.primaryPhotoId}
                            alt=""
                            className="w-full h-full object-cover"
                            aspect="thumbnail"
                            skipPremiumOverlay
                          />
                        ) : (
                          <span className="text-sm font-medium text-[var(--color-silver)]">{(e.aliasName || "?")[0].toUpperCase()}</span>
                        )}
                      </div>
                      {e.online && (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-charcoal)]"
                          title="Online"
                        />
                      )}
                    </div>
                    <span className="text-[var(--color-ivory)] font-light flex-1">
                      {e.aliasName}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {e.online ? "Online" : "Offline"}
                    </span>
                    <span className="text-xs text-[var(--color-champagne)] tracking-wider uppercase">
                      Open →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : clients.length === 0 ? (
          <p className="text-[var(--color-muted)] font-light text-sm">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/sexter/client/${c.id}`}
                  className="flex items-center gap-4 p-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-charcoal)] hover:bg-[var(--color-charcoal)]/90 transition"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex items-center justify-center">
                      {c.avatarUrl ? (
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : (
                        <span className="text-sm font-medium text-[var(--color-silver)]">{(c.name || "?")[0].toUpperCase()}</span>
                      )}
                    </div>
                    {c.online && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-charcoal)]"
                        title="Online"
                      />
                    )}
                  </div>
                  <span className="text-[var(--color-ivory)] font-light flex-1">
                    {c.name}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {c.online ? "Online" : "Offline"}
                  </span>
                  <span className="text-xs text-[var(--color-silver)] tracking-wider uppercase">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
