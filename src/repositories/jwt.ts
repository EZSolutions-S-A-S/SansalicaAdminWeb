/**
 * Cheap local JWT expiry check — no signature verification.
 *
 * Django re-validates the token's signature and `is_staff` on every real
 * data request, so this is only used as a fast UX gate in middleware to
 * avoid a network round-trip on every navigation, not as the security
 * boundary.
 */
export function decodeJwtExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 5): boolean {
  const exp = decodeJwtExpiry(token);
  if (exp === null) return true;
  return Date.now() / 1000 >= exp - skewSeconds;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  // atob is available globally in Node 18+ (Astro's minimum) — avoids
  // pulling in @types/node just for this one decode.
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
