import type { APIRoute } from 'astro';
import * as authRepository from '@/repositories/authRepository';
import { clearAuthCookies, getTokens } from '@/repositories/session';

export const POST: APIRoute = async ({ cookies }) => {
  const { refresh } = getTokens(cookies);
  try {
    if (refresh) {
      await authRepository.logout(refresh);
    }
  } catch {
    // An already-expired/blacklisted refresh token must not block client-side logout.
  } finally {
    clearAuthCookies(cookies);
  }
  return Response.json({ ok: true });
};
