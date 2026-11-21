import { Star } from 'lucide-react';
import { useState } from 'react';
import type { ProviderReview } from '../../api/guide';
import type { Page } from '../../api/types';
import { useResource } from '../../hooks/useResource';
import { dateOnly } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import Pagination from '../../ui/Pagination';

export default function ProviderReviewsPage({
  load,
  average,
  count,
}: {
  load: (page: number) => Promise<Page<ProviderReview>>;
  average?: number;
  count?: number;
}) {
  const [page, setPage] = useState(1);
  const list = useResource(() => load(page), [page]);
  const rows = list.data?.data ?? [];
  return (
    <div className="page-stack">
      <PageHeader
        title="Reseñas"
        intro={
          count
            ? `${Number(average ?? 0).toFixed(1)} de 5 en ${count} ${count === 1 ? 'reseña' : 'reseñas'}.`
            : 'Lo que dicen los turistas sobre tu trabajo.'
        }
      />
      {list.error && (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      )}
      {!list.data && !list.error && <LoadingState />}
      {list.data && rows.length === 0 && (
        <div className="card">
          <EmptyState icon={Star} title="Todavía no tienes reseñas." />
        </div>
      )}
      {rows.length > 0 && (
        <ul className="notice-list">
          {rows.map((review) => (
            <li key={review.id} className="card notice-card">
              <div className="notice-text">
                <span
                  className="stars"
                  role="img"
                  aria-label={`${review.rating} de 5 estrellas`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      aria-hidden="true"
                      fill={value <= review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </span>
                <p>{review.comment ?? 'Sin comentario.'}</p>
                <p className="small muted">
                  {review.touristFirstName ?? 'Turista'},{' '}
                  {review.routeNameEs ?? 'sin ruta'},{' '}
                  {dateOnly(review.createdAt)}
                </p>
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
    </div>
  );
}
