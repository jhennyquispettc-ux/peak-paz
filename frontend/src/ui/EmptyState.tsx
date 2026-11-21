import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export default function EmptyState({
  title,
  children,
  icon: Icon = Inbox,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" />
      <p className="body-strong">{title}</p>
      {children && <p className="small muted">{children}</p>}
    </div>
  );
}
