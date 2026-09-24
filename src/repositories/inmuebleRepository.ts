// Repository = la única capa que conoce las rutas REALES de Django
// (`api/admin/inmuebles/`, con la barra final que exige DRF). Todo lo que
// está por encima (las rutas API de Astro en src/pages/api) solo conoce
// estas funciones, nunca la URL de Django ni el token en sí — eso lo maneja
// withAuthRetry.ts antes de llamar a cualquiera de estas funciones.
import { djangoRequest } from './djangoClient';
import type { PaginatedResponse } from '@/types/api';
import type { Inmueble, InmuebleInput, InmuebleListParams, InmueblePhoto } from '@/types/inmueble';

// `params` se pasa completo a djangoRequest, que arma la query string
// (?departamento=Antioquia&ciudad=Medellín&page=2...). Ni esta función ni
// djangoRequest necesitan saber qué filtros existen — por eso agregar un
// filtro nuevo (departamento/ciudad) fue solo cuestión de declararlo en el
// tipo InmuebleListParams, sin tocar este archivo.
export function list(token: string, params: InmuebleListParams = {}): Promise<PaginatedResponse<Inmueble>> {
  return djangoRequest<PaginatedResponse<Inmueble>>('api/admin/inmuebles/', {
    method: 'GET',
    token,
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

export function get(token: string, id: number | string): Promise<Inmueble> {
  return djangoRequest<Inmueble>(`api/admin/inmuebles/${id}/`, { method: 'GET', token });
}

// `dto` (el body) tampoco se transforma acá: viaja tal cual desde el
// formulario hasta Django. Si Django rechaza un campo (ej. ciudad inválida
// para el departamento), la respuesta 400 llega intacta y djangoRequest la
// convierte en un DjangoApiError con fieldErrors.
export function create(token: string, dto: InmuebleInput): Promise<Inmueble> {
  return djangoRequest<Inmueble>('api/admin/inmuebles/', { method: 'POST', token, body: dto });
}

export function update(token: string, id: number | string, dto: Partial<InmuebleInput>): Promise<Inmueble> {
  return djangoRequest<Inmueble>(`api/admin/inmuebles/${id}/`, { method: 'PATCH', token, body: dto });
}

export function remove(token: string, id: number | string): Promise<void> {
  return djangoRequest<void>(`api/admin/inmuebles/${id}/`, { method: 'DELETE', token });
}

export function uploadPhoto(
  token: string,
  id: number | string,
  file: File,
  order = 0
): Promise<InmueblePhoto> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('order', String(order));
  return djangoRequest<InmueblePhoto>(`api/admin/inmuebles/${id}/photos/`, {
    method: 'POST',
    token,
    body: formData,
    isMultipart: true,
  });
}

export function deletePhoto(token: string, id: number | string, photoId: number | string): Promise<void> {
  return djangoRequest<void>(`api/admin/inmuebles/${id}/photos/${photoId}/`, {
    method: 'DELETE',
    token,
  });
}
