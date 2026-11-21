import { CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  listNotices,
  markAllNoticesRead,
  markNoticeRead,
  noticeHref,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { errorMessage, useResource } from "../hooks/useResource";
import { useI18n } from "../i18n/I18nContext";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import FilterChips from "../ui/FilterChips";
import LoadingState from "../ui/LoadingState";
import PageHeader from "../ui/PageHeader";
import Pagination from "../ui/Pagination";
import { useToast } from "../ui/Toast";

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t, dateLocale } = useI18n();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const notices = useResource(
    () => listNotices(page, 15, filter === "unread"),
    [page, filter],
  );

  async function run(action: () => Promise<unknown>, done?: string) {
    setActionError(null);
    try {
      await action();
      await notices.reload();
      if (done) toast(done);
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={t("notices.title")}
        intro={t("notices.intro")}
        actions={
          notices.data && notices.data.unread > 0 ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void run(markAllNoticesRead, t("notices.done"))}
            >
              <CheckCheck aria-hidden="true" />
              {t("notices.markAll")}
            </button>
          ) : undefined
        }
      />
      <FilterChips
        label={t("notices.filter")}
        value={filter}
        options={[
          { value: "all", label: t("notices.all") },
          {
            value: "unread",
            label: `${t("notices.unread")} (${notices.data?.unread ?? 0})`,
          },
        ]}
        onChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
      />
      {actionError && <ErrorState message={actionError} />}
      {notices.error && (
        <ErrorState
          message={notices.error}
          onRetry={() => void notices.reload()}
        />
      )}
      {notices.loading && !notices.data && <LoadingState />}
      {notices.data?.data.length === 0 && (
        <EmptyState
          title={
            filter === "unread" ? t("notices.emptyUnread") : t("notices.empty")
          }
        />
      )}
      {notices.data && notices.data.data.length > 0 && (
        <ul className="notice-list">
          {notices.data.data.map((notice) => (
            <li
              key={notice.id}
              className={`card notice-card ${notice.readAt ? "" : "unread"}`}
            >
              <div className="notice-text">
                <p className="body-strong">{notice.subject}</p>
                <p className="small">{notice.body}</p>
                <p className="caption muted">
                  {new Date(notice.createdAt).toLocaleString(dateLocale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="notice-actions">
                {user && notice.link && (
                  <Link
                    to={noticeHref(notice.link, user.role)}
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      if (!notice.readAt) {
                        void markNoticeRead(notice.id).catch(() => undefined);
                      }
                    }}
                  >
                    {t("notices.open")}
                  </Link>
                )}
                {!notice.readAt && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => void run(() => markNoticeRead(notice.id))}
                  >
                    {t("notices.markRead")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {notices.data && (
        <Pagination
          page={page}
          totalPages={notices.data.meta.totalPages}
          onChange={setPage}
        />
      )}
    </div>
  );
}
