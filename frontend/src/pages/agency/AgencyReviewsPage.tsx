import { getAgencyMe, listAgencyReviews } from '../../api/agency';
import { useResource } from '../../hooks/useResource';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import ProviderReviewsPage from '../provider/ProviderReviewsPage';

export default function AgencyReviewsPage() {
  const me = useResource(getAgencyMe, []);
  if (me.error) {
    return <ErrorState message={me.error} onRetry={() => void me.reload()} />;
  }
  if (!me.data) return <LoadingState />;
  const { id, ratingAverage, reviewsCount } = me.data;
  return (
    <ProviderReviewsPage
      load={(page) => listAgencyReviews(id, page)}
      average={ratingAverage}
      count={reviewsCount}
    />
  );
}
