import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { capturePayment } from '../../api/tourist';
import { errorMessage } from '../../hooks/useResource';
import { useI18n } from '../../i18n/I18nContext';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import { useToast } from '../../ui/Toast';
import { PENDING_PAYMENT_KEY } from './PaymentPage';

export default function PaymentReturnPage() {
  const { pick } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const saved = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    if (!saved) {
      navigate('/reservas', { replace: true });
      return;
    }
    const pending = JSON.parse(saved) as {
      bookingId: string;
      paymentId: string;
    };
    setBookingId(pending.bookingId);
    capturePayment(pending.bookingId, pending.paymentId)
      .then(() => {
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
        toast(pick('Pago confirmado.', 'Payment confirmed.'));
        navigate(`/reservas/${pending.bookingId}`, { replace: true });
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [navigate, pick, toast]);

  if (error) {
    return (
      <div className="page-stack narrow">
        <ErrorState message={error} />
        {bookingId && (
          <Link
            to={`/reservas/${bookingId}`}
            className="btn btn-ghost align-start"
          >
            {pick('Volver a la reserva', 'Back to booking')}
          </Link>
        )}
      </div>
    );
  }
  return (
    <LoadingState
      label={pick('Confirmando tu pago…', 'Confirming your payment…')}
    />
  );
}
