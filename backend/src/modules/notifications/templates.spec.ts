import { Language } from '../users/users.enums.js';
import { NotificationType } from './notifications.enums.js';
import { renderNotification } from './templates.js';

describe('notification templates', () => {
  it('fills the template in the language of the user', () => {
    const data = {
      code: 'PP-7K3M9QX2',
      route: 'El Choro',
      date: '2026-12-10',
      bookingId: 'abc',
    };
    expect(
      renderNotification(NotificationType.BOOKING_ACCEPTED, Language.ES, data),
    ).toEqual({
      subject: 'Tu reserva PP-7K3M9QX2 fue aceptada',
      body: 'El guía aceptó tu solicitud para El Choro el 2026-12-10. Paga dentro de los próximos minutos para confirmarla.',
      link: '/reservas/abc',
    });
    expect(
      renderNotification(NotificationType.BOOKING_ACCEPTED, Language.EN, data)
        .subject,
    ).toBe('Your booking PP-7K3M9QX2 was accepted');
  });

  it('leaves out missing values without breaking the text', () => {
    const rendered = renderNotification(
      NotificationType.BOOKING_CANCELLED,
      Language.ES,
      { code: 'PP-1', route: 'Takesi', date: '2026-12-01', reason: 'Clima' },
    );
    expect(rendered.body).toBe(
      'La salida a Takesi el 2026-12-01 fue cancelada. Motivo: Clima.',
    );
  });

  it('has a template in both languages for every type', () => {
    for (const type of Object.values(NotificationType)) {
      for (const language of Object.values(Language)) {
        expect(renderNotification(type, language, {}).subject).not.toBe('');
      }
    }
  });
});
