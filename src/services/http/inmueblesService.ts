// Service = lo único que los componentes de React llaman. Nunca hace fetch
// directo: delega todo en apiRequest (httpClient.ts), que pega SIEMPRE a las
// rutas /api/* de este mismo proyecto Astro, nunca a Django directamente.
// Las funciones de acá son un espejo 1:1 de inmuebleRepository.ts, solo que
// del lado del navegador y sin token (las cookies de sesión viajan solas).
import { apiRequest } from './httpClient';
import type { PaginatedResponse } from '@/types/api';
import type { Inmueble, InmuebleInput, InmuebleListParams, InmueblePhoto } from '@/types/inmueble';

// InmueblesList.tsx llama esto cada vez que cambian los filtros/página
// (ver useInmuebles.ts). `params` se pasa tal cual como query string.
export function list(params: InmuebleListParams = {}): Promise<PaginatedResponse<Inmueble>> {
  return apiRequest('/api/admin/inmuebles', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

export function get(id: number | string): Promise<Inmueble> {
  return apiRequest(`/api/admin/inmuebles/${id}`);
}

// InmuebleForm.tsx llama esto en handleSubmit(). Si Django rechaza el body
// (400), apiRequest lanza un ClientApiError que el form atrapa para mostrar
// fieldErrors por campo — ver docs/INTEGRACION_BACKEND.md sección 3.
export function create(dto: InmuebleInput): Promise<Inmueble> {
  return apiRequest('/api/admin/inmuebles', { method: 'POST', body: dto });
}

// Partial<InmuebleInput> porque tanto "guardar cambios" (form completo) como
// "cambiar solo el estado" (InmueblesList.tsx, dropdown de la tarjeta) usan
// esta misma función.
export function update(id: number | string, dto: Partial<InmuebleInput>): Promise<Inmueble> {
  return apiRequest(`/api/admin/inmuebles/${id}`, { method: 'PATCH', body: dto });
}

export function remove(id: number | string): Promise<void> {
  return apiRequest(`/api/admin/inmuebles/${id}`, { method: 'DELETE' });
}

export function uploadPhoto(id: number | string, file: File, order = 0): Promise<InmueblePhoto> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('order', String(order));
  return apiRequest(`/api/admin/inmuebles/${id}/photos`, {
    method: 'POST',
    body: formData,
    isMultipart: true,
  });
}

export function deletePhoto(id: number | string, photoId: number | string): Promise<void> {
  return apiRequest(`/api/admin/inmuebles/${id}/photos/${photoId}`, { method: 'DELETE' });
}
