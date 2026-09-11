import type { APIRoute } from 'astro';
import * as authRepository from '@/repositories/authRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';
import type { ChangePasswordRequest } from '@/types/auth';

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const dto = (await request.json()) as ChangePasswordRequest;
    await withAuthRetry(cookies, (token) => authRepository.changePassword(token, dto));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};
