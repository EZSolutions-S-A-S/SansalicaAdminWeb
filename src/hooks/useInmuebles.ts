import { useCallback, useEffect, useRef, useState } from 'react';
import * as inmueblesService from '@/services/http/inmueblesService';
import { ClientApiError } from '@/services/http/httpClient';
import type { Inmueble, InmuebleListParams } from '@/types/inmueble';
import type { PaginatedResponse } from '@/types/api';

export function useInmuebles(
  initialParams: InmuebleListParams = {},
  initialData: PaginatedResponse<Inmueble> | null = null
) {
  const [params, setParams] = useState<InmuebleListParams>(initialParams);
  const [data, setData] = useState<PaginatedResponse<Inmueble> | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  // The very first page can already be server-rendered — skip the redundant
  // client-side fetch that would otherwise happen right after hydration.
  const skipNextFetch = useRef(initialData !== null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await inmueblesService.list(params);
      setData(result);
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? (err.detail ?? 'Error al cargar los inmuebles.')
          : 'No se pudo conectar con el servidor.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    reload();
  }, [reload]);

  const remove = useCallback(
    async (id: number) => {
      await inmueblesService.remove(id);
      await reload();
    },
    [reload]
  );

  return { data, isLoading, error, params, setParams, reload, remove };
}
