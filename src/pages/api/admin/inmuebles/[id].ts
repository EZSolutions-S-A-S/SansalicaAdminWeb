import type { APIRoute } from 'astro';
import * as inmuebleRepository from '@/repositories/inmuebleRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';
import type { InmuebleInput } from '@/types/inmueble';

export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.get(token, params.id!));
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
};

export const PUT: APIRoute = async ({ cookies, params, request }) => {
  try {
    const dto = (await request.json()) as InmuebleInput;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.update(token, params.id!, dto));
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  try {
    const dto = (await request.json()) as Partial<InmuebleInput>;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.update(token, params.id!, dto));
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  try {
    await withAuthRetry(cookies, (token) => inmuebleRepository.remove(token, params.id!));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};
