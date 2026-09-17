import type { ApiFieldErrors } from '@/types/api';

/** Spanish overrides for backend error codes whose default `message` is untranslated. */
const CODE_MESSAGES: Record<string, string> = {
  invalid_city_for_department: 'Esta ciudad no pertenece al departamento seleccionado.',
};

/** Reduces the backend's {field: [{message, code}]} shape to one message per field. */
export function mapFieldErrors(fieldErrors: ApiFieldErrors | undefined): Record<string, string> {
  if (!fieldErrors) return {};
  const mapped: Record<string, string> = {};
  for (const [field, errors] of Object.entries(fieldErrors)) {
    if (errors.length > 0) {
      const { code, message } = errors[0];
      mapped[field] = CODE_MESSAGES[code] ?? message;
    }
  }
  return mapped;
}
