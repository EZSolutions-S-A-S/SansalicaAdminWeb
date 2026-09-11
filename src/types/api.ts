export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  results: T[];
}

export interface ApiFieldError {
  message: string;
  code: string;
}

export type ApiFieldErrors = Record<string, ApiFieldError[]>;

export interface ApiErrorBody {
  detail?: string;
  code?: string;
  [field: string]: unknown;
}
