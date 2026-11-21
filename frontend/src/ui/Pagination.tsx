import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;
  const label = t("state.page", { page, total: totalPages });
  return (
    <nav className="pagination" aria-label={label}>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
        {t("state.previous")}
      </button>
      <span className="small muted">{label}</span>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t("state.next")}
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
