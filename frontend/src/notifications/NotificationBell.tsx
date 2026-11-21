import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  listNotices,
  markNoticeRead,
  noticeHref,
  type Notice,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { noticesPathFor } from "../auth/roles";
import { useI18n } from "../i18n/I18nContext";

const REFRESH_MS = 60_000;

export default function NotificationBell({
  onDark = false,
}: {
  onDark?: boolean;
}) {
  const { user } = useAuth();
  const { t, dateLocale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const page = await listNotices(1, 6, false);
      setNotices(page.data);
      setUnread(page.unread);
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [user, refresh, location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!user || !available) return null;

  async function openNotice(notice: Notice) {
    if (!user) return;
    if (!notice.readAt) await markNoticeRead(notice.id).catch(() => undefined);
    setOpen(false);
    await refresh();
    navigate(noticeHref(notice.link, user.role));
  }

  return (
    <div className="bell" ref={box}>
      <button
        type="button"
        className={`icon-btn ${onDark ? "on-dark" : ""}`}
        aria-label={t("notices.bell", { count: unread })}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell aria-hidden="true" />
        {unread > 0 && (
          <span className="bell-count" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="bell-menu">
          <p className="body-strong">{t("notices.title")}</p>
          {notices.length === 0 ? (
            <p className="small muted">{t("notices.empty")}</p>
          ) : (
            <ul>
              {notices.map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    className={notice.readAt ? "" : "unread"}
                    onClick={() => void openNotice(notice)}
                  >
                    <span className="small notice-subject">
                      {notice.subject}
                    </span>
                    <span className="caption muted">
                      {new Date(notice.createdAt).toLocaleString(dateLocale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to={noticesPathFor(user.role)} className="bell-all">
            {t("notices.seeAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
