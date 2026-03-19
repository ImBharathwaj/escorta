"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Turkish",
];

const MEETUP_TYPES = [
  "Dinner", "GFE", "Massage", "Travel", "Roleplay", "Fetish",
  "Overnight", "Event", "Private Show", "Striptease", "Couples",
];

const steps = ["Welcome", "Preferences", "How it works"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, authReady, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [meetupTypes, setMeetupTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!authReady) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)]">
        Loading…
      </div>
    );
  }

  if (!token || user?.role !== "client") {
    router.push("/login");
    return null;
  }

  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await fetch("/api/users/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ city, languages, meetupTypes }),
      });
      await refreshUser();
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition ${
                  i <= step
                    ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/10 text-[var(--color-champagne)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-px ${i < step ? "bg-[var(--color-champagne)]/50" : "bg-[var(--color-border)]"}`} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
              Welcome
            </p>
            <h1 className="text-2xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
              Welcome to Escorta
            </h1>
            <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed mb-8">
              Let&apos;s set up your preferences so we can show you the best companions
              for your interests. This only takes a minute.
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
            >
              Get started
            </button>
            <button
              onClick={finish}
              className="w-full mt-3 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-silver)] transition"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
              Your preferences
            </p>
            <h2 className="text-xl font-light text-[var(--color-ivory)] tracking-wide mb-6">
              Tell us what you&apos;re looking for
            </h2>

            <div className="mb-6">
              <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2">
                Preferred city
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. London, New York, Paris"
                className="w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2">
                Languages you speak
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleItem(languages, setLanguages, lang)}
                    className={`px-3 py-1.5 text-xs border transition rounded-sm ${
                      languages.includes(lang)
                        ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/10 text-[var(--color-champagne)]"
                        : "border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-silver)]/50"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2">
                Interested in
              </label>
              <div className="flex flex-wrap gap-2">
                {MEETUP_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleItem(meetupTypes, setMeetupTypes, type)}
                    className={`px-3 py-1.5 text-xs border transition rounded-sm ${
                      meetupTypes.includes(type)
                        ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/10 text-[var(--color-champagne)]"
                        : "border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-silver)]/50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-3 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
              How it works
            </p>
            <h2 className="text-xl font-light text-[var(--color-ivory)] tracking-wide mb-6">
              Getting started
            </h2>

            <div className="space-y-5 mb-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-[var(--color-champagne)] flex items-center justify-center text-[var(--color-champagne)] text-xs font-medium flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-[var(--color-ivory)] font-light">Credits</p>
                  <p className="text-xs text-[var(--color-silver)] mt-1">
                    You start with 10 free credits. Use them to connect with companions, start video calls, tip during live streams, and send Sexter messages.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-[var(--color-champagne)] flex items-center justify-center text-[var(--color-champagne)] text-xs font-medium flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-[var(--color-ivory)] font-light">Connections</p>
                  <p className="text-xs text-[var(--color-silver)] mt-1">
                    Browse companions and send a connection request. Once they accept, you can chat with them privately and start video calls.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-[var(--color-champagne)] flex items-center justify-center text-[var(--color-champagne)] text-xs font-medium flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-[var(--color-ivory)] font-light">Live streams</p>
                  <p className="text-xs text-[var(--color-silver)] mt-1">
                    Watch companions go live. Join a stream, tip them, and chat with other viewers in real time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-[var(--color-champagne)] flex items-center justify-center text-[var(--color-champagne)] text-xs font-medium flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-[var(--color-ivory)] font-light">Gallery</p>
                  <p className="text-xs text-[var(--color-silver)] mt-1">
                    Explore curated photo galleries to discover companions and their world.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
              >
                Back
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Go to dashboard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
