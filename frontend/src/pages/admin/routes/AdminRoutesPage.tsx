import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listRoutes, type RouteRow } from '../../../api/adminManage';
import { useResource } from '../../../hooks/useResource';
import { money } from '../../../lib/format';
import type { Column } from '../../../ui/DataTable';
import FilterChips from '../../../ui/FilterChips';
import PageHeader from '../../../ui/PageHeader';
import StatusBadge from '../../../ui/StatusBadge';
import CaseTable from '../CaseTable';
import GuideRouteRequestsPanel from './GuideRouteRequestsPanel';
import { AUTONOMY, DIFFICULTY } from './routeLabels';
import SpeciesCatalogPanel from './SpeciesCatalogPanel';

type Published = 'ALL' | 'YES' | 'NO';

const VIEWS = [
  { key: 'rutas', label: 'Rutas' },
  { key: 'solicitudes', label: 'Solicitudes de guías' },
  { key: 'especies', label: 'Especies' },
] as const;

const COLUMNS: Column<RouteRow>[] = [
  { key: 'name', header: 'Ruta', render: (row) => row.nameEs },
  {
    key: 'difficulty',
    header: 'Dificultad',
    render: (row) => DIFFICULTY[row.difficulty],
  },
  {
    key: 'autonomy',
    header: 'Autonomía',
    render: (row) => AUTONOMY[row.autonomyLevel],
  },
  { key: 'days', header: 'Días', render: (row) => row.days },
  {
    key: 'price',
    header: 'Precio privado',
    align: 'right',
    nowrap: true,
    render: (row) => money(row.privatePrice),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => (
      <StatusBadge tone={row.isPublished ? 'success' : 'muted'}>
        {row.isPublished ? 'Publicada' : 'Borrador'}
      </StatusBadge>
    ),
  },
];

function RoutesList() {
  const navigate = useNavigate();
  const [published, setPublished] = useState<Published>('ALL');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [text]);
  const list = useResource(
    () =>
      listRoutes({
        page,
        search,
        isPublished: published === 'ALL' ? undefined : published === 'YES',
      }),
    [page, search, published],
  );
  return (
    <div className="page-stack">
      <div className="toolbar">
        <div className="search-box">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar ruta"
            placeholder="Buscar ruta"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <FilterChips
          label="Publicación"
          value={published}
          onChange={(next) => {
            setPublished(next);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'YES', label: 'Publicadas' },
            { value: 'NO', label: 'Borradores' },
          ]}
        />
      </div>
      <CaseTable
        caption="Rutas de la plataforma"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        onOpen={(row) => navigate(`/admin/rutas/${row.id}`)}
        emptyTitle="No hay rutas con esos filtros."
      />
    </div>
  );
}

export default function AdminRoutesPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('vista') ?? 'rutas';
  return (
    <div className="page-stack">
      <PageHeader
        title="Rutas"
        intro="Administra el catálogo, autoriza a los guías y mantén la información al día."
        actions={
          <Link to="/admin/rutas/nueva" className="btn btn-primary">
            <Plus aria-hidden="true" />
            Crear ruta
          </Link>
        }
      />
      <div className="view-tabs" role="group" aria-label="Vistas de rutas">
        {VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={view === item.key}
            onClick={() =>
              setParams(item.key === 'rutas' ? {} : { vista: item.key })
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {view === 'solicitudes' && <GuideRouteRequestsPanel />}
      {view === 'especies' && <SpeciesCatalogPanel />}
      {view !== 'solicitudes' && view !== 'especies' && <RoutesList />}
    </div>
  );
}
