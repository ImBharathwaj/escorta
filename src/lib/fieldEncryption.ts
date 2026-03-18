import crypto from "crypto";

// Optional at-rest encryption for sensitive free-text fields.
// If FIELD_ENCRYPTION_KEY is missing/invalid, we fall back to plaintext storage.
//
// Format: v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>

const PREFIX = "v1";

function getKey(): Buffer | null {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
}

export function encryptOptional(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptOptional(value: string | null): string | null {
  if (!value) return value;
  if (!value.startsWith(PREFIX + ":")) return value;

  const key = getKey();
  if (!key) return value; // can't decrypt without key; treat as opaque

  const parts = value.split(":");
  if (parts.length !== 4) return value;
  const [, ivB64, tagB64, ctB64] = parts;

  try {
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const ct = Buffer.from(ctB64, "base64url");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    return plaintext;
  } catch {
    return value;
  }
}

