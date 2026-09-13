import { djangoRequest } from './djangoClient';
import type { AdminProfile, ChangePasswordRequest, LoginRequest, Tokens } from '@/types/auth';

export function login(credentials: LoginRequest): Promise<Tokens> {
  return djangoRequest<Tokens>('api/admin/auth/login/', { method: 'POST', body: credentials });
}

export function logout(refresh: string): Promise<void> {
  return djangoRequest<void>('api/admin/auth/logout/', { method: 'POST', body: { refresh } });
}

export function getProfile(token: string): Promise<AdminProfile> {
  return djangoRequest<AdminProfile>('api/admin/me/', { method: 'GET', token });
}

export function updateProfile(token: string, patch: Partial<AdminProfile>): Promise<AdminProfile> {
  return djangoRequest<AdminProfile>('api/admin/me/', { method: 'PATCH', token, body: patch });
}

export function uploadProfilePhoto(token: string, file: File): Promise<AdminProfile> {
  const formData = new FormData();
  formData.append('photo', file);
  return djangoRequest<AdminProfile>('api/admin/me/', { method: 'PATCH', token, body: formData, isMultipart: true });
}

export function changePassword(token: string, dto: ChangePasswordRequest): Promise<void> {
  return djangoRequest<void>('api/admin/me/change-password/', { method: 'POST', token, body: dto });
}
