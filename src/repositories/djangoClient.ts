// Implementación de bajo nivel: el ÚNICO módulo del proyecto que hace fetch
// contra el Django real (BACKEND_API_URL). Todos los repositories (ej.
// inmuebleRepository.ts) llaman a djangoRequest() en vez de usar fetch
// directamente, así toda la lógica de headers/errores/caché vive en un
// solo lugar.
import type { ApiFieldErrors } from '@/types/api';

// Misma forma que ClientApiError (httpClient.ts) pero del lado servidor:
// separa la respuesta de Django en detail/code/fieldErrors para que
// apiRoute.ts (errorResponse) la pueda reenviar al navegador sin perder
// información.
export class DjangoApiError extends Error {
  status: number;
  detail?: string;
  code?: string;
  fieldErrors?: ApiFieldErrors;

  constructor(status: number, body: unknown) {
    const detail = extractDetail(body);
    super(detail ?? 'Error al comunicarse con el backend.');
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
      errors[key] = value.map((item) =>
        item && typeof item === 'object' && 'message' in item
          ? (item as { message: string; code: string })
          : { message: String(item), code: 'invalid' }
      );
      found = true;
    }
  }
  return found ? errors : undefined;
}

interface DjangoRequestOptions {
  method?: string;
  token?: string | null;
  body?: unknown;
  isMultipart?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

function baseUrl(): string {
  const url = import.meta.env.BACKEND_API_URL;
  return url.endsWith('/') ? url : `${url}/`;
}

function buildUrl(path: string, query?: DjangoRequestOptions['query']): string {
  const url = new URL(path.replace(/^\/+/, ''), baseUrl());
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// Short-lived, per-server-instance cache for GET requests. Django on Render
// can be slow (cold starts), so this smooths out the typical
// list -> detail -> back-to-list navigation within the same few seconds.
// Reset on every deploy/restart — fine for an internal admin panel.
const GET_CACHE_TTL_MS = 25_000;
const getCache = new Map<string, { expiresAt: number; data: unknown }>();

function cacheKey(url: string, token?: string | null): string {
  return `${token ?? ''}::${url}`;
}

export async function djangoRequest<T>(path: string, options: DjangoRequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, isMultipart, query } = options;
  // path ej. 'api/admin/inmuebles/' + query -> se concatena con BACKEND_API_URL
  const url = buildUrl(path, query);

  if (method === 'GET') {
    const cached = getCache.get(cacheKey(url, token));
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
  }

  const headers: Record<string, string> = {};
  // Único lugar del proyecto donde el JWT viaja en un header. Es server-to-
  // server (Astro -> Django) — el navegador nunca ve este token.
  if (token) headers.Authorization = `Bearer ${token}`;

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isMultipart) {
      requestBody = body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(url, { method, headers, body: requestBody });

  if (response.status === 204) {
    if (method !== 'GET') getCache.clear();
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Django (or a proxy in front of it on Render/Cloudflare — size limits,
      // timeouts, cold-start hiccups) can return an HTML error page instead
      // of JSON. Never let that masquerade as an opaque SyntaxError; surface
      // the real HTTP status instead.
      if (!response.ok) {
        throw new DjangoApiError(response.status, {
          detail: `El servidor respondió con un error (${response.status}).`,
        });
      }
      throw new Error(`Respuesta inesperada del servidor (no es JSON): ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new DjangoApiError(response.status, data);
  }

  if (method === 'GET') {
    getCache.set(cacheKey(url, token), { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
  } else {
    // Any successful write can affect what a GET would return — wiping the
    // whole cache is simpler than tracking per-resource invalidation and
    // costs nothing given how short the TTL already is.
    getCache.clear();
  }

  return data as T;
}
