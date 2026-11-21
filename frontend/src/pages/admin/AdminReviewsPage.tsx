import { Star } from 'lucide-react';
import { useState } from 'react';
import {
  listReviews,
  setReviewVisibility,
  type AdminReview,
} from '../../api/adminManage';
import { useAction } from '../../hooks/useAction';
import { useCaseList } from '../../hooks/useCaseList';
import { dateOnly } from '../../lib/format';
import type { Page } from '../../api/types';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { Field } from '../../ui/Field';
import FilterChips from '../../ui/FilterChips';
import LoadingState from '../../ui/LoadingState';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import Pagination from '../../ui/Pagination';
import { useToast } from '../../ui/Toast';

type Filter = 'visible' | 'hidden';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" role="img" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          fill={value <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

function HideModal({
  review,
  onClose,
  onDone,
}: {
  review: AdminReview;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal
      title="Ocultar reseña"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy || reason.trim().length < 5}
            onClick={() =>
              void run(async () => {
                await setReviewVisibility(review.id, true, reason.trim());
                await onDone();
              })
            }
          >
            Ocultar reseña
          </button>
        </>
      }
    >
      <p>{review.comment ?? 'Reseña sin comentario.'}</p>
      <Field
        label="Motivo"
        value={reason}
        onChange={setReason}
        rows={3}
        maxLength={500}
        placeholder="Explica por qué se oculta"
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function AdminReviewsPage() {
  const toast = useToast();
  const [hiding, setHiding] = useState<AdminReview | null>(null);
  const { busy, error, run } = useAction();
  const { filter, setFilter, page, setPage, list } = useCaseList<
    AdminReview,
    Filter
  >(
    (status, current): Promise<Page<AdminReview>> =>
      listReviews(status === 'hidden', current),
    'visible',
  );
  const rows = list.data?.data ?? [];
  return (
    <div className="page-stack">
      <PageHeader
        title="Reseñas"
        intro="Modera lo que los turistas publican sobre guías y agencias."
      />
      <FilterChips
        label="Visibilidad"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'visible', label: 'Publicadas' },
          { value: 'hidden', label: 'Ocultas' },
        ]}
      />
      {error && <ErrorState message={error} />}
      {list.error && (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      )}
      {!list.data && !list.error && <LoadingState />}
      {list.data && rows.length === 0 && (
        <div className="card">
          <EmptyState title="No hay reseñas en este estado." />
        </div>
      )}
      {rows.length > 0 && (
        <ul className="notice-list">
          {rows.map((review) => (
            <li key={review.id} className="card notice-card">
              <div className="notice-text">
                <Stars rating={review.rating} />
                <p>{review.comment ?? 'Sin comentario.'}</p>
                <p className="small muted">
                  {review.touristFirstName ?? 'Turista'} sobre{' '}
                  {review.agencyName ?? review.guideName ?? 'proveedor'},{' '}
                  {review.routeNameEs ?? 'sin ruta'},{' '}
                  {dateOnly(review.createdAt)}
                </p>
                {review.hiddenReason && (
                  <p className="small">Motivo: {review.hiddenReason}</p>
                )}
              </div>
              <div className="notice-actions">
                {review.hiddenAt ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await setReviewVisibility(review.id, false);
                        await list.reload();
                        toast('Reseña publicada de nuevo.');
                      })
                    }
                  >
                    Publicar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setHiding(review)}
                  >
                    Ocultar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.data && (
        <Pagination
          page={page}
          totalPages={list.data.meta.totalPages}
          onChange={setPage}
        />
      )}
      {hiding && (
        <HideModal
          review={hiding}
          onClose={() => setHiding(null)}
          onDone={async () => {
            setHiding(null);
            await list.reload();
            toast('Reseña oculta.');
          }}
        />
      )}
    </div>
  );
}
