import type { AstroCookies } from 'astro';
import { djangoRequest } from './djangoClient';
import type { Tokens } from '@/types/auth';

const ACCESS_COOKIE = 'sa_access';
const REFRESH_COOKIE = 'sa_refresh';
const USER_NAME_COOKIE = 'sa_user_name';

// Mirrors the backend's SIMPLE_JWT lifetimes (access: 15 min, refresh: 7 days).
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function getTokens(cookies: AstroCookies): { access: string | null; refresh: string | null } {
  return {
    access: cookies.get(ACCESS_COOKIE)?.value ?? null,
    refresh: cookies.get(REFRESH_COOKIE)?.value ?? null,
  };
}

export function setAuthCookies(cookies: AstroCookies, tokens: Tokens): void {
  cookies.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_MAX_AGE));
  cookies.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(REFRESH_MAX_AGE));
}

export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete(ACCESS_COOKIE, { path: '/' });
  cookies.delete(REFRESH_COOKIE, { path: '/' });
  cookies.delete(USER_NAME_COOKIE, { path: '/' });
}

// Display-only cache of the user's name for the sidebar greeting — avoids a
// network round-trip to Django on every navigation just to render a name.
// Never treated as an authorization source; pages that need the real profile
// (e.g. /admin/perfil) always fetch it fresh from Django.
export function setUserNameCookie(cookies: AstroCookies, name: string): void {
  cookies.set(USER_NAME_COOKIE, name, { ...cookieOptions(REFRESH_MAX_AGE), httpOnly: false });
}

export function getUserNameCookie(cookies: AstroCookies): string | null {
  return cookies.get(USER_NAME_COOKIE)?.value ?? null;
}

// The backend rotates the refresh token on every use, so two concurrent
// callers holding the same (not-yet-rotated) refresh token would otherwise
// race: the first rotates it, the second gets rejected as already-used and
// the session looks dead even though it wasn't. Dedup by token value so
// concurrent callers (two tabs, or a page navigation racing a component's
// own fetch) share one in-flight request and land on the same new pair.
const inFlightRefreshes = new Map<string, Promise<Tokens>>();

export function refreshTokens(refreshToken: string): Promise<Tokens> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const promise = djangoRequest<Tokens>('api/admin/auth/refresh/', {
    method: 'POST',
    body: { refresh: refreshToken },
  }).finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });

  inFlightRefreshes.set(refreshToken, promise);
  return promise;
}
