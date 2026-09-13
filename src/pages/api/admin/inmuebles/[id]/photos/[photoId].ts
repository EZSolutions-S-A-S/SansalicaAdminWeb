import type { APIRoute } from 'astro';
import * as inmuebleRepository from '@/repositories/inmuebleRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';

export const DELETE: APIRoute = async ({ cookies, params }) => {
  try {
    await withAuthRetry(cookies, (token) =>
      inmuebleRepository.deletePhoto(token, params.id!, params.photoId!)
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};
