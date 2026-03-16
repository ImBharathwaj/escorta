"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type AdminGallery = {
  id: string;
  slug: string;
  title: string;
  h1: string;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
};

export default function AdminGalleryListPage() {
  const { token } = useAuth();
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [h1, setH1] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch("/api/admin/gallery", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.galleries)) {
          setGalleries(data.galleries);
        } else {
          setGalleries([]);
        }
      })
      .catch(() => {
        setError("Failed to load galleries.");
        setGalleries([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreateError(null);
    if (!slug.trim() || !title.trim() || !h1.trim() || !description.trim()) {
      setCreateError("Slug, title, H1 and description are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          h1: h1.trim(),
          description: description.trim(),
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "Failed to create gallery.");
        return;
      }
      setGalleries((prev) => [
        {
          id: data.id,
          slug: data.slug,
          title: data.title,
          h1: data.h1,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          imageCount: 0,
        },
        ...prev,
      ]);
      setSlug("");
      setTitle("");
      setH1("");
      setDescription("");
      setKeywords("");
    } catch {
      setCreateError("Request failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block"
      >
        ← Admin
      </Link>

      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">
        Image galleries
      </h1>
      <p className="text-sm text-[var(--color-silver)] mb-8">
        Manage SEO‑focused image galleries. Create a gallery, then upload images
        or reuse approved escort photos.
      </p>

      <section className="mb-10 max-w-2xl">
        <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">
          New gallery
        </h2>
        <form
          onSubmit={handleCreate}
          className="space-y-4 p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-silver)] mb-1">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-")
                      .replace(/--+/g, "-")
                  )
                }
                placeholder="dinner-date-companions-chennai"
                className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-silver)] mb-1">
                Title (SEO)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dinner date companions in Chennai"
                className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-silver)] mb-1">
              H1 heading
            </label>
            <input
              value={h1}
              onChange={(e) => setH1(e.target.value)}
              placeholder="Dinner date companions in Chennai"
              className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-silver)] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short paragraph describing this gallery for search engines and users."
              className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-silver)] mb-1">
              Keywords (comma‑separated)
            </label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="dinner date, Chennai companions, premium companions"
              className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
            />
          </div>

          {createError && (
            <p className="text-xs text-red-300/90">{createError}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 text-xs md:text-sm font-medium border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create gallery"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">
          Existing galleries
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--color-silver)]">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-300/90">{error}</p>
        ) : galleries.length === 0 ? (
          <p className="text-sm text-[var(--color-silver)]">
            No galleries yet. Create your first gallery above.
          </p>
        ) : (
          <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-charcoal)]/80 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-3 font-normal text-[var(--color-silver)]">
                    Title
                  </th>
                  <th className="px-4 py-3 font-normal text-[var(--color-silver)]">
                    Slug
                  </th>
                  <th className="px-4 py-3 font-normal text-[var(--color-silver)]">
                    Images
                  </th>
                  <th className="px-4 py-3 font-normal text-[var(--color-silver)]">
                    Updated
                  </th>
                  <th className="px-4 py-3 font-normal text-[var(--color-silver)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {galleries.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-obsidian)]/60"
                  >
                    <td className="px-4 py-3 text-[var(--color-ivory)]">
                      {g.title}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-silver)]">
                      {g.slug}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-silver)]">
                      {g.imageCount}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-silver)] text-xs">
                      {new Date(g.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/gallery/${g.id}`}
                        className="inline-flex items-center text-xs text-[var(--color-champagne)] hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

