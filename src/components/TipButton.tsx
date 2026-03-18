"use client";

import { useState, useEffect } from "react";
import { TIP_MIN_CREDITS, TIP_MAX_CREDITS } from "@/lib/credits";

type TipContext = "booking" | "sexter_session" | "live_session" | "video_call";

type TipButtonProps = {
  context: TipContext;
  referenceId: string;
  recipientName?: string;
  token: string | null;
  onSuccess?: () => void;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

const TIP_SUCCESS_DURATION_MS = 1400;

export function TipButton({
  context,
  referenceId,
  recipientName = "Companion",
  token,
  onSuccess,
  className = "",
  disabled = false,
  children,
}: TipButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(TIP_MIN_CREDITS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tipSuccess, setTipSuccess] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);

  const presetAmounts = [
    TIP_MIN_CREDITS,
    Math.min(TIP_MAX_CREDITS, TIP_MIN_CREDITS * 3),
    Math.min(TIP_MAX_CREDITS, TIP_MIN_CREDITS * 5),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  useEffect(() => {
    if (!tipSuccess) return;
    const t = setTimeout(() => {
      setShowModal(false);
      setTipSuccess(false);
      setAmount(TIP_MIN_CREDITS);
      setSentAmount(0);
      onSuccess?.();
    }, TIP_SUCCESS_DURATION_MS);
    return () => clearTimeout(t);
  }, [tipSuccess, onSuccess]);

  const sendTip = async (value: number) => {
    if (!token || submitting) return;
    if (value < TIP_MIN_CREDITS || value > TIP_MAX_CREDITS) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: value, context, referenceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSentAmount(value);
        setTipSuccess(true);
      } else {
        setError(data.error || "Failed to send tip");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!referenceId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className={className || "px-3 py-1.5 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"}
      >
        {children ?? "Tip"}
      </button>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !submitting && !tipSuccess && setShowModal(false)}
        >
          <div
            className="bg-[var(--color-charcoal)] border border-[var(--color-border)] rounded-lg p-6 max-w-sm w-full shadow-xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {tipSuccess ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div
                  className="w-16 h-16 rounded-full bg-[var(--color-champagne)]/20 border-2 border-[var(--color-champagne)] flex items-center justify-center mb-4 animate-tip-success-pop"
                  aria-hidden
                >
                  <svg className="w-8 h-8 text-[var(--color-champagne)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl font-light text-[var(--color-ivory)] animate-tip-success-fade">Sent!</p>
                <p className="text-sm text-[var(--color-champagne)] mt-1 animate-tip-success-fade">
                  {sentAmount} credit{sentAmount !== 1 ? "s" : ""} to {recipientName}
                </p>
                <p className="text-xs text-[var(--color-silver)] mt-3 animate-tip-success-fade">Thank you</p>
              </div>
            ) : (
              <>
                {/* <h3 className="text-lg font-light text-[var(--color-ivory)] mb-4">Send a tip</h3> */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {presetAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={submitting}
                        onClick={() => void sendTip(value)}
                        className="px-4 py-2 text-sm rounded-full border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  {error && <p className="text-red-300/90 text-sm">{error}</p>}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
                      disabled={submitting}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
