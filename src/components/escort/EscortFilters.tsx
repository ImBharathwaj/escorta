"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function EscortFiltersForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams();
    ["city", "gender", "verifiedFemale", "minAge", "maxAge", "service"].forEach((k) => {
      const v = formData.get(k) as string;
      if (v) params.set(k, v);
    });
    router.push(`/companions?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap gap-3"
    >
      <input
        type="text"
        name="city"
        placeholder="City"
        defaultValue={searchParams.get("city") || ""}
        className="px-4 py-2.5 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm w-28 focus:border-[var(--color-champagne)]/50 transition rounded-sm"
      />
      <select
        name="gender"
        defaultValue={searchParams.get("gender") || ""}
        className="px-4 py-2.5 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm w-28 focus:border-[var(--color-champagne)]/50 transition rounded-sm"
      >
        <option value="">Gender</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="non-binary">Non-binary</option>
        <option value="other">Other</option>
      </select>
      <label className="flex items-center gap-2 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-silver)] text-sm cursor-pointer hover:border-[var(--color-champagne)]/50 transition rounded-sm">
        <input
          type="checkbox"
          name="verifiedFemale"
          value="1"
          defaultChecked={searchParams.get("verifiedFemale") === "1"}
          className="accent-[var(--color-champagne)]"
        />
        Verified female only
      </label>
      <input
        type="number"
        name="minAge"
        placeholder="Age from"
        defaultValue={searchParams.get("minAge") || ""}
        className="px-4 py-2.5 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm w-24 focus:border-[var(--color-champagne)]/50 transition rounded-sm"
      />
      <input
        type="number"
        name="maxAge"
        placeholder="to"
        defaultValue={searchParams.get("maxAge") || ""}
        className="px-4 py-2.5 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm w-20 focus:border-[var(--color-champagne)]/50 transition rounded-sm"
      />
      <input
        type="text"
        name="service"
        placeholder="Meetup type"
        defaultValue={searchParams.get("service") || ""}
        className="px-4 py-2.5 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm w-36 focus:border-[var(--color-champagne)]/50 transition rounded-sm"
      />
      <button
        type="submit"
        className="px-5 py-2.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition rounded-sm"
      >
        Apply
      </button>
    </form>
  );
}

export default function EscortFilters() {
  return (
    <Suspense fallback={<div className="h-12 w-full max-w-md bg-[var(--color-charcoal)] animate-pulse" />}>
      <EscortFiltersForm />
    </Suspense>
  );
}
