const TOKEN_KEY = 'peakpaz.token';

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'El correo o la contraseña no son correctos.',
  EMAIL_ALREADY_REGISTERED: 'Ese correo ya tiene una cuenta. Prueba ingresar.',
  USER_SUSPENDED: 'Esta cuenta está suspendida.',
  INVALID_TOKEN: 'Tu sesión terminó. Vuelve a ingresar.',
  ROUTE_NOT_FOUND: 'No encontramos esa ruta.',
  WEATHER_UNAVAILABLE: 'El pronóstico no está disponible en este momento.',
  START_TIME_OUTSIDE_WINDOW: 'Esa hora está fuera del horario sugerido de la ruta.',
  BAD_REQUEST: 'Revisa los datos del formulario.',
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No pudimos conectar con el servidor.');
  }

  if (response.ok) {
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  const code = body.error ?? 'HTTP_ERROR';
  throw new ApiError(
    response.status,
    code,
    MESSAGES[code] ?? 'Algo salió mal. Intenta de nuevo en un momento.',
  );
}
