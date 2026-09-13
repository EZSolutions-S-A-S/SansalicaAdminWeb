import type { APIRoute } from 'astro';
import * as inmuebleRepository from '@/repositories/inmuebleRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';

export const POST: APIRoute = async ({ cookies, params, request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const order = Number(formData.get('order') ?? 0);

    if (!(file instanceof File)) {
      return Response.json({ detail: 'Se requiere un archivo de imagen.' }, { status: 400 });
    }

    const data = await withAuthRetry(cookies, (token) =>
      inmuebleRepository.uploadPhoto(token, params.id!, file, order)
    );
    return Response.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
