import type { AstroCookies } from 'astro';
import { DjangoApiError } from './djangoClient';
import { clearAuthCookies, getTokens, refreshTokens, setAuthCookies } from './session';

export class UnauthorizedError extends Error {}

/**
 * Runs `fn` with a valid access token, transparently refreshing the session
 * once on a 401 (or when no access token is present yet) before giving up.
 */
export async function withAuthRetry<T>(
  cookies: AstroCookies,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  const { access, refresh } = getTokens(cookies);

  if (!access) {
    if (!refresh) throw new UnauthorizedError('No hay sesión activa.');
    return retryWithRefresh(cookies, refresh, fn);
  }

  try {
    return await fn(access);
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 401 && refresh) {
      return retryWithRefresh(cookies, refresh, fn);
    }
    throw error;
  }
}

async function retryWithRefresh<T>(
  cookies: AstroCookies,
  refresh: string,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    const tokens = await refreshTokens(refresh);
    setAuthCookies(cookies, tokens);
    return await fn(tokens.access);
  } catch {
    clearAuthCookies(cookies);
    throw new UnauthorizedError('La sesión expiró.');
  }
}
