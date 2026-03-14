"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "escorta_age_verified";

export function AgeGate() {
  const [show, setShow] = useState(false);
  const [age, setAge] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const verified = localStorage.getItem(STORAGE_KEY);
    if (verified !== "true") {
      setShow(true);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = parseInt(age, 10);
    if (isNaN(num) || num < 1 || num > 120) {
      setError("Please enter a valid age.");
      return;
    }
    if (num < 18) {
      window.location.href = "https://www.google.com";
      return;
    }
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-obsidian)]/98 p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2 tracking-wide">
          Age verification
        </h1>
        <p className="text-[var(--color-silver)] font-light mb-8 text-sm">
          You must be 18 or older to enter this site.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-300/90 text-sm">{error}</p>
          )}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              How old are you?
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              min={1}
              max={120}
              required
              autoFocus
              className="w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
