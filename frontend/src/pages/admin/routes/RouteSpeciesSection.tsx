import { useState } from 'react';
import {
  listSpecies,
  setRouteSpecies,
  type RouteDetail,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import { useResource } from '../../../hooks/useResource';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import LoadingState from '../../../ui/LoadingState';
import { useToast } from '../../../ui/Toast';
import { SPECIES_KINDS } from './routeLabels';

export default function RouteSpeciesSection({
  route,
  onChanged,
}: {
  route: RouteDetail;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const catalog = useResource(listSpecies, []);
  const [selected, setSelected] = useState(
    () => new Set(route.species.map((item) => item.id)),
  );
  const { busy, error, run } = useAction();

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (catalog.error) {
    return (
      <ErrorState
        message={catalog.error}
        onRetry={() => void catalog.reload()}
      />
    );
  }
  if (!catalog.data) return <LoadingState />;
  if (catalog.data.length === 0) {
    return (
      <div className="card">
        <EmptyState title="El catálogo de especies está vacío.">
          Agrégalas en Rutas, pestaña Especies.
        </EmptyState>
      </div>
    );
  }
  return (
    <section className="card form-stack">
      <h2 className="h3">Flora y fauna de la ruta</h2>
      <div className="species-grid">
        {catalog.data.map((item) => (
          <label key={item.id} className="check-row">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
            />
            <span>
              {item.commonNameEs}{' '}
              <small className="muted">{SPECIES_KINDS[item.kind]}</small>
            </span>
          </label>
        ))}
      </div>
      {error && <ErrorState message={error} />}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await setRouteSpecies(route.id, [...selected]);
              await onChanged();
              toast('Especies guardadas.');
            })
          }
        >
          Guardar especies
        </button>
      </div>
    </section>
  );
}
