"use client";

import Link from "next/link";
import { IconCompanions } from "@/components/icons/NavIcons";

export function CompanionsLink() {
  return (
    <Link
      href="/companions"
      title="Companions"
      className="p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition rounded-sm"
      aria-label="Companions"
    >
      <IconCompanions />
    </Link>
  );
}
