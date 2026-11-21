import { getGuideMe, listGuideReviews } from '../../api/guide';
import { useResource } from '../../hooks/useResource';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import ProviderReviewsPage from '../provider/ProviderReviewsPage';

export default function GuideReviewsPage() {
  const me = useResource(getGuideMe, []);
  if (me.error) {
    return <ErrorState message={me.error} onRetry={() => void me.reload()} />;
  }
  if (!me.data) return <LoadingState />;
  const { id, ratingAverage, reviewsCount } = me.data;
  return (
    <ProviderReviewsPage
      load={(page) => listGuideReviews(id, page)}
      average={ratingAverage}
      count={reviewsCount}
    />
  );
}
