import type { APIRoute } from 'astro';
import * as inmuebleRepository from '@/repositories/inmuebleRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';
import type { InmuebleInput, InmuebleListParams } from '@/types/inmueble';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const params = Object.fromEntries(url.searchParams) as InmuebleListParams;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.list(token, params));
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const dto = (await request.json()) as InmuebleInput;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.create(token, dto));
    return Response.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
