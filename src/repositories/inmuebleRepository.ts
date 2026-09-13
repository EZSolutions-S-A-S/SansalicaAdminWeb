import { djangoRequest } from './djangoClient';
import type { PaginatedResponse } from '@/types/api';
import type { Inmueble, InmuebleInput, InmuebleListParams, InmueblePhoto } from '@/types/inmueble';

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
