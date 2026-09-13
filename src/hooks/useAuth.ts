import { useCallback, useState } from 'react';
import * as authService from '@/services/http/authService';
import { ClientApiError } from '@/services/http/httpClient';
import type { LoginRequest } from '@/types/auth';

interface UseAuthState {
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<UseAuthState>({ isLoading: false, error: null });

  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setState({ isLoading: true, error: null });
    try {
      await authService.login(credentials);
      setState({ isLoading: false, error: null });
      return true;
    } catch (error) {
      const message =
        error instanceof ClientApiError
          ? (error.detail ?? 'Credenciales inválidas.')
          : 'No se pudo conectar con el servidor.';
      setState({ isLoading: false, error: message });
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
  }, []);

  return { ...state, login, logout };
}
