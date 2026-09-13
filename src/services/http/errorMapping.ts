import type { ApiFieldErrors } from '@/types/api';

/** Reduces the backend's {field: [{message, code}]} shape to one message per field. */
export function mapFieldErrors(fieldErrors: ApiFieldErrors | undefined): Record<string, string> {
  if (!fieldErrors) return {};
  const mapped: Record<string, string> = {};
  for (const [field, errors] of Object.entries(fieldErrors)) {
    if (errors.length > 0) {
      mapped[field] = errors[0].message;
    }
  }
  return mapped;
}
