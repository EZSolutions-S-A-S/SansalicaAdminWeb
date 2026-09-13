import type { APIRoute } from 'astro';
import * as authRepository from '@/repositories/authRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';
import { setUserNameCookie } from '@/repositories/session';

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!(file instanceof File)) {
      return Response.json({ detail: 'Se requiere un archivo de imagen.' }, { status: 400 });
    }

    const profile = await withAuthRetry(cookies, (token) => authRepository.uploadProfilePhoto(token, file));
    setUserNameCookie(cookies, `${profile.first_name} ${profile.last_name}`.trim());
    return Response.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
};
