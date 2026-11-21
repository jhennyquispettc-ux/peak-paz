import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createRoute,
  deleteRoute,
  getRoute,
  setRoutePublished,
  updateRoute,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import { useResource } from '../../../hooks/useResource';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import ErrorState from '../../../ui/ErrorState';
import LoadingState from '../../../ui/LoadingState';
import PageHeader from '../../../ui/PageHeader';
import StatusBadge from '../../../ui/StatusBadge';
import { useToast } from '../../../ui/Toast';
import RouteDataForm from './RouteDataForm';
import RouteGearSection from './RouteGearSection';
import RoutePhotosSection from './RoutePhotosSection';
import RoutePointsSection from './RoutePointsSection';
import RouteSpeciesSection from './RouteSpeciesSection';
import RouteTrackSection from './RouteTrackSection';

const SECTIONS = [
  { key: 'data', label: 'Datos' },
  { key: 'track', label: 'Trazado' },
  { key: 'points', label: 'Paradas' },
  { key: 'gear', label: 'Equipo' },
  { key: 'photos', label: 'Fotos' },
  { key: 'species', label: 'Especies' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const BackLink = () => (
  <Link to="/admin/rutas" className="back-link">
    <ArrowLeft aria-hidden="true" />
    Volver a rutas
  </Link>
);

function NewRoute() {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <div className="page-stack">
      <BackLink />
      <PageHeader
        title="Nueva ruta"
        intro="Se crea como borrador. Después podrás cargar el trazado, las paradas y las fotos."
      />
      <RouteDataForm
        route={null}
        onSave={async (payload) => {
          const created = await createRoute(payload);
          toast('Ruta creada como borrador.');
          navigate(`/admin/rutas/${created.id}`, { replace: true });
        }}
      />
    </div>
  );
}

function EditRoute({ id }: { id: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const route = useResource(() => getRoute(id), [id]);
  const [section, setSection] = useState<SectionKey>('data');
  const [removing, setRemoving] = useState(false);
  const { busy, error, run } = useAction();
  const data = route.data;

  if (route.error && !data) {
    return (
      <div className="page-stack">
        <BackLink />
        <ErrorState message={route.error} onRetry={() => void route.reload()} />
      </div>
    );
  }
  if (!data) return <LoadingState />;

  return (
    <div className="page-stack">
      <BackLink />
      <PageHeader
        title={data.nameEs}
        actions={
          <>
            {data.isPublished && (
              <Link to={`/rutas/${data.slug}`} className="btn btn-ghost">
                <ExternalLink aria-hidden="true" />
                Ver pública
              </Link>
            )}
            <button
              type="button"
              className={`btn ${data.isPublished ? 'btn-ghost' : 'btn-primary'}`}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await setRoutePublished(data.id, !data.isPublished);
                  await route.reload();
                  toast(
                    data.isPublished
                      ? 'La ruta volvió a borrador.'
                      : 'Ruta publicada.',
                  );
                })
              }
            >
              {data.isPublished ? 'Despublicar' : 'Publicar ruta'}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Eliminar ruta"
              onClick={() => setRemoving(true)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </>
        }
      />
      <span>
        <StatusBadge tone={data.isPublished ? 'success' : 'muted'}>
          {data.isPublished ? 'Publicada' : 'Borrador'}
        </StatusBadge>
      </span>
      {error && <ErrorState message={error} />}
      <div className="view-tabs" role="group" aria-label="Secciones de la ruta">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={section === item.key}
            onClick={() => setSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {section === 'data' && (
        <RouteDataForm
          key={data.id}
          route={data}
          onSave={async (payload) => {
            await updateRoute(data.id, payload);
            await route.reload();
            toast('Cambios guardados.');
          }}
        />
      )}
      {section === 'track' && (
        <RouteTrackSection route={data} onChanged={route.reload} />
      )}
      {section === 'points' && (
        <RoutePointsSection route={data} onChanged={route.reload} />
      )}
      {section === 'gear' && (
        <RouteGearSection route={data} onChanged={route.reload} />
      )}
      {section === 'photos' && (
        <RoutePhotosSection route={data} onChanged={route.reload} />
      )}
      {section === 'species' && (
        <RouteSpeciesSection route={data} onChanged={route.reload} />
      )}
      {removing && (
        <ConfirmDialog
          title="Eliminar ruta"
          confirmLabel="Eliminar ruta"
          destructive
          onClose={() => setRemoving(false)}
          onConfirm={async () => {
            await deleteRoute(data.id);
            toast('Ruta eliminada.');
            navigate('/admin/rutas', { replace: true });
          }}
        >
          <p>
            <strong>{data.nameEs}</strong> dejará de aparecer en la plataforma y
            en este panel.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function AdminRouteEditorPage() {
  const { id } = useParams();
  return id ? <EditRoute key={id} id={id} /> : <NewRoute />;
}
