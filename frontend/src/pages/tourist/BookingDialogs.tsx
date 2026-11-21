import { Star } from 'lucide-react';
import { useState } from 'react';
import {
  askForHelp,
  cancelMyBooking,
  createComplaint,
  createReview,
  getCancellationPreview,
  reportNoShow,
  type TouristBooking,
} from '../../api/tourist';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { useI18n } from '../../i18n/I18nContext';
import ChoiceGroup from '../../ui/ChoiceGroup';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import { Field } from '../../ui/Field';
import LoadingState from '../../ui/LoadingState';
import Modal from '../../ui/Modal';
import { bolivianos } from './touristFormat';

interface DialogProps {
  booking: TouristBooking;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}

export function CancelDialog({ booking, onClose, onDone }: DialogProps) {
  const { pick, dateLocale } = useI18n();
  const preview = useResource(
    () => getCancellationPreview(booking.id),
    [booking.id],
  );
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  const data = preview.data;
  const validReason = reason.trim() === '' || reason.trim().length >= 3;
  return (
    <Modal
      title={pick('Cancelar reserva', 'Cancel booking')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {pick('Volver', 'Back')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy || !data?.cancellable || !validReason}
            onClick={() =>
              void run(async () => {
                await cancelMyBooking(booking.id, reason.trim() || undefined);
                await onDone(pick('Reserva cancelada.', 'Booking cancelled.'));
              })
            }
          >
            {pick('Cancelar reserva', 'Cancel booking')}
          </button>
        </>
      }
    >
      {preview.error && <ErrorState message={preview.error} />}
      {!data && !preview.error && <LoadingState />}
      {data && !data.cancellable && (
        <p className="notice">
          {pick(
            'Esta reserva ya no se puede cancelar.',
            'This booking can no longer be cancelled.',
          )}
        </p>
      )}
      {data?.cancellable && !data.paid && (
        <p className="notice">
          {pick(
            'Todavía no pagaste, así que no hay ningún cobro.',
            'You have not paid yet, so there is no charge.',
          )}
        </p>
      )}
      {data?.cancellable && data.paid && (
        <>
          <Facts
            items={[
              {
                label: pick('Te devolvemos', 'You get back'),
                value: (
                  <strong>
                    {bolivianos(data.refundAmount, dateLocale)} (
                    {data.refundPercent} %)
                  </strong>
                ),
              },
              {
                label: pick('No se devuelve', 'Not refunded'),
                value: bolivianos(data.retainedAmount, dateLocale),
              },
            ]}
          />
          {data.guideMissedReconfirmation && (
            <p className="notice notice-info">
              {pick(
                'El guía no reconfirmó a tiempo, por eso recibes el 100 %.',
                'The guide did not reconfirm in time, so you get 100%.',
              )}
            </p>
          )}
        </>
      )}
      <Field
        label={pick('Motivo, opcional', 'Reason, optional')}
        rows={2}
        maxLength={500}
        value={reason}
        onChange={setReason}
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

type ReportPath = 'help' | 'complaint';
type ComplaintKind = 'GENERAL' | 'NO_SHOW';

export function ReportDialog({
  booking,
  hasComplaint,
  onClose,
  onDone,
}: DialogProps & { hasComplaint: boolean }) {
  const { pick } = useI18n();
  const isRunning =
    booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';
  const [path, setPath] = useState<ReportPath | null>(
    isRunning ? null : 'complaint',
  );
  const [kind, setKind] = useState<ComplaintKind>('GENERAL');
  const [description, setDescription] = useState('');
  const { busy, error, run } = useAction();
  const minLength = path === 'help' ? 10 : 20;
  const useDispute =
    kind === 'NO_SHOW' &&
    booking.type === 'PRIVATE' &&
    booking.status === 'CONFIRMED' &&
    !booking.guideStartedAt;

  const submit = () =>
    run(async () => {
      const text = description.trim();
      if (path === 'help') {
        await askForHelp(booking.id, text);
        await onDone(pick('Avisamos a Peak Paz.', 'We notified Peak Paz.'));
        return;
      }
      if (useDispute) await reportNoShow(booking.id, text);
      else
        await createComplaint(booking.id, { description: text, reason: kind });
      await onDone(
        pick('Recibimos tu reclamo.', 'We received your complaint.'),
      );
    });

  const options = [
    ...(isRunning
      ? [
          {
            value: 'help' as const,
            label: pick('Pedir ayuda ahora', 'Ask for help now'),
            hint: pick(
              'Para resolver algo durante el tour. Peak Paz te contacta. El guía no recibe este aviso.',
              'To solve something during the tour. Peak Paz contacts you. The guide is not notified.',
            ),
          },
        ]
      : []),
    ...(!hasComplaint
      ? [
          {
            value: 'complaint' as const,
            label: pick('Presentar un reclamo', 'File a complaint'),
            hint: pick(
              'Para pedir una compensación. El pago al proveedor queda retenido mientras se revisa.',
              'To request compensation. The provider payment is held during review.',
            ),
          },
        ]
      : []),
  ];

  return (
    <Modal
      title={pick('Reportar un problema', 'Report a problem')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {pick('Volver', 'Back')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!path || busy || description.trim().length < minLength}
            onClick={() => void submit()}
          >
            {pick('Enviar', 'Send')}
          </button>
        </>
      }
    >
      <ChoiceGroup
        legend={pick('¿Qué necesitas?', 'What do you need?')}
        name="report-path"
        value={path}
        onChange={setPath}
        options={options}
      />
      {path === 'complaint' && (
        <ChoiceGroup
          legend={pick('Motivo', 'Reason')}
          name="complaint-kind"
          value={kind}
          onChange={setKind}
          options={[
            {
              value: 'GENERAL',
              label: pick('Problema en el servicio', 'Service problem'),
              hint: pick(
                'Trato, seguridad, cambios de ruta u otro.',
                'Treatment, safety, route changes or other.',
              ),
            },
            {
              value: 'NO_SHOW',
              label: pick('El guía no llegó', 'The guide did not arrive'),
              hint: pick(
                'Disponible después de 30 minutos de espera.',
                'Available after waiting 30 minutes.',
              ),
            },
          ]}
        />
      )}
      {path && (
        <Field
          label={pick('Cuéntanos qué pasó', 'Tell us what happened')}
          rows={4}
          maxLength={path === 'help' ? 1000 : 2000}
          value={description}
          onChange={setDescription}
          hint={pick(
            `Mínimo ${minLength} caracteres.`,
            `At least ${minLength} characters.`,
          )}
        />
      )}
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export function ReviewDialog({ booking, onClose, onDone }: DialogProps) {
  const { pick } = useI18n();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { busy, error, run } = useAction();
  const text = comment.trim();
  return (
    <Modal
      title={pick('Calificar tour', 'Rate tour')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {pick('Volver', 'Back')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              busy || rating === 0 || (text.length > 0 && text.length < 3)
            }
            onClick={() =>
              void run(async () => {
                await createReview(booking.id, {
                  rating,
                  ...(text ? { comment: text } : {}),
                });
                await onDone(
                  pick('Gracias por tu reseña.', 'Thanks for your review.'),
                );
              })
            }
          >
            {pick('Publicar reseña', 'Post review')}
          </button>
        </>
      }
    >
      <div
        className="rating-input"
        role="radiogroup"
        aria-label={pick('Calificación', 'Rating')}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={pick(`${value} de 5`, `${value} of 5`)}
            onClick={() => setRating(value)}
          >
            <Star
              aria-hidden="true"
              fill={value <= rating ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      <Field
        label={pick('Comentario, opcional', 'Comment, optional')}
        rows={3}
        maxLength={1000}
        value={comment}
        onChange={setComment}
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}
