import { DjangoApiError } from './djangoClient';
import { UnauthorizedError } from './withAuthRetry';

/**
 * Converts a service-layer error into the same shape the client's error
 * mapper expects: {detail?, code?, [field]: [{message, code}]}.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ detail: error.message }, { status: 401 });
  }

  if (error instanceof DjangoApiError) {
    const body: Record<string, unknown> = {};
    if (error.detail) body.detail = error.detail;
    if (error.code) body.code = error.code;
    if (error.fieldErrors) Object.assign(body, error.fieldErrors);
    return Response.json(body, { status: error.status });
  }

  console.error(error);
  return Response.json({ detail: 'Error inesperado.' }, { status: 500 });
}
