"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type AdminNote = {
  id: string;
  targetUserId: string;
  targetType: string;
  targetRefId: string | null;
  content: string;
  createdAt: string;
  author: { displayName: string | null; email: string | null };
  targetUser: {
    displayName: string | null;
    email: string | null;
    role: string;
  };
};

const TARGET_TYPES = [
  { value: "user", label: "User" },
  { value: "booking", label: "Booking" },
  { value: "video_call", label: "Video call" },
  { value: "live_session", label: "Live session" },
  { value: "sexter_session", label: "Sexter session" },
];

export default function AdminNotesPage() {
  const { token } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState("");

  const [newTargetUserId, setNewTargetUserId] = useState("");
  const [newTargetType, setNewTargetType] = useState("user");
  const [newTargetRefId, setNewTargetRefId] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchNotes = useCallback(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterUserId.trim()) params.set("userId", filterUserId.trim());
    fetch(`/api/admin/notes?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setNotes(data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [token, filterUserId]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const t = setTimeout(fetchNotes, 300);
    return () => clearTimeout(t);
  }, [token, fetchNotes]);

  async function addNote() {
    if (!token) return;
    setError("");
    if (!newTargetUserId.trim()) {
      setError("User ID is required");
      return;
    }
    if (!newContent.trim()) {
      setError("Note content is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: newTargetUserId.trim(),
          targetType: newTargetType,
          targetRefId: newTargetRefId.trim() || null,
          content: newContent.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to add note");
        return;
      }
      setNewTargetUserId("");
      setNewTargetRefId("");
      setNewContent("");
      fetchNotes();
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!token || !confirm("Delete this note?")) return;
    await fetch(`/api/admin/notes/${noteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
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
        Internal notes
      </h1>
      <p className="text-sm text-[var(--color-silver)] mb-8">
        Add private notes on users and sessions. Only visible to admins.
      </p>

      {/* Add note form */}
      <div className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)] mb-8">
        <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-4">
          Add note
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            value={newTargetUserId}
            onChange={(e) => setNewTargetUserId(e.target.value)}
            placeholder="User ID"
            className="px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded"
          />
          <select
            value={newTargetType}
            onChange={(e) => setNewTargetType(e.target.value)}
            className="px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded"
          >
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTargetRefId}
            onChange={(e) => setNewTargetRefId(e.target.value)}
            placeholder="Session/Booking ID (optional)"
            className="px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded"
          />
        </div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Note content..."
          rows={3}
          className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded resize-y mb-4"
        />
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}
        <button
          onClick={addNote}
          disabled={saving}
          className="px-6 py-2 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add note"}
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          placeholder="Filter by User ID..."
          className="px-3 py-2 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded min-w-[250px]"
        />
        <button
          onClick={() => {
            setLoading(true);
            fetchNotes();
          }}
          className="px-3 py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-charcoal)] rounded"
        >
          Search
        </button>
      </div>

      {/* Notes list */}
      {loading && (
        <p className="text-[var(--color-silver)] text-sm">Loading...</p>
      )}
      {!loading && notes.length === 0 && (
        <p className="text-[var(--color-silver)] text-sm">No notes found.</p>
      )}
      {!loading && notes.length > 0 && (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 border border-[var(--color-border)] text-[var(--color-silver)] uppercase tracking-wider">
                      {n.targetType.replace("_", " ")}
                    </span>
                    {n.targetRefId && (
                      <span className="text-xs text-[var(--color-muted)] font-mono truncate max-w-[200px]">
                        {n.targetRefId}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--color-ivory)] text-sm font-light whitespace-pre-wrap">
                    {n.content}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-2">
                    By{" "}
                    <span className="text-[var(--color-silver)]">
                      {n.author.displayName || n.author.email || "Admin"}
                    </span>{" "}
                    about{" "}
                    <span className="text-[var(--color-silver)]">
                      {n.targetUser.displayName ||
                        n.targetUser.email ||
                        n.targetUserId}
                    </span>{" "}
                    ({n.targetUser.role}) ·{" "}
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="text-xs text-red-400/70 hover:text-red-400 transition shrink-0"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
