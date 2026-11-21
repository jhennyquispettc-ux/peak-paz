import { useState } from 'react';
import {
  getGuideMe,
  listPublicRoutes,
  requestGuideRoute,
  withdrawGuideRoute,
  type GuideRoute,
} from '../../api/guide';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import ConfirmDialog from '../../ui/ConfirmDialog';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { SelectField } from '../../ui/Field';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge, { type StatusTone } from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';

const STATUS: Record<
  GuideRoute['status'],
  { label: string; tone: StatusTone }
> = {
  PENDING: { label: 'En revisión', tone: 'warning' },
  APPROVED: { label: 'Autorizada', tone: 'success' },
  REJECTED: { label: 'Rechazada', tone: 'muted' },
};

async function loadRoutes() {
  const [me, routes] = await Promise.all([getGuideMe(), listPublicRoutes()]);
  return { me, routes: routes.data };
}

export default function GuideRoutesPage() {
  const toast = useToast();
  const data = useResource(loadRoutes, []);
  const [selected, setSelected] = useState('');
  const [removing, setRemoving] = useState<GuideRoute | null>(null);
  const { busy, error, run } = useAction();
  const mine = data.data?.me.routes ?? [];
  const taken = new Set(mine.map((item) => item.routeId));
  const options = (data.data?.routes ?? [])
    .filter((route) => !taken.has(route.id))
    .map((route) => ({ value: route.id, label: route.nameEs }));
  const value = options.some((item) => item.value === selected)
    ? selected
    : (options[0]?.value ?? '');
  return (
    <div className="page-stack">
      <PageHeader
        title="Mis rutas"
        intro="Solo apareces en las rutas que el administrador autorizó."
      />
      {data.error && (
        <ErrorState message={data.error} onRetry={() => void data.reload()} />
      )}
      {error && <ErrorState message={error} />}
      {!data.data && !data.error && <LoadingState />}
      {data.data && (
        <>
          {options.length > 0 && (
            <section className="card form-stack">
              <h2 className="h3">Pedir autorización</h2>
              <SelectField
                label="Ruta"
                value={value}
                options={options}
                onChange={setSelected}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !value}
                  onClick={() =>
                    void run(async () => {
                      await requestGuideRoute(value);
                      await data.reload();
                      toast('Solicitud enviada.');
                    })
                  }
                >
                  Pedir autorización
                </button>
              </div>
            </section>
          )}
          {mine.length === 0 ? (
            <div className="card">
              <EmptyState title="Todavía no tienes rutas." />
            </div>
          ) : (
            <ul className="queue">
              {mine.map((route) => (
                <li key={route.id} className="card queue-item">
                  <span className="queue-main body-strong">
                    {route.routeNameEs}
                  </span>
                  <StatusBadge tone={STATUS[route.status].tone}>
                    {STATUS[route.status].label}
                  </StatusBadge>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setRemoving(route)}
                  >
                    Retirar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {removing && (
        <ConfirmDialog
          title="Retirar ruta"
          confirmLabel="Retirar ruta"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await withdrawGuideRoute(removing.routeId);
            await data.reload();
            toast('Ruta retirada.');
          }}
        >
          <p>
            Dejarás de aparecer en <strong>{removing.routeNameEs}</strong>. Para
            volver, necesitarás una nueva autorización.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
