"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const inputStyles =
  "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition";

// Service options from docs/services.txt – always shown so the list is visible regardless of DB seed
const ADULT_SERVICE_LIST = [
  "Dinner",
  "GFE",
  "PSE",
  "Massage",
  "Lap Dance",
  "Roleplay",
  "Fetish",
  "Overnight",
  "Travel",
  "Grooming",
  "Private Show",
  "Event",
  "Phone",
  "Erotic Photo",
  "Striptease",
  "Intimacy",
  "Kissing",
  "Sex",
  "BDSM",
  "Spanking",
  "Tantric",
  "Couples",
  "Threesome",
  "Girl on Girl",
];

type EscortProfile = {
  id: string;
  aliasName: string;
  age: number | null;
  city: string | null;
  country: string | null;
  description: string | null;
  pricePerHour: number | null;
  photos: { id: string; imageUrl: string; isPrimary: boolean }[];
};

type UserProfile = {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarSignedUrl?: string | null;
  orientation?: string | null;
  preferencesNotes?: string | null;
  preferredServices?: string[];
};

const ORIENTATION_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "straight", label: "Straight" },
  { value: "gay", label: "Gay" },
  { value: "lesbian", label: "Lesbian" },
  { value: "bisexual", label: "Bisexual" },
  { value: "pansexual", label: "Pansexual" },
  { value: "other", label: "Other" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, setUser, authReady, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EscortProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [aliasName, setAliasName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");
  const [selectedAdultServices, setSelectedAdultServices] = useState<string[]>([]);
  const [customServiceInput, setCustomServiceInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orientation, setOrientation] = useState("");
  const [preferencesNotes, setPreferencesNotes] = useState("");
  const [selectedPreferredServices, setSelectedPreferredServices] = useState<string[]>([]);
  const [customPreferredInput, setCustomPreferredInput] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoSettingPrimaryId, setPhotoSettingPrimaryId] = useState<string | null>(null);
  const [photoDeletingId, setPhotoDeletingId] = useState<string | null>(null);
  const [photoDeleteConfirmId, setPhotoDeleteConfirmId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/dashboard/profile");
      return;
    }
    if (user?.role === "client") {
      fetchUserProfile();
    } else if (user?.role === "escort") {
      fetchEscortProfile();
    } else if (user != null) {
      setLoading(false);
    }
  }, [token, user, authReady, router]);

  useEffect(() => {
    if (!loading && user?.role !== "client" && user?.role !== "escort") {
      router.push("/dashboard");
    }
  }, [loading, user?.role, router]);

  async function fetchUserProfile(): Promise<UserProfile | null> {
    if (!token) return null;
    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        setDisplayName(data.displayName || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setOrientation(data.orientation || "");
        setPreferencesNotes(data.preferencesNotes || "");
        setSelectedPreferredServices(Array.isArray(data.preferredServices) ? data.preferredServices : []);
        return data;
      }
    } catch {
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function fetchEscortProfile() {
    if (!token) return;
    try {
      const profileRes = await fetch("/api/escorts/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setAliasName(data.aliasName || "");
        setAge(data.age?.toString() || "");
        setGender(data.gender || "");
        setCity(data.city || "");
        setCountry(data.country || "");
        setDescription(data.description || "");
        setServices(Array.isArray(data.services) ? data.services.join(", ") : "");
        setSelectedAdultServices(Array.isArray(data.adultServices) ? data.adultServices : []);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          orientation: orientation.trim() || undefined,
          preferences_notes: preferencesNotes.trim() || undefined,
          preferred_services: selectedPreferredServices,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      setUserProfile(data);
      if (user) setUser({ ...user, displayName: data.displayName, email: data.email, phone: data.phone, avatarUrl: data.avatarUrl });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      const updated = await fetchUserProfile();
      if (user && updated) setUser({ ...user, avatarUrl: updated.avatarUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleEscortSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSaving(true);
    try {
      const url = profile
        ? `/api/escorts/${profile.id}`
        : "/api/escorts";
      const method = profile ? "PATCH" : "POST";
      const servicesList = services ? services.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const body = profile
        ? {
            alias_name: aliasName || undefined,
            age: age ? parseInt(age) : undefined,
            gender: gender || undefined,
            city: city || undefined,
            country: country || undefined,
            description: description || undefined,
            services: servicesList,
            adult_services: selectedAdultServices,
          }
        : {
            alias_name: aliasName || undefined,
            age: age ? parseInt(age) : undefined,
            gender: gender || undefined,
            city: city || undefined,
            country: country || undefined,
            description: description || undefined,
            services: servicesList,
            adult_services: selectedAdultServices,
          };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      await fetchEscortProfile();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!token || user?.role !== "client") return;
    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete account");
        return;
      }
      logout();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("escorta_chat_seen");
        window.location.href = "/?deleted=1";
        return;
      }
      router.push("/?deleted=1");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !profile || !token) return;
    setPhotoError("");
    setPhotoUploading(true);
    const total = files.length;
    const existingCount = profile.photos?.length ?? 0;
    const isFirstBatch = existingCount === 0;
    try {
      for (let i = 0; i < total; i++) {
        setPhotoUploadProgress(total > 1 ? `Uploading ${i + 1} of ${total}...` : "Uploading...");
        const formData = new FormData();
        formData.append("photo", files[i]);
        formData.append("is_primary", isFirstBatch && i === 0 ? "true" : "false");

        const res = await fetch(`/api/escorts/${profile.id}/photos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }
      }
      await fetchEscortProfile();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
      setPhotoUploadProgress(null);
      e.target.value = "";
    }
  }

  async function handleSetPrimary(photoId: string) {
    if (!profile || !token) return;
    setPhotoError("");
    setPhotoSettingPrimaryId(photoId);
    try {
      const res = await fetch(`/api/escorts/${profile.id}/photos/${photoId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to set primary");
      }
      await fetchEscortProfile();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to set primary");
    } finally {
      setPhotoSettingPrimaryId(null);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!profile || !token) return;
    setPhotoError("");
    setPhotoDeletingId(photoId);
    setPhotoDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/escorts/${profile.id}/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete photo");
      }
      await fetchEscortProfile();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setPhotoDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)] font-light">
        Loading...
      </div>
    );
  }

  if (user?.role !== "client" && user?.role !== "escort") {
    return null;
  }

  const isClient = user?.role === "client";

  return (
    <div className="pt-24 min-h-screen">
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-[var(--color-champagne)] text-[var(--color-obsidian)] text-sm font-medium tracking-wide shadow-lg animate-fade-in-up">
          Profile updated
        </div>
      )}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/dashboard"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-10 transition"
        >
          ← Dashboard
        </Link>
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
          {isClient ? "Your profile" : "Companion profile"}
        </p>
        <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-12">
          {isClient ? "Account settings" : profile ? "Edit your profile" : "Create your profile"}
        </h1>

        {isClient ? (
          <>
            <div className="mb-12 pb-12 border-b border-[var(--color-border)]">
              <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-silver)] mb-4 font-normal">
                Profile photo
              </h2>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex items-center justify-center">
                  {userProfile?.avatarSignedUrl ? (
                    <img
                      src={userProfile.avatarSignedUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <span className="text-3xl text-[var(--color-muted)]">—</span>
                  )}
                </div>
                <label className="px-4 py-2 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                    className="hidden"
                  />
                  {avatarUploading ? "Uploading..." : "Change photo"}
                </label>
              </div>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you'd like to be called"
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputStyles}
                />
              </div>

              <div className="pt-6 border-t border-[var(--color-border)]">
                <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-silver)] mb-4 font-normal">
                  Preferences
                </h2>
                <p className="text-xs text-[var(--color-muted)] mb-4">
                  Help us suggest the right companions. Used for matching and suggestions only.
                </p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className={inputStyles}
                    >
                      {ORIENTATION_OPTIONS.map((opt) => (
                        <option key={opt.value || "none"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                      Services I&apos;m interested in
                    </label>
                    <p className="text-xs text-[var(--color-muted)] mb-3">
                      Select the types of arrangements or services you&apos;re looking for. We&apos;ll use this to suggest compatible companions.
                    </p>
                    {selectedPreferredServices.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedPreferredServices.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-light text-[var(--color-ivory)] border border-[var(--color-border)] rounded-sm bg-[var(--color-charcoal)]"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => setSelectedPreferredServices((prev) => prev.filter((n) => n !== name))}
                              className="text-[var(--color-silver)] hover:text-[var(--color-champagne)] transition"
                              aria-label={`Remove ${name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {ADULT_SERVICE_LIST.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPreferredServices.includes(name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPreferredServices((prev) => [...prev, name]);
                              } else {
                                setSelectedPreferredServices((prev) => prev.filter((n) => n !== name));
                              }
                            }}
                            className="w-4 h-4 rounded border border-[var(--color-border)] bg-[var(--color-charcoal)] text-[var(--color-champagne)] focus:ring-[var(--color-champagne)]/50"
                          />
                          <span className="text-sm text-[var(--color-ivory)] group-hover:text-[var(--color-champagne)] transition">
                            {name}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPreferredInput}
                        onChange={(e) => setCustomPreferredInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const value = customPreferredInput.trim();
                            if (value && !selectedPreferredServices.includes(value)) {
                              setSelectedPreferredServices((prev) => [...prev, value]);
                              setCustomPreferredInput("");
                            }
                          }
                        }}
                        placeholder="Add another (type and press Enter)"
                        className={inputStyles}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const value = customPreferredInput.trim();
                          if (value && !selectedPreferredServices.includes(value)) {
                            setSelectedPreferredServices((prev) => [...prev, value]);
                            setCustomPreferredInput("");
                          }
                        }}
                        className="px-4 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                      Other preferences
                    </label>
                    <textarea
                      value={preferencesNotes}
                      onChange={(e) => setPreferencesNotes(e.target.value)}
                      rows={3}
                      placeholder="e.g. preferred age range, locations, occasions"
                      className={`${inputStyles} resize-none`}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>

            <div className="mt-16 pt-12 border-t border-[var(--color-border)]">
              <h2 className="text-sm font-light text-[var(--color-silver)] mb-1">Delete account</h2>
              <p className="text-xs text-[var(--color-muted)] mb-3">
                Permanently delete your account. You will not be able to sign in again. Your email may be retained for our records.
              </p>
              <button
                type="button"
                onClick={() => { setDeleteError(""); setShowDeleteConfirm(true); }}
                className="text-sm tracking-widest uppercase text-red-300 hover:text-red-200 transition"
              >
                Delete my account
              </button>
            </div>
          </>
        ) : (
          <>
            {profile && (
              <div className="mb-12 pb-12 border-b border-[var(--color-border)]">
                <h2 className="text-sm tracking-[0.2em] uppercase text-[var(--color-silver)] mb-4 font-normal">
                  Photos
                </h2>
                <p className="text-xs text-[var(--color-muted)] mb-4">
                  Click &quot;Set as primary&quot; to choose the main profile image. You can delete any photo.
                </p>
                <div className="flex flex-wrap gap-4">
                  {(profile.photos ?? []).map((p) => (
                    <div key={p.id} className="relative group" onContextMenu={(e) => e.preventDefault()}>
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="w-24 h-24 object-cover border border-[var(--color-border)]"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      {p.isPrimary && (
                        <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-[var(--color-champagne)] text-[var(--color-obsidian)]">
                          Primary
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 p-1">
                        {!p.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(p.id)}
                            disabled={!!photoSettingPrimaryId || !!photoDeletingId}
                            className="w-full py-1.5 text-[10px] tracking-wider uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
                          >
                            {photoSettingPrimaryId === p.id ? "…" : "Set as primary"}
                          </button>
                        )}
                        {photoDeleteConfirmId === p.id ? (
                          <div className="flex gap-1 w-full">
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(p.id)}
                              disabled={!!photoDeletingId}
                              className="flex-1 py-1 text-[10px] uppercase bg-red-600/90 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {photoDeletingId === p.id ? "…" : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotoDeleteConfirmId(null)}
                              className="flex-1 py-1 text-[10px] uppercase border border-[var(--color-silver)] text-[var(--color-silver)] hover:bg-white/10"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPhotoDeleteConfirmId(p.id)}
                            disabled={!!photoDeletingId || !!photoSettingPrimaryId}
                            className="w-full py-1.5 text-[10px] tracking-wider uppercase border border-red-400/80 text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <label className="w-24 h-24 flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] cursor-pointer hover:border-[var(--color-champagne)]/50 transition">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      disabled={photoUploading}
                      className="hidden"
                    />
                    {photoUploading ? (
                      <span className="text-xs text-[var(--color-silver)] text-center px-1">
                        {photoUploadProgress ?? "Uploading..."}
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl text-[var(--color-muted)]">+</span>
                        <span className="text-[10px] text-[var(--color-silver)] mt-1 text-center px-1">Add photos</span>
                      </>
                    )}
                  </label>
                </div>
                {photoError && (
                  <p className="mt-2 text-sm text-red-300/90">{photoError}</p>
                )}
              </div>
            )}

            <form onSubmit={handleEscortSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Display name *
                </label>
                <input
                  type="text"
                  value={aliasName}
                  onChange={(e) => setAliasName(e.target.value)}
                  required
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={18}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputStyles}
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Used for client search. Platform may verify this.
                </p>
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  About you
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`${inputStyles} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Meetup types (comma-separated)
                </label>
                <input
                  type="text"
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="Dinner date, Travel companion, Party companion"
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
                  Services I offer
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  Select from the list below and optionally add your own. Clients will see these on your profile.
                </p>
                {selectedAdultServices.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedAdultServices.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-light text-[var(--color-ivory)] border border-[var(--color-border)] rounded-sm bg-[var(--color-charcoal)]"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setSelectedAdultServices((prev) => prev.filter((n) => n !== name))}
                          className="text-[var(--color-silver)] hover:text-[var(--color-champagne)] transition"
                          aria-label={`Remove ${name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mb-4">
                  {ADULT_SERVICE_LIST.map((name) => (
                    <label
                      key={name}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAdultServices.includes(name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAdultServices((prev) => [...prev, name]);
                          } else {
                            setSelectedAdultServices((prev) => prev.filter((n) => n !== name));
                          }
                        }}
                        className="w-4 h-4 rounded border border-[var(--color-border)] bg-[var(--color-charcoal)] text-[var(--color-champagne)] focus:ring-[var(--color-champagne)]/50"
                      />
                      <span className="text-sm text-[var(--color-ivory)] group-hover:text-[var(--color-champagne)] transition">
                        {name}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customServiceInput}
                    onChange={(e) => setCustomServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = customServiceInput.trim();
                        if (value && !selectedAdultServices.includes(value)) {
                          setSelectedAdultServices((prev) => [...prev, value]);
                          setCustomServiceInput("");
                        }
                      }
                    }}
                    placeholder="Add another (type and press Enter)"
                    className={inputStyles}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = customServiceInput.trim();
                      if (value && !selectedAdultServices.includes(value)) {
                        setSelectedAdultServices((prev) => [...prev, value]);
                        setCustomServiceInput("");
                      }
                    }}
                    className="px-4 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
              >
                {saving ? "Saving..." : profile ? "Save changes" : "Create profile"}
              </button>
            </form>
          </>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[var(--color-charcoal)] border border-[var(--color-border)] rounded-sm p-6 max-w-md w-full">
              <h3 className="text-lg font-light text-[var(--color-ivory)] mb-2">Delete account?</h3>
              <p className="text-sm text-[var(--color-silver)] font-light mb-4">
                This cannot be undone. You will be signed out and will not be able to log in with this account again.
              </p>
              {deleteError && (
                <p className="text-sm text-red-300 mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-obsidian)] transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 text-sm bg-red-600/80 text-white hover:bg-red-600 transition disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
