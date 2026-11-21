import { Mountain } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { baseFor, findNavItem } from "../../layout/navigation";
import EmptyState from "../../ui/EmptyState";
import PageHeader from "../../ui/PageHeader";

export default function ComingSoonPage({
  title,
  phase,
  what,
}: {
  title?: string;
  phase?: string;
  what?: string;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const path = user
    ? pathname.replace(baseFor(user.role), "").replace(/^\//, "").split("/")[0]
    : "";
  const item = user ? findNavItem(user.role, path) : undefined;
  const heading = title ?? item?.label ?? t("nav.panel");
  return (
    <div className="page-stack">
      <PageHeader title={heading} />
      <div className="card">
        <EmptyState
          icon={Mountain}
          title={t("soon.title", { phase: phase ?? item?.phase ?? "" })}
        >
          {t("soon.body", { what: what ?? item?.what ?? heading })}
        </EmptyState>
      </div>
    </div>
  );
}
