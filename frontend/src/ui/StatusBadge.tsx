export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

export default function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
