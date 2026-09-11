import type { APIRoute } from 'astro';
import * as authRepository from '@/repositories/authRepository';
import { setAuthCookies, setUserNameCookie } from '@/repositories/session';
import { errorResponse } from '@/repositories/apiRoute';
import type { LoginRequest } from '@/types/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const credentials = (await request.json()) as LoginRequest;
    const tokens = await authRepository.login(credentials);
    setAuthCookies(cookies, tokens);

    // Fetched once, at login, so the sidebar can greet the user without a
    // Django round-trip on every later navigation (see middleware.ts).
    try {
      const profile = await authRepository.getProfile(tokens.access);
      setUserNameCookie(cookies, `${profile.first_name} ${profile.last_name}`.trim());
    } catch {
      // Non-critical — the sidebar just falls back to a generic label.
    }

    // Tokens never leave the server — the client only gets a success flag.
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
