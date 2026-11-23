import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { uploadTrack, type RouteDetail } from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import ErrorState from '../../../ui/ErrorState';
import Facts from '../../../ui/Facts';
import { useToast } from '../../../ui/Toast';

export default function RouteTrackSection({
  route,
  onChanged,
}: {
  route: RouteDetail;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useAction();
  const points = route.track?.coordinates.length ?? 0;
  return (
    <section className="card form-stack">
      <h2 className="h3">Trazado GPX</h2>
      <p className="muted">
        Al cargar un archivo se reemplaza el trazado y se recalculan la
        distancia, los desniveles y la altitud máxima.
      </p>
      <Facts
        items={[
          {
            label: 'Puntos del trazado',
            value: points > 0 ? points : 'Sin trazado',
          },
          { label: 'Distancia', value: `${route.distanceKm} km` },
          { label: 'Subida', value: `${route.elevationGainM} m` },
          { label: 'Bajada', value: `${route.elevationLossM} m` },
        ]}
      />
      <input
        ref={input}
        type="file"
        accept=".gpx"
        className="sr-only"
        aria-label="Archivo GPX"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          void run(async () => {
            const summary = await uploadTrack(route.id, file);
            await onChanged();
            toast(`Trazado cargado con ${summary.points} puntos.`);
          });
        }}
      />
      <button
        type="button"
        className="btn btn-secondary align-start"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden="true" />
        {busy ? 'Cargando…' : 'Cargar GPX'}
      </button>
      {error && <ErrorState message={error} />}
    </section>
  );
}
