import { useState, type SyntheticEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

export function LoginForm() {
  const { login, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiredNotice] = useState(
    () => new URLSearchParams(window.location.search).get('expired') === '1'
  );

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await login({ username, password });
    if (ok) {
      window.location.href = '/admin';
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group login-group">
        <label htmlFor="usuario">Usuario</label>
        <input
          id="usuario"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          required
        />
      </div>

      <div className="form-group login-group">
        <label htmlFor="contrasena">Contraseña</label>
        <div className="input-wrapper">
          <input
            id="contrasena"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="eye-btn"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        </div>
      </div>

      <ErrorBanner message={error ?? (expiredNotice ? 'Tu sesión expiró. Iniciá sesión de nuevo.' : null)} />

      <button type="submit" className="btn-ingresar" disabled={isLoading}>
        {isLoading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
