# Tutorial: cómo el admin-web se integra con el backend

Esta guía explica, capa por capa y con código real del repo, cómo viaja un dato
desde un componente de React hasta Django y de vuelta. El ejemplo principal es
"guardar un inmueble", porque toca las 4 capas y el manejo de errores. Al final
hay un checklist para repetir el patrón con un campo o endpoint nuevo, usando
como ejemplo real el campo `departamento`/`ciudad` que se agregó en este mismo
repo.

> Los archivos reales de inmuebles (`djangoClient.ts`, `inmuebleRepository.ts`,
> `inmueblesService.ts` y las rutas en `src/pages/api/admin/inmuebles/`) ya
> tienen comentarios explicando esto mismo en contexto — esta guía es el mapa
> completo, los comentarios en el código son las notas al pie en cada parada.

## 1. La idea central: un BFF, no un frontend que le habla directo a Django

El navegador **nunca** habla con Django. Habla con las rutas `/api/*` de este
mismo proyecto Astro (mismo origen, mismo dominio). Esas rutas — que corren en
el servidor, no en el navegador — son las que le hablan a Django. A este patrón
se le llama **BFF (Backend For Frontend)**.

```
┌─────────────────────┐        ┌──────────────────────────────┐        ┌─────────────────┐
│   Navegador (React) │        │   Astro (este repo, server)   │        │  Django backend  │
│                      │        │                                │        │                  │
│  InmuebleForm.tsx    │  (1)   │  src/pages/api/**/*.ts         │  (3)   │  api/admin/...   │
│         │            │ fetch  │  (rutas API = "controladores") │ fetch  │                  │
│         ▼            │ ─────▶ │         │                       │ ─────▶│                  │
│  inmueblesService.ts │        │         ▼                       │        │                  │
│  (usa httpClient.ts) │        │  withAuthRetry.ts (cookies)     │        │                  │
│                      │        │         │                       │        │                  │
│                      │        │         ▼                       │        │                  │
│                      │        │  inmuebleRepository.ts          │        │                  │
│                      │        │  (usa djangoClient.ts)          │        │                  │
└─────────────────────┘        └──────────────────────────────┘        └─────────────────┘
        (2) cookies httpOnly                    (4) Authorization: Bearer <token>
        viajan solas, JS nunca las toca
```

**Por qué así y no directo:** los tokens JWT de Django (`access`/`refresh`)
viven en cookies `httpOnly` — el JavaScript del navegador no puede leerlas ni
robarlas con XSS. El navegador ni siquiera sabe cuál es la URL real de Django
(`BACKEND_API_URL` solo se lee server-side, ver [.env.example](../.env.example)).

## 2. Las 4 capas, de afuera hacia adentro

### Capa 1 — Componente React (la UI)

Ejemplo: [`src/components/inmuebles/InmuebleForm.tsx`](../src/components/inmuebles/InmuebleForm.tsx)

```tsx
async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
  event.preventDefault();
  setIsSaving(true);
  setFormError(null);
  setFieldErrors({});
  try {
    if (inmueble) {
      // update() vive en la capa "service" — el componente no sabe
      // ni le importa que por debajo hay un fetch, cookies, Django, etc.
      const updated = await inmueblesService.update(inmueble.id, form);
      onUpdated(updated);
    } else {
      const created = await inmueblesService.create(form);
      setCreatedInmueble(created);
      setStep('photos');
    }
  } catch (error) {
    if (error instanceof ClientApiError) {
      // detail = mensaje general ("Revisá los campos marcados")
      setFormError(error.detail ?? 'Revisá los campos marcados.');
      // fieldErrors = { location: "...", price: "..." } uno por campo
      setFieldErrors(mapFieldErrors(error.fieldErrors));
    } else {
      setFormError('No se pudo conectar con el servidor.');
    }
  } finally {
    setIsSaving(false);
  }
}
```

**Regla del proyecto:** ningún componente llama `fetch` directamente. Siempre
pasa por una función de `src/services/http/*Service.ts`. Eso es lo único que
un componente necesita saber de esta capa.

### Capa 2 — Service (cliente, corre en el navegador)

[`src/services/http/inmueblesService.ts`](../src/services/http/inmueblesService.ts):

```ts
export function create(dto: InmuebleInput): Promise<Inmueble> {
  // apiRequest() es el ÚNICO lugar del navegador que hace fetch.
  // '/api/admin/inmuebles' es una ruta de ESTE proyecto, no de Django.
  return apiRequest('/api/admin/inmuebles', { method: 'POST', body: dto });
}
```

[`src/services/http/httpClient.ts`](../src/services/http/httpClient.ts) — el
`apiRequest` que usa todo servicio:

```ts
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isMultipart, query, skipAuthRedirect } = options;
  const headers: Record<string, string> = {};
  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (isMultipart) {
      requestBody = body as FormData; // fotos: no se serializa a JSON
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: requestBody,
    // same-origin: el navegador manda las cookies httpOnly automáticamente.
    // El código JS de este archivo NUNCA ve el valor de esas cookies.
    credentials: 'same-origin',
  });

  if (response.status === 204) return undefined as T; // ej. DELETE sin body

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    // Si la sesión expiró en cualquier parte de la app, mandamos a /login.
    if (response.status === 401 && !skipAuthRedirect && window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
    }
    // Empaqueta el error en una forma que el componente pueda inspeccionar
    // (detail, code, fieldErrors) en vez de un Response crudo.
    throw new ClientApiError(response.status, data);
  }

  return data as T;
}
```

### Capa 3 — Ruta API de Astro (el "controlador" del BFF, corre en el servidor)

[`src/pages/api/admin/inmuebles/index.ts`](../src/pages/api/admin/inmuebles/index.ts):

```ts
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    // Esto SÍ corre en el servidor de Astro, por eso puede leer `cookies`
    // (httpOnly) y llamar a Django con el token sin exponer nada al navegador.
    const dto = (await request.json()) as InmuebleInput;
    const data = await withAuthRetry(cookies, (token) => inmuebleRepository.create(token, dto));
    return Response.json(data, { status: 201 });
  } catch (error) {
    // Convierte cualquier error de la capa de abajo a un JSON consistente.
    return errorResponse(error);
  }
};
```

`withAuthRetry` ([`src/repositories/withAuthRetry.ts`](../src/repositories/withAuthRetry.ts))
es el pegamento entre "tengo cookies" y "tengo un access token válido para
llamar a Django":

```ts
export async function withAuthRetry<T>(
  cookies: AstroCookies,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  const { access, refresh } = getTokens(cookies); // lee las cookies sa_access/sa_refresh

  if (!access) {
    if (!refresh) throw new UnauthorizedError('No hay sesión activa.');
    return retryWithRefresh(cookies, refresh, fn); // no hay access: intenta refrescar ya mismo
  }

  try {
    return await fn(access); // caso normal: llama a Django con el access token
  } catch (error) {
    // Si Django dice 401 (access vencido justo ahora), un solo reintento
    // automático con el refresh token — el componente ni se entera.
    if (error instanceof DjangoApiError && error.status === 401 && refresh) {
      return retryWithRefresh(cookies, refresh, fn);
    }
    throw error;
  }
}
```

### Capa 4 — Repository (server, habla con el Django real)

[`src/repositories/inmuebleRepository.ts`](../src/repositories/inmuebleRepository.ts):

```ts
export function create(token: string, dto: InmuebleInput): Promise<Inmueble> {
  // 'api/admin/inmuebles/' aquí SÍ es una ruta de Django (nota la barra final,
  // que Django Rest Framework exige).
  return djangoRequest<Inmueble>('api/admin/inmuebles/', { method: 'POST', token, body: dto });
}
```

[`src/repositories/djangoClient.ts`](../src/repositories/djangoClient.ts) —
`djangoRequest`, el único lugar del repo que hace `fetch` hacia el Django real:

```ts
export async function djangoRequest<T>(path: string, options: DjangoRequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, isMultipart, query } = options;
  const url = buildUrl(path, query); // `${BACKEND_API_URL}/${path}` + query params

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`; // acá SÍ viaja el JWT, server-to-server

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
  // ... parseo de la respuesta y armado de DjangoApiError si status >= 400
  // (ver el archivo completo — incluye una cache corta de 25s para GETs,
  // porque Django en Render puede tener cold starts).
}
```

## 3. Cómo se ve un error 400 de principio a fin

Este es el caso que trajo esta guía: el backend valida que `ciudad` pertenezca
a `departamento`, y si no, responde:

```json
{ "ciudad": [{ "message": "'Cali' is not a valid city for the department 'Antioquia'.", "code": "invalid_city_for_department" }] }
```

Recorrido del error, capa por capa:

1. **`djangoClient.ts`** ve `response.ok === false` → lanza
   `new DjangoApiError(400, body)`, que separa `body` en `detail`, `code` y
   `fieldErrors` (todo lo que sea un array con `{message, code}`).
2. **La ruta API** (`index.ts`/`[id].ts`) atrapa ese error en el `catch` y
   llama `errorResponse(error)` ([`apiRoute.ts`](../src/repositories/apiRoute.ts)),
   que arma un `Response.json({ ciudad: [...] }, { status: 400 })` — misma
   forma que mandó Django, para no reinventar nada.
3. **`httpClient.ts`** en el navegador ve `response.ok === false` → lanza
   `new ClientApiError(400, body)`, que vuelve a separar `fieldErrors`.
4. **`InmuebleForm.tsx`** atrapa el `ClientApiError` y llama
   `mapFieldErrors(error.fieldErrors)`.
5. **[`errorMapping.ts`](../src/services/http/errorMapping.ts)** reduce el
   array a un mensaje por campo, con una tabla de traducciones por `code`
   para los que no vienen en español del backend:

   ```ts
   const CODE_MESSAGES: Record<string, string> = {
     invalid_city_for_department: 'Esta ciudad no pertenece al departamento seleccionado.',
   };

   export function mapFieldErrors(fieldErrors: ApiFieldErrors | undefined): Record<string, string> {
     if (!fieldErrors) return {};
     const mapped: Record<string, string> = {};
     for (const [field, errors] of Object.entries(fieldErrors)) {
       if (errors.length > 0) {
         const { code, message } = errors[0];
         mapped[field] = CODE_MESSAGES[code] ?? message; // traducido si lo conocemos, si no, el de Django
       }
     }
     return mapped;
   }
   ```
6. El JSX del form pinta `{fieldErrors.ciudad && <span className="field-error">{fieldErrors.ciudad}</span>}`
   justo debajo del `<select id="ciudad">`.

**La regla para agregar un mensaje traducido de un `code` nuevo:** una línea
en `CODE_MESSAGES` en `errorMapping.ts`. No hay que tocar ninguna otra capa.

## 4. Autenticación: de dónde salen los tokens

- **Login** ([`src/pages/api/auth/login.ts`](../src/pages/api/auth/login.ts)):
  el navegador manda usuario/contraseña, la ruta llama a Django, y si es
  válido guarda `sa_access`/`sa_refresh` como cookies `httpOnly` con
  `setAuthCookies` ([`session.ts`](../src/repositories/session.ts)). El
  navegador solo recibe `{ ok: true }` — el JWT nunca toca JS de cliente.
- **Cada página `/admin/*`** pasa por [`src/middleware.ts`](../src/middleware.ts)
  antes de renderizar: si el access token no está vencido, sigue de largo sin
  llamar a Django; si está vencido pero hay refresh token, lo renueva una vez;
  si no hay ninguno, redirige a `/login`.
- **Cada llamada a la API** repite ese mismo chequeo a nivel de request via
  `withAuthRetry` (sección 2, capa 3) — por si el access vence a mitad de una
  sesión larga sin recargar la página.

## 5. Checklist: agregar un campo nuevo a un recurso existente

Este es exactamente el camino que se siguió para agregar `departamento` y
`ciudad` a inmueble — úsalo de plantilla:

1. **Tipo** — en [`src/types/inmueble.ts`](../src/types/inmueble.ts) agregar
   el campo a `Inmueble` (respuesta), `InmuebleInput` (lo que se manda en
   POST/PATCH) y `InmuebleListParams` (filtros de listado) si aplica.
2. **Nada que tocar en repository/service/API route** — todas esas capas ya
   pasan el objeto completo (`body: dto`, `query: params`) sin listar campos
   uno por uno. Si el tipo lo tiene, ya viaja.
3. **Formulario** — agregar el `<input>`/`<select>` en el componente
   (`InmuebleForm.tsx`), leyendo/escribiendo `form.miCampo` y mostrando
   `fieldErrors.miCampo` debajo si el backend lo puede rechazar.
4. **Filtro de listado** (si aplica) — mismo patrón en `InmueblesList.tsx`,
   escribiendo en `params.miCampo` vía `setParams`.
5. **Mensaje de error traducido** (si el backend usa un `code` propio para
   validarlo) — una entrada en `CODE_MESSAGES` en `errorMapping.ts`.

## 6. Checklist: agregar un recurso/endpoint nuevo desde cero

1. **Tipos** en `src/types/<recurso>.ts` (entidad, input, params de listado).
2. **Repository** en `src/repositories/<recurso>Repository.ts` — funciones
   `list/get/create/update/remove` que llaman `djangoRequest` con las rutas
   reales de Django (`api/admin/<recurso>/`).
3. **Rutas API** en `src/pages/api/admin/<recurso>/index.ts` y `[id].ts` —
   cada método (GET/POST/PATCH/DELETE) envuelve la llamada al repository en
   `withAuthRetry` y captura errores con `errorResponse`.
4. **Service** en `src/services/http/<recurso>Service.ts` — mismas funciones
   que el repository, pero llamando `apiRequest('/api/admin/<recurso>')` (la
   ruta de este repo, no la de Django).
5. **Hook/componente** que use el service (mirar
   [`src/hooks/useInmuebles.ts`](../src/hooks/useInmuebles.ts) como plantilla
   de "cargar lista + params + reload").

## 7. Correr todo localmente

```bash
# .env — solo esta variable, y NUNCA con prefijo PUBLIC_ (no debe llegar al navegador)
BACKEND_API_URL=http://localhost:8000

astro dev --background   # levanta este proyecto en background
astro dev status          # ver si sigue corriendo
astro dev logs            # ver logs
astro dev stop            # apagarlo
```

Necesitas el backend de Django corriendo aparte en `localhost:8000` (o la URL
que pongas en `BACKEND_API_URL`) — este proyecto nunca lo levanta por ti.
