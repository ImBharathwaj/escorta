"use client";

import dynamic from "next/dynamic";

const GoLiveContent = dynamic(() => import("./_components/GoLiveContent"), {
  ssr: false,
  loading: () => (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <p className="text-[var(--color-silver)]">Loading…</p>
    </div>
  ),
});

export default function GoLivePage() {
  return <GoLiveContent />;
}
