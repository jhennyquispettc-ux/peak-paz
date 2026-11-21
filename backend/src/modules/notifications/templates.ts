import { Language } from '../users/users.enums.js';
import { NotificationType } from './notifications.enums.js';

export type NotificationData = Record<string, string | number>;

export interface RenderedNotification {
  subject: string;
  body: string;
  link: string | null;
}

interface Template {
  subject: string;
  body: string;
  link?: string;
}

type Templates = Record<NotificationType, Record<Language, Template>>;

const TEMPLATES: Templates = {
  [NotificationType.BOOKING_REQUESTED]: {
    es: {
      subject: 'Nueva solicitud de reserva {code}',
      body: 'Tienes una solicitud para {route} el {date}. Respóndela antes de que venza el plazo.',
      link: '/guia/reservas/{bookingId}',
    },
    en: {
      subject: 'New booking request {code}',
      body: 'You have a request for {route} on {date}. Answer it before it expires.',
      link: '/guia/reservas/{bookingId}',
    },
  },
  [NotificationType.BOOKING_ACCEPTED]: {
    es: {
      subject: 'Tu reserva {code} fue aceptada',
      body: 'El guía aceptó tu solicitud para {route} el {date}. Paga dentro de los próximos minutos para confirmarla.',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'Your booking {code} was accepted',
      body: 'The guide accepted your request for {route} on {date}. Pay within the next minutes to confirm it.',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.BOOKING_REJECTED]: {
    es: {
      subject: 'Tu solicitud {code} no fue aceptada',
      body: 'El guía no puede atenderte en {route} el {date}. Puedes buscar otro guía disponible.',
      link: '/rutas',
    },
    en: {
      subject: 'Your request {code} was not accepted',
      body: 'The guide cannot take you to {route} on {date}. You can look for another available guide.',
      link: '/rutas',
    },
  },
  [NotificationType.BOOKING_CONFIRMED]: {
    es: {
      subject: 'Reserva {code} confirmada',
      body: 'Recibimos tu pago. Tu salida a {route} el {date} está confirmada.',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'Booking {code} confirmed',
      body: 'We received your payment. Your trip to {route} on {date} is confirmed.',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.NEW_PAID_BOOKING]: {
    es: {
      subject: 'Reserva {code} pagada',
      body: 'El turista pagó la reserva de {route} el {date}. Recuerda reconfirmar tu asistencia antes del tour.',
      link: '/guia/reservas/{bookingId}',
    },
    en: {
      subject: 'Booking {code} paid',
      body: 'The tourist paid the booking for {route} on {date}. Remember to reconfirm before the tour.',
      link: '/guia/reservas/{bookingId}',
    },
  },
  [NotificationType.BOOKING_CANCELLED]: {
    es: {
      subject: 'Reserva {code} cancelada',
      body: 'La salida a {route} el {date} fue cancelada. Motivo: {reason}. {refund}',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'Booking {code} cancelled',
      body: 'The trip to {route} on {date} was cancelled. Reason: {reason}. {refund}',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.DEPARTURE_CONFIRMED]: {
    es: {
      subject: 'La salida a {route} se realiza',
      body: 'La salida grupal del {date} alcanzó el mínimo de personas y está confirmada.',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'The trip to {route} is on',
      body: 'The group departure on {date} reached the minimum number of people and is confirmed.',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.RECONFIRMATION_MISSED]: {
    es: {
      subject: 'El guía no reconfirmó la reserva {code}',
      body: 'El guía todavía no reconfirmó tu salida a {route} el {date}. Puedes esperar o cancelar ahora con reembolso del 100%.',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'The guide did not reconfirm booking {code}',
      body: 'The guide has not reconfirmed your trip to {route} on {date}. You can wait or cancel now with a full refund.',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.TOUR_CONFIRM_REMINDER]: {
    es: {
      subject: 'Confirma tu tour {code}',
      body: 'El guía confirmó tu salida a {route} el {date}. Confírmala tú también. Si no respondes, se dará por realizada 24 horas después del fin del tour. Si hubo un problema, podrás presentar un reclamo.',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'Confirm your tour {code}',
      body: 'The guide confirmed your trip to {route} on {date}. Please confirm it too. If you do not answer, it will count as done 24 hours after the tour ends. If something went wrong, you can file a complaint.',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.RESCHEDULE_PROPOSED]: {
    es: {
      subject: 'El guía propone otra fecha para {code}',
      body: 'El guía propone mover tu salida a {route} del {date} al {newDate}. Motivo: {reason}. Responde antes del {respondBy}.',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'The guide proposes another date for {code}',
      body: 'The guide proposes moving your trip to {route} from {date} to {newDate}. Reason: {reason}. Answer before {respondBy}.',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.RESCHEDULE_ANSWERED]: {
    es: {
      subject: 'Respuesta al cambio de fecha de {code}',
      body: 'El turista {answer} la nueva fecha {newDate} para {route}.',
      link: '/guia/reservas/{bookingId}',
    },
    en: {
      subject: 'Answer to the date change for {code}',
      body: 'The tourist {answer} the new date {newDate} for {route}.',
      link: '/guia/reservas/{bookingId}',
    },
  },
  [NotificationType.CASE_OPENED]: {
    es: {
      subject: 'Nuevo caso para revisar: {kind}',
      body: 'Hay un caso nuevo para revisar: {kind}. Código: {code}.',
      link: '/admin/{section}',
    },
    en: {
      subject: 'New case to review: {kind}',
      body: 'There is a new case to review: {kind}. Code: {code}.',
      link: '/admin/{section}',
    },
  },
  [NotificationType.DISPUTE_RESOLVED]: {
    es: {
      subject: 'Disputa resuelta para {code}',
      body: 'El administrador revisó lo ocurrido en {route} el {date}. Resultado: {decision}. {resolution}',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'Dispute resolved for {code}',
      body: 'The administrator reviewed what happened on {route} on {date}. Result: {decision}. {resolution}',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.COMPLAINT_RECEIVED]: {
    es: {
      subject: 'Recibiste un reclamo por {code}',
      body: 'Un turista reclamó por el tour a {route} del {date}. El administrador lo revisará y la liquidación queda retenida hasta entonces.',
      link: '/panel/sanciones',
    },
    en: {
      subject: 'You received a complaint for {code}',
      body: 'A tourist filed a complaint about the trip to {route} on {date}. The administrator will review it and the payout is on hold meanwhile.',
      link: '/panel/sanciones',
    },
  },
  [NotificationType.HELP_ATTENDED]: {
    es: {
      subject: 'Atendimos tu pedido de ayuda en {code}',
      body: 'Sobre tu salida a {route}: {note}',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'We handled your help request for {code}',
      body: 'About your trip to {route}: {note}',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.COMPLAINT_RESOLVED]: {
    es: {
      subject: 'Reclamo resuelto para {code}',
      body: 'El reclamo por {route} fue {decision}. Reembolso: {refundPercent}%. {resolution}',
      link: '/reservas/{bookingId}',
    },
    en: {
      subject: 'Complaint resolved for {code}',
      body: 'The complaint about {route} was {decision}. Refund: {refundPercent}%. {resolution}',
      link: '/reservas/{bookingId}',
    },
  },
  [NotificationType.SANCTION_APPLIED]: {
    es: {
      subject: 'Recibiste una sanción en Peak Paz',
      body: 'Se registró un strike por {reason}. Tienes {activeStrikes} strikes activos. {consequence}',
      link: '/panel/sanciones',
    },
    en: {
      subject: 'You received a sanction on Peak Paz',
      body: 'A strike was recorded for {reason}. You have {activeStrikes} active strikes. {consequence}',
      link: '/panel/sanciones',
    },
  },
  [NotificationType.REVIEW_RECEIVED]: {
    es: {
      subject: 'Nueva reseña de {rating} estrellas',
      body: 'Un turista calificó el tour a {route} con {rating} de 5.',
      link: '/panel/resenas',
    },
    en: {
      subject: 'New {rating} star review',
      body: 'A tourist rated the trip to {route} {rating} out of 5.',
      link: '/panel/resenas',
    },
  },
};

const WORDS: Record<Language, Record<string, string>> = {
  es: {
    ACCEPTED: 'aceptado',
    REJECTED: 'rechazado',
    RESCHEDULE_ACCEPTED: 'aceptó',
    RESCHEDULE_REJECTED: 'rechazó',
    TOUR_HAPPENED: 'el tour se realizó',
    GUIDE_NO_SHOW: 'el guía no se presentó',
    CANCELLED_WITHOUT_WEATHER: 'una cancelación sin causa justificada',
    NO_SHOW: 'no presentarse al tour',
    COMPLAINT: 'un reclamo aceptado',
    NONE: 'Si llegas al límite, tu perfil se ocultará del catálogo.',
    HIDDEN: 'Tu perfil quedó oculto del catálogo por un tiempo.',
    SUSPENDED: 'Tu cuenta fue suspendida de forma permanente.',
    FULL_REFUND: 'Se reembolsa el 100% de lo pagado.',
    NO_REFUND: '',
    NO_SHOW_CASE: 'el turista reporta que el guía no llegó',
    START_MISMATCH_CASE: 'falta la confirmación de inicio de una de las partes',
    CANCELLATION_CASE: 'cancelación de un proveedor',
    COMPLAINT_CASE: 'reclamo de un turista',
    HELP_CASE: 'un turista pide ayuda durante el tour',
  },
  en: {
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    RESCHEDULE_ACCEPTED: 'accepted',
    RESCHEDULE_REJECTED: 'rejected',
    TOUR_HAPPENED: 'the tour took place',
    GUIDE_NO_SHOW: 'the guide did not show up',
    CANCELLED_WITHOUT_WEATHER: 'a cancellation without a valid reason',
    NO_SHOW: 'not showing up for the tour',
    COMPLAINT: 'an accepted complaint',
    NONE: 'If you reach the limit, your profile will be hidden from the catalog.',
    HIDDEN: 'Your profile is hidden from the catalog for a while.',
    SUSPENDED: 'Your account was suspended permanently.',
    FULL_REFUND: 'The full amount paid is refunded.',
    NO_REFUND: '',
    NO_SHOW_CASE: 'the tourist reports that the guide did not arrive',
    START_MISMATCH_CASE: 'one side did not confirm the start',
    CANCELLATION_CASE: 'cancellation by a provider',
    COMPLAINT_CASE: 'complaint from a tourist',
    HELP_CASE: 'a tourist asks for help during the tour',
  },
};

const fill = (
  text: string,
  data: NotificationData,
  language: Language,
): string =>
  text
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = data[key];
      if (value === undefined) return '';
      return WORDS[language][String(value)] ?? String(value);
    })
    .replace(/\s+/g, ' ')
    .trim();

export function renderNotification(
  type: NotificationType,
  language: Language,
  data: NotificationData,
): RenderedNotification {
  const template = TEMPLATES[type][language] ?? TEMPLATES[type][Language.ES];
  return {
    subject: fill(template.subject, data, language).slice(0, 200),
    body: fill(template.body, data, language),
    link: template.link ? fill(template.link, data, language) : null,
  };
}
