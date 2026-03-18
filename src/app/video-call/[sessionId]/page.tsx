"use client";

import dynamic from "next/dynamic";

const VideoCallContent = dynamic(
  () => import("./_components/VideoCallContent"),
  {
    ssr: false,
    loading: () => (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-silver)]">Loading call…</p>
      </div>
    ),
  }
);

export default function VideoCallPage() {
  return <VideoCallContent />;
}
