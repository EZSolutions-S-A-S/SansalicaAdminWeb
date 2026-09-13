import { apiRequest } from './httpClient';
import type { AdminProfile, ChangePasswordRequest, LoginRequest } from '@/types/auth';

export function login(credentials: LoginRequest): Promise<{ ok: true }> {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials, skipAuthRedirect: true });
}

export function logout(): Promise<{ ok: true }> {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export function getProfile(): Promise<AdminProfile> {
  return apiRequest('/api/admin/me');
}

export function updateProfile(patch: Partial<AdminProfile>): Promise<AdminProfile> {
  return apiRequest('/api/admin/me', { method: 'PATCH', body: patch });
}

export function uploadProfilePhoto(file: File): Promise<AdminProfile> {
  const formData = new FormData();
  formData.append('photo', file);
  return apiRequest('/api/admin/me/photo', { method: 'POST', body: formData, isMultipart: true });
}

export function changePassword(dto: ChangePasswordRequest): Promise<void> {
  return apiRequest('/api/admin/me/change-password', { method: 'POST', body: dto });
}
