"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  caption: string | null;
};

type GalleryDetail = {
  id: string;
  slug: string;
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  images: GalleryImage[];
};

type AdminEscort = {
  id: string;
  aliasName: string;
  user: { email: string | null };
};

type EscortPhoto = {
  id: string;
  imageUrl: string;
};

export default function AdminGalleryDetailPage() {
  const params = useParams<{ id: string }>();
  const galleryId = params?.id;
  const { token } = useAuth();

  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingSeo, setSavingSeo] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [h1, setH1] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");

  const [escorts, setEscorts] = useState<AdminEscort[]>([]);
  const [selectedEscortId, setSelectedEscortId] = useState("");
  const [escortPhotos, setEscortPhotos] = useState<EscortPhoto[]>([]);
  const [selectedEscortPhotoIds, setSelectedEscortPhotoIds] = useState<
    Record<string, boolean>
  >({});
  const [loadingEscorts, setLoadingEscorts] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [addingFromEscort, setAddingFromEscort] = useState(false);

  useEffect(() => {
    if (!token || !galleryId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/gallery/${galleryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) {
          setError(data?.error || "Gallery not found.");
          setGallery(null);
          return;
        }
        const g: GalleryDetail = {
          id: data.id,
          slug: data.slug,
          title: data.title,
          h1: data.h1,
          description: data.description,
          keywords: data.keywords || [],
          images: (data.images || []).map((img: any) => ({
            id: img.id,
            src: img.src,
            alt: img.alt,
            caption: img.caption,
          })),
        };
        setGallery(g);
        setSlug(g.slug);
        setTitle(g.title);
        setH1(g.h1);
        setDescription(g.description);
        setKeywords(g.keywords.join(", "));
      })
      .catch(() => {
        setError("Failed to load gallery.");
      })
      .finally(() => setLoading(false));
  }, [token, galleryId]);

  useEffect(() => {
    if (!token) return;
    setLoadingEscorts(true);
    fetch("/api/admin/escorts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.escorts)) {
          setEscorts(
            data.escorts.map((e: any) => ({
              id: e.id,
              aliasName: e.aliasName,
              user: { email: e.user?.email ?? null },
            }))
          );
        }
      })
      .catch(() => {
        // swallow, escort picking is optional
      })
      .finally(() => setLoadingEscorts(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedEscortId) {
      setEscortPhotos([]);
      setSelectedEscortPhotoIds({});
      return;
    }
    setLoadingPhotos(true);
    fetch(`/api/escorts/${selectedEscortId}/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.photos)) {
          setEscortPhotos(
            data.photos.map((p: any) => ({
              id: p.id,
              imageUrl: p.imageUrl,
            }))
          );
          setSelectedEscortPhotoIds({});
        } else {
          setEscortPhotos([]);
        }
      })
      .catch(() => {
        setEscortPhotos([]);
      })
      .finally(() => setLoadingPhotos(false));
  }, [token, selectedEscortId]);

  const selectedEscort = useMemo(
    () => escorts.find((e) => e.id === selectedEscortId) || null,
    [escorts, selectedEscortId]
  );

  async function handleSaveSeo(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !galleryId) return;
    setSavingSeo(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gallery/${galleryId}`, {
        method: "PATCH",
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
        setError(data.error || "Failed to save.");
        return;
      }
      setGallery((prev) =>
        prev
          ? {
              ...prev,
              slug: data.slug,
              title: data.title,
              h1: data.h1,
              description: data.description,
              keywords: data.keywords || [],
            }
          : prev
      );
    } catch {
      setError("Request failed.");
    } finally {
      setSavingSeo(false);
    }
  }

  async function handleUploadImages(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !galleryId || !uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      Array.from(uploadFiles).forEach((file) => {
        formData.append("files", file, file.name);
        if (uploadAlt.trim()) {
          formData.append(`alt_${file.name}`, uploadAlt.trim());
        }
        if (uploadCaption.trim()) {
          formData.append(`caption_${file.name}`, uploadCaption.trim());
        }
      });
      const res = await fetch(`/api/admin/gallery/${galleryId}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to upload images.");
        return;
      }
      const refreshed = await fetch(`/api/admin/gallery/${galleryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const g = await refreshed.json();
      if (!refreshed.ok || g.error) {
        setError(g.error || "Failed to refresh gallery.");
      } else {
        setGallery((prev) =>
          prev
            ? {
                ...prev,
                images: (g.images || []).map((img: any) => ({
                  id: img.id,
                  src: img.src,
                  alt: img.alt,
                  caption: img.caption,
                })),
              }
            : prev
        );
        setUploadFiles(null);
        setUploadAlt("");
        setUploadCaption("");
      }
    } catch {
      setError("Request failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddFromEscort(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !galleryId) return;
    const ids = Object.keys(selectedEscortPhotoIds).filter(
      (id) => selectedEscortPhotoIds[id]
    );
    if (ids.length === 0) return;
    setAddingFromEscort(true);
    setError(null);
    try {
      const formData = new FormData();
      ids.forEach((id) => {
        formData.append("escortPhotoIds", id);
      });
      const res = await fetch(`/api/admin/gallery/${galleryId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to add images from escort.");
        return;
      }
      const refreshed = await fetch(`/api/admin/gallery/${galleryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const g = await refreshed.json();
      if (!refreshed.ok || g.error) {
        setError(g.error || "Failed to refresh gallery.");
      } else {
        setGallery((prev) =>
          prev
            ? {
                ...prev,
                images: (g.images || []).map((img: any) => ({
                  id: img.id,
                  src: img.src,
                  alt: img.alt,
                  caption: img.caption,
                })),
              }
            : prev
        );
        setSelectedEscortPhotoIds({});
      }
    } catch {
      setError("Request failed.");
    } finally {
      setAddingFromEscort(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[var(--color-silver)] font-light">
        Loading gallery…
      </div>
    );
  }

  if (!gallery || error) {
    return (
      <div>
        <Link
          href="/admin/gallery"
          className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block"
        >
          ← Galleries
        </Link>
        <div className="py-16 text-center text-[var(--color-silver)] font-light">
          {error || "Gallery not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Link
        href="/admin/gallery"
        className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block"
      >
        ← Galleries
      </Link>

      <div>
        <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-1">
          {gallery.title}
        </h1>
        <p className="text-sm text-[var(--color-silver)] mb-1">
          Slug: <span className="text-[var(--color-ivory)]">{gallery.slug}</span>
        </p>
        <Link
          href={`/gallery/${gallery.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--color-champagne)] hover:underline"
        >
          View public page ↗
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-300/90 border border-red-500/40 bg-red-900/20 px-4 py-2 rounded">
          {error}
        </p>
      )}

      <section className="grid lg:grid-cols-2 gap-10">
        <form
          onSubmit={handleSaveSeo}
          className="space-y-4 p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded"
        >
          <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-1">
            SEO settings
          </h2>
          <p className="text-xs text-[var(--color-silver)] mb-2">
            These fields control the public gallery page meta tags and headings.
          </p>
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
              rows={4}
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
              className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
            />
          </div>
          <button
            type="submit"
            disabled={savingSeo}
            className="px-4 py-2 text-xs md:text-sm font-medium border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
          >
            {savingSeo ? "Saving…" : "Save SEO"}
          </button>
        </form>

        <div className="space-y-8">
          <form
            onSubmit={handleUploadImages}
            className="space-y-3 p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded"
          >
            <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-1">
              Upload images
            </h2>
            <p className="text-xs text-[var(--color-silver)] mb-2">
              Upload one or many images directly to this gallery. Alt and caption
              will be applied to all selected files (you can override via code later
              if needed).
            </p>
            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(e.target.files)}
                className="block w-full text-xs text-[var(--color-silver)] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-medium file:bg-[var(--color-champagne)]/10 file:text-[var(--color-champagne)] file:hover:bg-[var(--color-champagne)]/20"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-silver)] mb-1">
                Alt text (applied to all)
              </label>
              <input
                value={uploadAlt}
                onChange={(e) => setUploadAlt(e.target.value)}
                placeholder="Elegant dinner date companions in Chennai"
                className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-xs rounded focus:border-[var(--color-champagne)]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-silver)] mb-1">
                Caption (optional, applied to all)
              </label>
              <input
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Chennai-based companions for upscale dinner dates."
                className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-xs rounded focus:border-[var(--color-champagne)]/50"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-xs md:text-sm font-medium border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload images"}
            </button>
          </form>

          <form
            onSubmit={handleAddFromEscort}
            className="space-y-3 p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded"
          >
            <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-1">
              Add from escort photos
            </h2>
            <p className="text-xs text-[var(--color-silver)] mb-2">
              Pick an escort and reuse their approved photos in this gallery.
            </p>
            <div>
              <label className="block text-xs text-[var(--color-silver)] mb-1">
                Escort
              </label>
              <select
                value={selectedEscortId}
                onChange={(e) => setSelectedEscortId(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-xs rounded focus:border-[var(--color-champagne)]/50"
              >
                <option value="">
                  {loadingEscorts ? "Loading escorts…" : "Select escort"}
                </option>
                {escorts.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.aliasName} — {e.user.email || "no email"}
                  </option>
                ))}
              </select>
            </div>
            {selectedEscort && (
              <p className="text-[10px] text-[var(--color-silver)] mb-1">
                Showing approved photos for {selectedEscort.aliasName}.
              </p>
            )}
            {loadingPhotos ? (
              <p className="text-xs text-[var(--color-silver)]">Loading photos…</p>
            ) : escortPhotos.length === 0 && selectedEscortId ? (
              <p className="text-xs text-[var(--color-silver)]">
                No approved photos for this escort.
              </p>
            ) : (
              escortPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 max-h-72 overflow-auto py-1">
                  {escortPhotos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSelectedEscortPhotoIds((prev) => ({
                          ...prev,
                          [p.id]: !prev[p.id],
                        }))
                      }
                      className={`relative border ${
                        selectedEscortPhotoIds[p.id]
                          ? "border-[var(--color-champagne)]"
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      <div className="relative w-full aspect-[4/5] bg-[var(--color-obsidian)] overflow-hidden">
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
            <button
              type="submit"
              disabled={addingFromEscort || !Object.values(selectedEscortPhotoIds).some(Boolean)}
              className="px-4 py-2 text-xs md:text-sm font-medium border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
            >
              {addingFromEscort ? "Adding…" : "Add selected photos"}
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">
          Gallery images ({gallery.images.length})
        </h2>
        {gallery.images.length === 0 ? (
          <p className="text-sm text-[var(--color-silver)]">
            No images yet. Upload or attach some above.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.images.map((img) => (
              <div
                key={img.id}
                className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded-sm overflow-hidden"
              >
                <div className="relative w-full aspect-[4/3] bg-[var(--color-obsidian)] overflow-hidden">
                  <img
                    src={img.src}
                    alt={img.alt || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs text-[var(--color-ivory)] line-clamp-2">
                    {img.alt}
                  </p>
                  {img.caption && (
                    <p className="text-[10px] text-[var(--color-silver)] mt-1 line-clamp-2">
                      {img.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

