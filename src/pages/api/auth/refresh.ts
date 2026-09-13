import type { APIRoute } from 'astro';
import { isJwtExpired } from '@/repositories/jwt';
import { clearAuthCookies, getTokens, refreshTokens, setAuthCookies } from '@/repositories/session';

// Proactive refresh margin: renew once less than 3 minutes remain, well
// before the access token's 15-minute lifetime actually runs out — as
// opposed to the 5-second skew used elsewhere just to decide "is this
// token currently usable at all".
const PROACTIVE_REFRESH_SKEW_SECONDS = 180;

export const POST: APIRoute = async ({ cookies }) => {
  const { access, refresh } = getTokens(cookies);

  if (!refresh) {
    return Response.json({ ok: false }, { status: 401 });
  }

  if (access && !isJwtExpired(access, PROACTIVE_REFRESH_SKEW_SECONDS)) {
    return Response.json({ ok: true, refreshed: false });
  }

  try {
    const tokens = await refreshTokens(refresh);
    setAuthCookies(cookies, tokens);
    return Response.json({ ok: true, refreshed: true });
  } catch {
    clearAuthCookies(cookies);
    return Response.json({ ok: false }, { status: 401 });
  }
};
