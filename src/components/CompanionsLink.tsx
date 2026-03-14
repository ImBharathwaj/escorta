"use client";

import Link from "next/link";

export function CompanionsLink() {
  return (
    <Link
      href="/companions"
      className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
    >
      Companions
    </Link>
  );
}
