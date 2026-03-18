/**
 * Client-side analytics helper. Works with Plausible (default) or any
 * provider that exposes a global event function.
 *
 * Set NEXT_PUBLIC_ANALYTICS_PROVIDER="plausible" and
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN="yourdomain.com" in env.
 *
 * For self-hosted Plausible, also set NEXT_PUBLIC_PLAUSIBLE_HOST.
 */

type EventProps = Record<string, string | number | boolean>;

export function trackEvent(name: string, props?: EventProps) {
  if (typeof window === "undefined") return;

  // Plausible
  const plausible = (window as unknown as { plausible?: (name: string, opts?: { props?: EventProps }) => void }).plausible;
  if (plausible) {
    plausible(name, props ? { props } : undefined);
    return;
  }

  // PostHog fallback
  const posthog = (window as unknown as { posthog?: { capture: (name: string, props?: EventProps) => void } }).posthog;
  if (posthog) {
    posthog.capture(name, props);
    return;
  }

  // Google Analytics fallback
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (gtag) {
    gtag("event", name, props);
  }
}
