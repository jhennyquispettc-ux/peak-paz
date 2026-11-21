import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  addPhoto,
  deletePhoto,
  type RouteDetail,
  type RoutePhoto,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import { Field } from '../../../ui/Field';
import { useToast } from '../../../ui/Toast';
import { optionalText } from './routeLabels';

export default function RoutePhotosSection({
  route,
  onChanged,
}: {
  route: RouteDetail;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [credit, setCredit] = useState('');
  const [removing, setRemoving] = useState<RoutePhoto | null>(null);
  const { busy, error, run } = useAction();
  const photos = [...route.photos].sort((a, b) => a.sortOrder - b.sortOrder);

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await addPhoto(route.id, {
        url: url.trim(),
        publicId: `enlace-${crypto.randomUUID()}`,
        credit: optionalText(credit),
        sortOrder: Math.min(photos.length, 100),
      });
      setUrl('');
      setCredit('');
      await onChanged();
      toast('Foto agregada.');
    });
  }

  return (
    <section className="page-stack">
      <form className="card form-stack" onSubmit={submit}>
        <h2 className="h3">Agregar foto por enlace</h2>
        <div className="form-grid">
          <Field
            label="Enlace https de la imagen"
            type="url"
            required
            maxLength={500}
            value={url}
            onChange={setUrl}
            placeholder="https://"
          />
          <Field
            label="Crédito"
            maxLength={120}
            value={credit}
            onChange={setCredit}
          />
        </div>
        {error && <ErrorState message={error} />}
        <div className="form-actions">
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            Agregar foto
          </button>
        </div>
      </form>
      {photos.length === 0 ? (
        <div className="card">
          <EmptyState title="Esta ruta todavía no tiene fotos." />
        </div>
      ) : (
        <ul className="photo-grid">
          {photos.map((photo, index) => (
            <li key={photo.id} className="card photo-card">
              <img
                src={photo.url}
                alt={`Foto ${index + 1} de ${route.nameEs}`}
              />
              <div>
                <span className="small muted">
                  {index === 0 ? 'Portada' : (photo.credit ?? 'Sin crédito')}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Quitar foto ${index + 1}`}
                  onClick={() => setRemoving(photo)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <ConfirmDialog
          title="Quitar foto"
          confirmLabel="Quitar foto"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deletePhoto(route.id, removing.id);
            await onChanged();
            toast('Foto quitada.');
          }}
        >
          <p>La foto dejará de mostrarse en esta ruta.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
