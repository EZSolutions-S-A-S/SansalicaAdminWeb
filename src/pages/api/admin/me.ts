import type { APIRoute } from 'astro';
import * as authRepository from '@/repositories/authRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';
import { setUserNameCookie } from '@/repositories/session';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const profile = await withAuthRetry(cookies, (token) => authRepository.getProfile(token));
    return Response.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    const patch = await request.json();
    const profile = await withAuthRetry(cookies, (token) => authRepository.updateProfile(token, patch));
    setUserNameCookie(cookies, `${profile.first_name} ${profile.last_name}`.trim());
    return Response.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
};
