import { ArrowLeft, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getMyBooking,
  startPayment,
  type StartedPayment,
} from '../../api/tourist';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { useI18n } from '../../i18n/I18nContext';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import PolicySummary from './PolicySummary';
import { bolivianos, dayLabel, momentLabel } from './touristFormat';

export const PENDING_PAYMENT_KEY = 'peakpaz.pendingPayment';

export default function PaymentPage() {
  const { id = '' } = useParams();
  const { locale, pick, dateLocale } = useI18n();
  const navigate = useNavigate();
  const booking = useResource(() => getMyBooking(id), [id]);
  const [accepted, setAccepted] = useState(false);
  const [payment, setPayment] = useState<StartedPayment | null>(null);
  const { busy, error, run } = useAction();
  const data = booking.data;

  if (booking.error) {
    return (
      <ErrorState
        message={booking.error}
        onRetry={() => void booking.reload()}
      />
    );
  }
  if (!data) return <LoadingState />;

  if (data.status !== 'ACCEPTED') {
    return (
      <div className="page-stack">
        <p className="notice">
          {pick(
            'Esta reserva no tiene un pago pendiente.',
            'This booking has no pending payment.',
          )}
        </p>
        <Link to={`/reservas/${data.id}`} className="btn btn-ghost align-start">
          {pick('Ver reserva', 'See booking')}
        </Link>
      </div>
    );
  }

  const continueToPay = () =>
    run(async () => {
      const started = await startPayment(data.id);
      sessionStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify({ bookingId: data.id, paymentId: started.id }),
      );
      if (started.provider === 'FAKE') {
        setPayment(started);
      } else {
        window.location.assign(started.approveUrl);
      }
    });

  return (
    <div className="page-stack narrow">
      <Link to={`/reservas/${data.id}`} className="back-link">
        <ArrowLeft aria-hidden="true" />
        {pick('Volver a la reserva', 'Back to booking')}
      </Link>
      <PageHeader
        eyebrow={data.code}
        title={pick('Pagar reserva', 'Pay booking')}
      />
      <section className="card form-stack">
        <Facts
          items={[
            {
              label: pick('Ruta', 'Trail'),
              value: locale === 'en' ? data.route.nameEn : data.route.nameEs,
            },
            {
              label: pick('Fecha', 'Date'),
              value: dayLabel(data.tourDate, data.startTime, dateLocale),
            },
            { label: pick('Personas', 'People'), value: data.peopleCount },
            {
              label: pick('Total', 'Total'),
              value: (
                <strong>{bolivianos(data.totalAmount, dateLocale)}</strong>
              ),
            },
            ...(data.payBy
              ? [
                  {
                    label: pick('Paga antes de', 'Pay before'),
                    value: momentLabel(data.payBy, dateLocale),
                  },
                ]
              : []),
          ]}
        />
      </section>
      {error && <ErrorState message={error} />}
      {payment ? (
        <section className="card form-stack test-payment">
          <p className="test-tag">
            <FlaskConical aria-hidden="true" />
            {pick('Pago de prueba', 'Test payment')}
          </p>
          <p>
            {pick(
              'Esta pantalla simula PayPal. No se cobra dinero real.',
              'This screen simulates PayPal. No real money is charged.',
            )}
          </p>
          <p className="h2">
            {payment.chargedAmount} {payment.chargeCurrency}
          </p>
          <p className="small muted">
            {pick('Equivale a', 'Equals')}{' '}
            {bolivianos(payment.amountBob, dateLocale)}
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                sessionStorage.removeItem(PENDING_PAYMENT_KEY);
                setPayment(null);
              }}
            >
              {pick('Volver', 'Back')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const url = new URL(payment.approveUrl);
                navigate(`${url.pathname}${url.search}`);
              }}
            >
              {pick('Aprobar pago', 'Approve payment')}
            </button>
          </div>
        </section>
      ) : (
        <section className="card form-stack">
          <PolicySummary />
          <label className="check-row">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            {pick(
              'Leí y acepto los términos y las políticas',
              'I have read and accept the terms and policies',
            )}
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!accepted || busy}
              onClick={() => void continueToPay()}
            >
              {pick('Continuar al pago', 'Continue to payment')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
