/**
 * Send email via Resend (https://resend.com). Set RESEND_API_KEY and optionally
 * APP_URL (e.g. https://yourapp.com) and EMAIL_FROM (e.g. "Escorta <noreply@yourapp.com>").
 * If RESEND_API_KEY is not set, logs the link in development and returns success.
 */

const RESEND_API = "https://api.resend.com/emails";

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const from = process.env.EMAIL_FROM || "Escorta <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[Email] (RESEND_API_KEY not set)", opts.subject, "to:", opts.to);
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
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
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

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  const subject = "Verify your email";
  const html = `
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}" style="color:#c9a227;">Verify email</a></p>
    <p>Or copy this link: ${verifyUrl}</p>
    <p>This link expires in 24 hours.</p>
  `;
  return await sendEmail({ to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const subject = "Reset your password";
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}" style="color:#c9a227;">Reset password</a></p>
    <p>Or copy this link: ${resetUrl}</p>
    <p>If you didn’t request this, you can ignore this email.</p>
    <p>This link expires soon.</p>
  `;
  return await sendEmail({ to, subject, html });
}

export async function sendSupportEmail(opts: {
  fromEmail?: string;
  category?: string;
  message: string;
  userId?: string;
  userRole?: string;
}): Promise<boolean> {
  const to = process.env.SUPPORT_EMAIL_TO || process.env.EMAIL_FROM || "Escorta <onboarding@resend.dev>";
  const subject = `Support request${opts.category ? ` • ${opts.category}` : ""}`;
  const html = `
    <p><strong>From:</strong> ${opts.fromEmail || "unknown"}</p>
    <p><strong>User:</strong> ${opts.userId || "unknown"} (${opts.userRole || "unknown"})</p>
    <p><strong>Category:</strong> ${opts.category || "general"}</p>
    <hr />
    <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;">${opts.message}</pre>
  `;
  // If SUPPORT_EMAIL_TO is not configured, we still send to EMAIL_FROM as a fallback.
  const recipient = to.includes("<") ? to.match(/<([^>]+)>/)?.[1] || to : to;
  return await sendEmail({ to: recipient, subject, html });
}
