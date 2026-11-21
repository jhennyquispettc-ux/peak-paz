import { TriangleAlert } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="form-error error-state" role="alert">
      <TriangleAlert aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={onRetry}
        >
          {t('state.retry')}
        </button>
      )}
    </div>
  );
}
