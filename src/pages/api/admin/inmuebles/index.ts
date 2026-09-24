// "Controlador" del BFF para /api/admin/inmuebles. Corre en el servidor de
// Astro (nunca en el navegador), así que puede leer las cookies httpOnly de
// sesión y esconder la URL real de Django del cliente.
// Ver docs/INTEGRACION_BACKEND.md para el recorrido completo de una request.
import type { APIRoute } from 'astro';
import * as inmuebleRepository from '@/repositories/inmuebleRepository';
import { withAuthRetry } from '@/repositories/withAuthRetry';
import { errorResponse } from '@/repositories/apiRoute';
import type { InmuebleInput, InmuebleListParams } from '@/types/inmueble';

// GET /api/admin/inmuebles?departamento=Antioquia&ciudad=Medellín&page=2...
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Los query params llegan como texto plano; se pasan tal cual al
    // repository, que a su vez los reenvía a Django sin transformarlos.
    // Por eso agregar un filtro nuevo (como departamento/ciudad) no requiere
    // tocar esta función: basta con que el tipo InmuebleListParams lo declare.
    const params = Object.fromEntries(url.searchParams) as InmuebleListParams;

    // withAuthRetry se encarga de: leer el access token de las cookies,
    // refrescarlo una vez si venció, y recién ahí llamar a la función que
    // le pasamos (el fetch real a Django vive en inmuebleRepository.list).
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.list(token, params));
    return Response.json(data);
  } catch (error) {
    // errorResponse normaliza tanto errores de auth (401) como errores de
    // validación de Django (400 con {campo: [{message, code}]}) al mismo
    // formato JSON que el cliente sabe interpretar (ver httpClient.ts).
    return errorResponse(error);
  }
};

// POST /api/admin/inmuebles — crear un inmueble nuevo.
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    // El body ya viene como JSON desde inmueblesService.create() en el
    // cliente; acá simplemente se re-tipa, no se valida (la validación real
    // — incluyendo la de departamento/ciudad — la hace Django).
    const dto = (await request.json()) as InmuebleInput;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.create(token, dto));
    return Response.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
