/**
 * Send email via Resend (https://resend.com). Set RESEND_API_KEY and optionally
 * APP_URL (e.g. https://yourapp.com) and EMAIL_FROM (e.g. "Escorta <noreply@yourapp.com>").
 * If RESEND_API_KEY is not set, logs the link in development and returns success.
 */

const RESEND_API = "https://api.resend.com/emails";

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM || "Escorta <onboarding@resend.dev>";
  const subject = "Verify your email";
  const html = `
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}" style="color:#c9a227;">Verify email</a></p>
    <p>Or copy this link: ${verifyUrl}</p>
    <p>This link expires in 24 hours.</p>
  `;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[Email] Verification link (RESEND_API_KEY not set):", verifyUrl);
    }
    return true;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend error:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Email] Send failed:", e);
    return false;
  }
}
