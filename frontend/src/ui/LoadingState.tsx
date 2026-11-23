import { useI18n } from '../i18n/I18nContext';

export default function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="state-box" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label ?? t('state.loading')}</span>
    </div>
  );
}
