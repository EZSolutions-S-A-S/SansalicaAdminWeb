// "Controlador" para /api/admin/inmuebles/[id] — un solo inmueble.
// `params.id` viene del segmento dinámico del nombre de archivo ([id].ts es
// convención de Astro, igual que [id]/photos.ts más abajo en el árbol).
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

// PUT queda por si algún día se necesita un "reemplazo total"; el form del
// admin en la práctica siempre usa PATCH (ver InmuebleForm.tsx / update()).
export const PUT: APIRoute = async ({ cookies, params, request }) => {
  try {
    const dto = (await request.json()) as InmuebleInput;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.update(token, params.id!, dto));
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
};

// PATCH — actualización parcial. `Partial<InmuebleInput>` es lo que permite
// que InmueblesList.tsx mande solo `{ status: 'Reservado' }` al cambiar el
// estado desde el dropdown de la tarjeta, sin tener que reenviar el
// inmueble completo.
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
    // 204 No Content: el cliente (inmueblesService.remove) espera esto y no
    // intenta parsear un body — ver el chequeo `response.status === 204` en
    // httpClient.ts y djangoClient.ts.
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};
