import { ChevronRight, Flag, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createDeparture,
  getAgencyMe,
  listMyDepartures,
  listRouteOptions,
  type RouteOption,
} from '../../api/agency';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { money, tourDay } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { Field, SelectField } from '../../ui/Field';
import FilterChips from '../../ui/FilterChips';
import LoadingState from '../../ui/LoadingState';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import AgencyStatusNotice from './AgencyStatusNotice';
import { ACTIVE_DEPARTURES, DEPARTURE_STATUS } from './departureLabels';

type Filter = 'active' | 'past';

function NewDepartureModal({
  routes,
  onClose,
  onCreated,
}: {
  routes: RouteOption[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [form, setForm] = useState({
    departureDate: '',
    meetingTime: '06:30',
    meetingPoint: '',
    pricePerPerson: '',
    minPeople: '3',
    maxPeople: '10',
    guideName: '',
  });
  const { busy, error, run } = useAction();
  const route = routes.find((item) => item.id === routeId);
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (value: string) =>
      setForm((current) => ({ ...current, [key]: value })),
  });
  const valid =
    Boolean(routeId) &&
    form.departureDate.length === 10 &&
    form.meetingPoint.trim().length >= 5 &&
    Number(form.pricePerPerson) > 0 &&
    Number(form.maxPeople) >= Number(form.minPeople) &&
    form.guideName.trim().length >= 3;
  return (
    <Modal
      title="Publicar salida"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || busy}
            onClick={() =>
              void run(async () => {
                const created = await createDeparture({
                  routeId,
                  departureDate: form.departureDate,
                  meetingTime: form.meetingTime,
                  meetingPoint: form.meetingPoint.trim(),
                  pricePerPerson: Number(form.pricePerPerson),
                  minPeople: Number(form.minPeople),
                  maxPeople: Number(form.maxPeople),
                  guideName: form.guideName.trim(),
                });
                onCreated(created.id);
              })
            }
          >
            Publicar salida
          </button>
        </>
      }
    >
      <SelectField
        label="Ruta"
        value={routeId}
        options={routes.map((item) => ({
          value: item.id,
          label: item.nameEs,
        }))}
        onChange={setRouteId}
      />
      <div className="form-grid">
        <Field label="Fecha" type="date" {...bind('departureDate')} />
        <Field label="Hora de encuentro" type="time" {...bind('meetingTime')} />
        <Field
          label="Precio por persona, en Bs"
          type="number"
          min={0.01}
          step="0.01"
          hint={route ? `Mínimo ${money(route.groupMinPrice)}` : undefined}
          {...bind('pricePerPerson')}
        />
        <Field label="Guía a cargo" maxLength={120} {...bind('guideName')} />
        <Field
          label="Mínimo de personas"
          type="number"
          min={3}
          max={50}
          step="1"
          {...bind('minPeople')}
        />
        <Field
          label="Máximo de personas"
          type="number"
          min={3}
          max={50}
          step="1"
          {...bind('maxPeople')}
        />
      </div>
      <Field
        label="Punto de encuentro"
        maxLength={200}
        {...bind('meetingPoint')}
      />
      <p className="small muted">
        Las inscripciones cierran 48 horas antes. Si no se llega al mínimo, la
        salida se cancela y los inscritos reciben el 100 %.
      </p>
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

async function loadDepartures() {
  const [agency, departures, routes] = await Promise.all([
    getAgencyMe(),
    listMyDepartures(),
    listRouteOptions(),
  ]);
  return { agency, departures, routes: routes.data };
}

export default function AgencyDeparturesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const data = useResource(loadDepartures, []);
  const [filter, setFilter] = useState<Filter>('active');
  const creating = params.get('nueva') === '1';
  const approved =
    data.data?.agency.verificationStatus === 'APPROVED' &&
    data.data.agency.missingDocuments.length === 0;
  const rows = (data.data?.departures ?? [])
    .filter(
      (item) =>
        ACTIVE_DEPARTURES.includes(item.status) === (filter === 'active'),
    )
    .sort((a, b) =>
      filter === 'active'
        ? a.departureDate.localeCompare(b.departureDate)
        : b.departureDate.localeCompare(a.departureDate),
    );
  return (
    <div className="page-stack">
      <PageHeader
        title="Salidas"
        intro="Publica salidas grupales y controla sus cupos."
        actions={
          approved ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setParams({ nueva: '1' })}
            >
              <Plus aria-hidden="true" />
              Publicar salida
            </button>
          ) : undefined
        }
      />
      {data.error && (
        <ErrorState message={data.error} onRetry={() => void data.reload()} />
      )}
      {!data.data && !data.error && <LoadingState />}
      {data.data && (
        <>
          <AgencyStatusNotice agency={data.data.agency} />
          <FilterChips
            label="Estado de las salidas"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Activas' },
              { value: 'past', label: 'Terminadas y canceladas' },
            ]}
          />
          {rows.length === 0 ? (
            <div className="card">
              <EmptyState icon={Flag} title="No hay salidas en este estado." />
            </div>
          ) : (
            <ul className="queue">
              {rows.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/panel/salidas/${item.id}`}
                    className="card queue-item"
                  >
                    <span className="queue-main">
                      <span className="body-strong">{item.route.nameEs}</span>
                      <span className="small muted">
                        {tourDay(item.departureDate, item.meetingTime)},{' '}
                        {item.seatsTaken} de {item.maxPeople} cupos,{' '}
                        {money(item.pricePerPerson)} por persona
                      </span>
                    </span>
                    <StatusBadge tone={DEPARTURE_STATUS[item.status].tone}>
                      {DEPARTURE_STATUS[item.status].label}
                    </StatusBadge>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {creating && approved && (
            <NewDepartureModal
              routes={data.data.routes}
              onClose={() => setParams({})}
              onCreated={(id) => {
                toast('Salida publicada.');
                navigate(`/panel/salidas/${id}`, { replace: true });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
