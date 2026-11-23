import { ChevronRight, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAgencyMe, listMyDepartures } from '../../api/agency';
import { useResource } from '../../hooks/useResource';
import { tourDay } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import AgencyStatusNotice from './AgencyStatusNotice';
import { ACTIVE_DEPARTURES, DEPARTURE_STATUS } from './departureLabels';

async function loadHome() {
  const [agency, departures] = await Promise.all([
    getAgencyMe(),
    listMyDepartures(),
  ]);
  const active = departures
    .filter((item) => ACTIVE_DEPARTURES.includes(item.status))
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  return { agency, active };
}

export default function AgencyHomePage() {
  const home = useResource(loadHome, []);
  const active = home.data?.active ?? [];
  const missingPeople = active.filter(
    (item) => item.status === 'PUBLISHED' && item.seatsTaken < item.minPeople,
  ).length;
  const people = active.reduce((total, item) => total + item.seatsTaken, 0);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Panel de la agencia"
        title={home.data?.agency.legalName ?? 'Inicio'}
        intro="Tus próximas salidas y sus cupos."
        actions={
          home.data?.agency.verificationStatus === 'APPROVED' &&
          home.data.agency.missingDocuments.length === 0 ? (
            <Link to="/panel/salidas?nueva=1" className="btn btn-primary">
              Publicar salida
            </Link>
          ) : undefined
        }
      />
      {home.error && (
        <ErrorState message={home.error} onRetry={() => void home.reload()} />
      )}
      {!home.data && !home.error && <LoadingState />}
      {home.data && (
        <>
          <AgencyStatusNotice agency={home.data.agency} />
          <div className="tile-grid">
            <div className="card tile">
              <strong>{active.length}</strong>
              <span>Salidas activas</span>
            </div>
            <div className="card tile">
              <strong>{people}</strong>
              <span>Personas inscritas</span>
            </div>
            <div className="card tile">
              <strong>{missingPeople}</strong>
              <span>Sin llegar al mínimo</span>
            </div>
          </div>
          <section className="page-stack">
            <h2 className="h3">Próximas salidas</h2>
            {active.length === 0 ? (
              <div className="card">
                <EmptyState icon={Flag} title="No tienes salidas activas." />
              </div>
            ) : (
              <ul className="queue">
                {active.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/panel/salidas/${item.id}`}
                      className="card queue-item"
                    >
                      <span className="queue-main">
                        <span className="body-strong">{item.route.nameEs}</span>
                        <span className="small muted">
                          {tourDay(item.departureDate, item.meetingTime)},{' '}
                          {item.seatsTaken} de {item.maxPeople} cupos, mínimo{' '}
                          {item.minPeople}
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
          </section>
        </>
      )}
    </div>
  );
}
