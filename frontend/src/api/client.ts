const TOKEN_KEY = 'peakpaz.token';

const MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED:
    'Confirma tu correo desde Mi verificación antes de continuar.',
  INVALID_VERIFICATION_TOKEN:
    'El enlace venció, ya se utilizó o no es válido. Solicita uno nuevo desde tu cuenta.',
  VERIFICATION_UNAVAILABLE:
    'La verificación no está disponible. Tu solicitud se conserva; vuelve a intentarlo.',
  VERIFICATION_RATE_LIMITED: 'Espera un minuto antes de solicitar otro correo.',
  DOCUMENT_EXPIRED: 'El documento está vencido. Carga uno vigente.',
  INVALID_DOCUMENT_FILE: 'Carga un PDF, JPG o PNG válido de hasta 5 MB.',
  DOCUMENTS_INCOMPLETE:
    'Faltan documentos vigentes para completar la revisión.',
  REVIEW_ALREADY_DECIDED:
    'Esta revisión ya tiene una decisión. El guía debe solicitar una nueva revisión.',
  PROFILE_LOCKED:
    'Los datos de identidad aprobados requieren una nueva revisión.',
  INVALID_CREDENTIALS: 'El correo o la contraseña no son correctos.',
  EMAIL_ALREADY_REGISTERED: 'Ese correo ya tiene una cuenta. Prueba ingresar.',
  USER_SUSPENDED: 'Esta cuenta está suspendida.',
  INVALID_TOKEN: 'Tu sesión terminó. Vuelve a ingresar.',
  ROUTE_NOT_FOUND: 'No encontramos esa ruta.',
  WEATHER_UNAVAILABLE: 'El pronóstico no está disponible en este momento.',
  START_TIME_OUTSIDE_WINDOW:
    'Esa hora está fuera del horario sugerido de la ruta.',
  BAD_REQUEST: 'Revisa los datos del formulario.',
  DOCUMENTS_IN_REVIEW:
    'Espera la revisión de tus documentos para aceptar solicitudes.',
  DOCUMENTS_EXPIRED: 'Renueva tus documentos para aceptar nuevas solicitudes.',
  PROVIDER_NOT_APPROVED:
    'Completa la revisión de tus documentos antes de ofrecer servicios.',
  ALREADY_RECONFIRMED: 'Ya reconfirmaste esta reserva.',
  ALREADY_STARTED: 'Ya confirmaste este tour.',
  RECONFIRMATION_NOT_OPEN:
    'La reconfirmación se abre 72 horas antes del tour y termina al inicio.',
  START_WINDOW_CLOSED:
    'Puedes confirmar desde una hora antes hasta 24 horas después del final.',
  INVALID_BOOKING_STATUS: 'La reserva ya no permite esta acción.',
  RESPONSE_WINDOW_CLOSED: 'El plazo para responder esta solicitud ya venció.',
  RESCHEDULE_ALREADY_PENDING: 'Ya hay un cambio de fecha esperando respuesta.',
  RESCHEDULE_TOO_LATE: 'Ya no se puede proponer otra fecha para este tour.',
  SAME_DATE: 'Elige una fecha distinta a la actual.',
  GUIDE_NOT_AVAILABLE: 'No tienes disponibilidad en esa fecha.',
  GUIDE_ROUTE_ALREADY_REQUESTED: 'Ya pediste autorización para esta ruta.',
  BOOKING_NOT_FOUND: 'No encontramos esa reserva.',
  HELP_WINDOW_CLOSED: 'Solo puedes pedir ayuda mientras el tour está en curso.',
  HELP_ALREADY_OPEN: 'Ya tienes un pedido de ayuda abierto para este tour.',
  HELP_ALREADY_ATTENDED: 'Este pedido de ayuda ya fue atendido.',
  COMPLAINT_TOUR_RUNNING:
    'Podrás decidir este reclamo cuando el tour se cierre.',
  COMPLAINT_WINDOW_CLOSED:
    'Puedes reclamar desde el inicio del tour hasta 72 horas después del final.',
  COMPLAINT_ALREADY_EXISTS: 'Ya presentaste un reclamo para este tour.',
  NO_SHOW_REPORT_NOT_ALLOWED:
    'Puedes reportarlo después de 30 minutos de espera.',
  AGENCY_DOCUMENTS_EXPIRED:
    'Renueva los documentos de tu agencia para publicar salidas nuevas.',
  DEPARTURE_CLOSED: 'Las inscripciones de esta salida ya cerraron.',
  DEPARTURE_TOO_SOON:
    'La salida debe publicarse con más de 48 horas de anticipación.',
  INVALID_GROUP_SIZE:
    'Revisa el mínimo y el máximo de personas para esta ruta.',
  NOT_ENOUGH_SEATS: 'No quedan cupos suficientes.',
  PRICE_BELOW_MINIMUM: 'El precio está por debajo del mínimo de la ruta.',
  ALREADY_JOINED: 'Ya estás inscrito en esta salida.',
  BOOKING_ALREADY_REQUESTED: 'Ya tienes una solicitud para ese tour.',
  INSUFFICIENT_ADVANCE: 'Reserva con más anticipación.',
  TOO_MANY_PEOPLE: 'Son demasiadas personas para este tour.',
  GUIDE_NOT_AUTHORIZED_FOR_ROUTE: 'Ese guía no está disponible para esta ruta.',
  PAYMENT_WINDOW_CLOSED: 'El plazo para pagar ya venció.',
  PAYMENT_NOT_COMPLETED: 'El pago no se completó. Inténtalo de nuevo.',
  PAYMENT_PROVIDER_ERROR:
    'El servicio de pagos no respondió. Inténtalo de nuevo.',
  TOUR_ALREADY_STARTED: 'El tour ya empezó y no se puede cancelar.',
  REVIEW_ALREADY_EXISTS: 'Ya calificaste este tour.',
  REVIEW_WINDOW_CLOSED: 'El plazo para calificar ya venció.',
  RESCHEDULE_CLOSED: 'Este cambio de fecha ya no está disponible.',
  DISPUTE_ALREADY_OPEN: 'Ya reportaste este caso.',
  PAYOUT_NOT_READY: 'Esta liquidación aún está en el plazo de reclamos.',
  PAYOUT_ON_HOLD: 'Esta liquidación espera la resolución de un reclamo.',
  PAYOUT_ALREADY_PAID: 'Esta liquidación ya figura como pagada.',
  FINE_TOO_HIGH: 'La multa supera el máximo definido en Reglas.',
  FINE_PERCENT_REQUIRED: 'Indica el porcentaje de la multa.',
  REFUND_PERCENT_REQUIRED: 'Indica el porcentaje de reembolso.',
  HIDDEN_REASON_REQUIRED: 'Indica el motivo para ocultar la reseña.',
  CANNOT_CHANGE_OWN_STATUS: 'No puedes cambiar el estado de tu propia cuenta.',
  CANCELLATION_REVIEW_RESOLVED: 'Este caso ya fue resuelto.',
  COMPLAINT_RESOLVED: 'Este reclamo ya fue resuelto.',
  STRIKE_NOT_ACTIVE: 'Este strike ya no está activo.',
  ROUTE_NOT_READY: 'La ruta necesita al menos 2 paradas de itinerario.',
  INVALID_GPX: 'El archivo GPX no es válido.',
  GPX_FILE_REQUIRED: 'Selecciona un archivo GPX.',
  INVALID_ITINERARY_STOP: 'Completa el orden y el día de la parada.',
  INVALID_START_WINDOW:
    'El inicio más temprano debe ser antes que el más tarde.',
};

const MESSAGES_EN: Record<string, string> = {
  EMAIL_NOT_VERIFIED:
    'Confirm your email in My verification before continuing.',
  INVALID_VERIFICATION_TOKEN:
    'The link expired, was already used or is not valid. Request a new one from your account.',
  VERIFICATION_UNAVAILABLE:
    'Verification is not available. Your request is saved, please try again.',
  VERIFICATION_RATE_LIMITED: 'Wait a minute before requesting another email.',
  INVALID_CREDENTIALS: 'The email or password is not correct.',
  EMAIL_ALREADY_REGISTERED:
    'That email already has an account. Try signing in.',
  USER_SUSPENDED: 'This account is suspended.',
  INVALID_TOKEN: 'Your session ended. Please sign in again.',
  ROUTE_NOT_FOUND: 'We could not find that trail.',
  WEATHER_UNAVAILABLE: 'The forecast is not available right now.',
  START_TIME_OUTSIDE_WINDOW:
    'That time is outside the suggested schedule for this trail.',
  BAD_REQUEST: 'Check the form details.',
  ALREADY_STARTED: 'You already confirmed this tour.',
  START_WINDOW_CLOSED:
    'You can confirm from one hour before until 24 hours after the end.',
  INVALID_BOOKING_STATUS: 'This booking no longer allows that action.',
  GUIDE_NOT_AVAILABLE: 'That guide is not available on that date.',
  BOOKING_NOT_FOUND: 'We could not find that booking.',
  HELP_WINDOW_CLOSED: 'You can ask for help only while the tour is running.',
  HELP_ALREADY_OPEN: 'You already have an open help request for this tour.',
  COMPLAINT_WINDOW_CLOSED:
    'You can file a complaint from the start of the tour until 72 hours after it ends.',
  COMPLAINT_ALREADY_EXISTS: 'You already filed a complaint for this tour.',
  NO_SHOW_REPORT_NOT_ALLOWED: 'You can report it after waiting 30 minutes.',
  DEPARTURE_CLOSED: 'Registration for this departure is closed.',
  NOT_ENOUGH_SEATS: 'There are not enough seats left.',
  ALREADY_JOINED: 'You already joined this departure.',
  BOOKING_ALREADY_REQUESTED: 'You already have a request for that tour.',
  INSUFFICIENT_ADVANCE: 'Please book further in advance.',
  TOO_MANY_PEOPLE: 'Too many people for this tour.',
  GUIDE_NOT_AUTHORIZED_FOR_ROUTE: 'That guide is not available for this trail.',
  PAYMENT_WINDOW_CLOSED: 'The payment window has closed.',
  PAYMENT_NOT_COMPLETED: 'The payment was not completed. Please try again.',
  PAYMENT_PROVIDER_ERROR:
    'The payment service did not respond. Please try again.',
  TOUR_ALREADY_STARTED: 'The tour already started and cannot be cancelled.',
  REVIEW_ALREADY_EXISTS: 'You already rated this tour.',
  REVIEW_WINDOW_CLOSED: 'The time to rate this tour has ended.',
  RESCHEDULE_CLOSED: 'This date change is no longer available.',
  DISPUTE_ALREADY_OPEN: 'You already reported this case.',
};

function isEnglish() {
  return document.documentElement.lang === 'en';
}

function messageFor(code: string) {
  if (isEnglish()) {
    return (
      MESSAGES_EN[code] ?? 'Something went wrong. Please try again in a moment.'
    );
  }
  return MESSAGES[code] ?? 'Algo salió mal. Intenta de nuevo en un momento.';
}

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
  if (init.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      'NETWORK',
      isEnglish()
        ? 'We could not reach the server.'
        : 'No pudimos conectar con el servidor.',
    );
  }

  if (response.ok) {
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string | string[];
  };
  const code = body.error ?? 'HTTP_ERROR';
  throw new ApiError(
    response.status,
    code,
    code === 'BAD_REQUEST' && body.message
      ? Array.isArray(body.message)
        ? body.message.join('. ')
        : body.message
      : messageFor(code),
  );
}
