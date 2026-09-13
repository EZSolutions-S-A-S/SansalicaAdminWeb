import type { ApiFieldErrors } from '@/types/api';

export class ClientApiError extends Error {
  status: number;
  detail?: string;
  code?: string;
  fieldErrors?: ApiFieldErrors;

  constructor(status: number, body: unknown) {
    const detail = extractDetail(body);
    super(detail ?? 'Ocurrió un error inesperado.');
    this.status = status;
    this.detail = detail;
    this.code = extractCode(body);
    this.fieldErrors = extractFieldErrors(body);
  }
}

function extractDetail(body: unknown): string | undefined {
  if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).detail === 'string') {
    return (body as Record<string, string>).detail;
  }
  return undefined;
}

function extractCode(body: unknown): string | undefined {
  if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).code === 'string') {
    return (body as Record<string, string>).code;
  }
  return undefined;
}

function extractFieldErrors(body: unknown): ApiFieldErrors | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const errors: ApiFieldErrors = {};
  let found = false;
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (key === 'detail' || key === 'code') continue;
    if (Array.isArray(value)) {
      errors[key] = value as ApiFieldErrors[string];
      found = true;
    }
  }
  return found ? errors : undefined;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isMultipart?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
  /** Set for the login call: a 401 there means "wrong credentials", not "session lost". */
  skipAuthRedirect?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

/**
 * Talks only to this app's own /api/* routes (the BFF), always same-origin.
 * No component should call `fetch` directly — this is the single choke point.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isMultipart, query, skipAuthRedirect } = options;
  const headers: Record<string, string> = {};
  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (isMultipart) {
      requestBody = body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: requestBody,
    credentials: 'same-origin',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    if (response.status === 401 && !skipAuthRedirect && window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
    }
    throw new ClientApiError(response.status, data);
  }

  return data as T;
}
