import { apiRequest } from './httpClient';
import type { PaginatedResponse } from '@/types/api';
import type { Inmueble, InmuebleInput, InmuebleListParams, InmueblePhoto } from '@/types/inmueble';

export function list(params: InmuebleListParams = {}): Promise<PaginatedResponse<Inmueble>> {
  return apiRequest('/api/admin/inmuebles', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

export function get(id: number | string): Promise<Inmueble> {
  return apiRequest(`/api/admin/inmuebles/${id}`);
}

export function create(dto: InmuebleInput): Promise<Inmueble> {
  return apiRequest('/api/admin/inmuebles', { method: 'POST', body: dto });
}

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
