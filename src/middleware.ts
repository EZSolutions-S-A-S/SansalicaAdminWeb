import { defineMiddleware } from 'astro:middleware';
import { isJwtExpired } from '@/repositories/jwt';
import { clearAuthCookies, getTokens, getUserNameCookie, refreshTokens, setAuthCookies } from '@/repositories/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin')) {
    const { access, refresh } = getTokens(context.cookies);

    // Fast path: valid access token, no network call to Django at all.
    if (access && !isJwtExpired(access)) {
      context.locals.user = { name: getUserNameCookie(context.cookies) };
      return next();
    }

    // Access token missing/expired: the only case that needs a network call
    // is refreshing it — at most once every 15 minutes, not on every click.
    if (!refresh) {
      return context.redirect('/login?expired=1');
    }

    try {
      const tokens = await refreshTokens(refresh);
      setAuthCookies(context.cookies, tokens);
      context.locals.user = { name: getUserNameCookie(context.cookies) };
      return next();
    } catch {
      clearAuthCookies(context.cookies);
      return context.redirect('/login?expired=1');
    }
  }

  return next();
});
