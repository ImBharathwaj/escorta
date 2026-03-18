"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Escort = {
  id: string;
  aliasName: string;
  age: number | null;
  city: string | null;
  gender: string | null;
  isVerified: boolean;
  isGenderVerified: boolean;
  isSpotlighted: boolean;
  isActive: boolean;
  user: { email: string | null };
};

export default function AdminEscortsPage() {
  const { token } = useAuth();
  const [escorts, setEscorts] = useState<Escort[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/escorts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setEscorts(data.escorts || []))
      .catch(() => setEscorts([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function verify(escortId: string, field: "isVerified" | "isGenderVerified", value: boolean) {
    if (!token) return;
    setUpdating(escortId);
    try {
      const res = await fetch(`/api/admin/escorts/${escortId}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setEscorts((prev) =>
          prev.map((e) =>
            e.id === escortId ? { ...e, [field]: value } : e
          )
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  async function toggleSpotlight(escortId: string, value: boolean) {
    if (!token) return;
    setUpdating(escortId);
    try {
      const res = await fetch(`/api/admin/escorts/${escortId}/spotlight`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isSpotlighted: value }),
      });
      if (res.ok) {
        setEscorts((prev) =>
          prev.map((e) =>
            e.id === escortId ? { ...e, isSpotlighted: value } : e
          )
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[var(--color-silver)] font-light">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] tracking-wide mb-2">
        Escort verification
      </h1>
      <p className="text-sm text-[var(--color-silver)] mb-8">
        Review and verify companions manually.
      </p>

      {escorts.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-silver)] font-light">
          No escorts yet.
        </div>
      ) : (
        <div className="space-y-4">
          {escorts.map((e) => (
            <div
              key={e.id}
              className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-light text-[var(--color-ivory)]">
                      {e.aliasName}
                    </h2>
                    {e.isVerified && (
                      <span className="text-[10px] px-2 py-0.5 border border-[var(--color-champagne)] text-[var(--color-champagne)] uppercase tracking-wider">
                        Verified
                      </span>
                    )}
                    {e.isGenderVerified && (
                      <span className="text-[10px] px-2 py-0.5 border border-[var(--color-champagne)] text-[var(--color-champagne)] uppercase tracking-wider">
                        Verified female
                      </span>
                    )}
                    {e.isSpotlighted && (
                      <span className="text-[10px] px-2 py-0.5 border border-amber-400 text-amber-400 uppercase tracking-wider">
                        Spotlighted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-silver)] mt-1">
                    {e.user?.email ?? "—"} · {e.gender ?? "—"} · {e.city ?? "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => verify(e.id, "isVerified", !e.isVerified)}
                    disabled={updating === e.id}
                    className={`px-4 py-2 text-sm border transition disabled:opacity-50 ${
                      e.isVerified
                        ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/20 text-[var(--color-champagne)]"
                        : "border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-champagne)]/50"
                    }`}
                  >
                    {e.isVerified ? "Verified ✓" : "Verify profile"}
                  </button>
                  {e.gender === "female" && (
                    <button
                      onClick={() => verify(e.id, "isGenderVerified", !e.isGenderVerified)}
                      disabled={updating === e.id}
                      className={`px-4 py-2 text-sm border transition disabled:opacity-50 ${
                        e.isGenderVerified
                          ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/20 text-[var(--color-champagne)]"
                          : "border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-champagne)]/50"
                      }`}
                    >
                      {e.isGenderVerified ? "Verified female ✓" : "Verify female"}
                    </button>
                  )}
                  <button
                    onClick={() => toggleSpotlight(e.id, !e.isSpotlighted)}
                    disabled={updating === e.id}
                    className={`px-4 py-2 text-sm border transition disabled:opacity-50 ${
                      e.isSpotlighted
                        ? "border-amber-400 bg-amber-400/20 text-amber-400"
                        : "border-[var(--color-border)] text-[var(--color-silver)] hover:border-amber-400/50"
                    }`}
                  >
                    {e.isSpotlighted ? "Spotlighted ★" : "Spotlight"}
                  </button>
                  <Link
                    href={`/escorts/${e.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-champagne)]/50 transition"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
