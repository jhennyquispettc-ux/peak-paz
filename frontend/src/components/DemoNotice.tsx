import { useI18n } from "../i18n/I18nContext";

export default function DemoNotice() {
  const { pick } = useI18n();
  return (
    <aside
      className="demo-notice"
      aria-label={pick("Demostración académica", "Academic demo")}
    >
      <p>
        <strong>{pick("Demostración académica.", "Academic demo.")}</strong>{" "}
        {pick(
          "Explora rutas de ejemplo. Las cuentas, reservas y pagos no están habilitados.",
          "Explore sample trails. Accounts, bookings and payments are unavailable.",
        )}
      </p>
      <a href={`${import.meta.env.BASE_URL}swagger/`}>Swagger / OpenAPI</a>
    </aside>
  );
}
