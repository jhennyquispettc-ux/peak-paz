import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  availableGuides,
  createBooking,
  joinDeparture,
  listRouteDepartures,
} from '../../api/tourist';
import type { PublicGuide, RouteDetail } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useAction } from '../../hooks/useAction';
import { errorMessage, useResource } from '../../hooks/useResource';
import { useI18n } from '../../i18n/I18nContext';
import ErrorState from '../../ui/ErrorState';
import FilterChips from '../../ui/FilterChips';
import { bolivianos, dayLabel } from './touristFormat';

type Mode = 'private' | 'group';

function laPazDate(offsetDays: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

export default function RouteBookingPanel({
  route,
  times,
}: {
  route: RouteDetail;
  times: string[];
}) {
  const { user } = useAuth();
  const { pick, dateLocale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('private');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(times[0] ?? '');
  const [people, setPeople] = useState('2');
  const [guides, setGuides] = useState<PublicGuide[] | null>(null);
  const [guideId, setGuideId] = useState('');
  const [guidesError, setGuidesError] = useState<string | null>(null);
  const [groupPeople, setGroupPeople] = useState<Record<string, string>>({});
  const departures = useResource(
    () => listRouteDepartures(route.slug),
    [route.slug],
  );
  const { busy, error, run } = useAction();
  const isTourist = user?.role === 'TOURIST';

  useEffect(() => {
    if (mode !== 'private' || !date || !time) return;
    let active = true;
    setGuides(null);
    setGuideId('');
    setGuidesError(null);
    availableGuides(route.slug, date, time)
      .then((list) => {
        if (active) setGuides(list);
      })
      .catch((caught) => {
        if (active) setGuidesError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [mode, date, time, route.slug]);

  function requireAccount() {
    if (user) return true;
    navigate('/ingresar', { state: { from: location.pathname } });
    return false;
  }

  const count = Number(people);
  const validPeople =
    Number.isInteger(count) && count >= 1 && count <= route.privateMaxPeople;
  const openDepartures = departures.data?.data ?? [];

  return (
    <section className="card side-card" id="reservar">
      <h2 className="h3">{pick('Reserva tu salida', 'Book your trip')}</h2>
      <FilterChips
        label={pick('Tipo de tour', 'Tour type')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'private', label: pick('Con guía', 'Private guide') },
          { value: 'group', label: pick('Grupal', 'Group') },
        ]}
      />
      {user && !isTourist && (
        <p className="notice small">
          {pick(
            'Las reservas se hacen con una cuenta de turista.',
            'Bookings require a tourist account.',
          )}
        </p>
      )}
      {error && <ErrorState message={error} />}
      {mode === 'private' ? (
        <>
          <p className="small muted">
            {pick(
              `Precio del tour, hasta ${route.privateMaxPeople} personas: `,
              `Tour price, up to ${route.privateMaxPeople} people: `,
            )}
            <strong>{bolivianos(route.privatePrice, dateLocale)}</strong>
          </p>
          <div className="field">
            <label htmlFor="bookDate">{pick('Fecha', 'Date')}</label>
            <input
              id="bookDate"
              type="date"
              min={laPazDate(1)}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="bookTime">{pick('Hora', 'Time')}</label>
              <select
                id="bookTime"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              >
                {times.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bookPeople">{pick('Personas', 'People')}</label>
              <input
                id="bookPeople"
                type="number"
                min={1}
                max={route.privateMaxPeople}
                value={people}
                onChange={(event) => setPeople(event.target.value)}
              />
            </div>
          </div>
          {guidesError && <ErrorState message={guidesError} />}
          {date && !guides && !guidesError && (
            <p className="small muted" role="status">
              {pick('Buscando guías libres…', 'Looking for free guides…')}
            </p>
          )}
          {guides?.length === 0 && (
            <p className="notice small">
              {pick(
                'No hay guías libres en esa fecha y hora. Prueba otra.',
                'No guides are free at that date and time. Try another.',
              )}
            </p>
          )}
          {guides && guides.length > 0 && (
            <fieldset className="choice-group">
              <legend>{pick('Elige tu guía', 'Choose your guide')}</legend>
              {guides.map((guide) => (
                <label key={guide.id} className="choice">
                  <input
                    type="radio"
                    name="booking-guide"
                    checked={guideId === guide.id}
                    onChange={() => setGuideId(guide.id)}
                  />
                  <span>
                    <strong>
                      {guide.firstName} {guide.lastName}
                    </strong>
                    <small>
                      {guide.yearsExperience} {pick('años', 'years')},{' '}
                      {guide.languages.join(', ').toUpperCase()},{' '}
                      {Number(guide.ratingAverage).toFixed(1)} / 5
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <button
            type="button"
            className="btn btn-primary wide"
            disabled={
              busy ||
              (Boolean(user) &&
                (!isTourist || !guideId || !date || !validPeople))
            }
            onClick={() => {
              if (!requireAccount()) return;
              void run(async () => {
                const booking = await createBooking({
                  routeId: route.id,
                  guideProfileId: guideId,
                  tourDate: date,
                  startTime: time,
                  peopleCount: count,
                });
                navigate(`/reservas/${booking.id}`);
              });
            }}
          >
            {user
              ? pick('Solicitar guía', 'Request guide')
              : pick('Ingresa para reservar', 'Sign in to book')}
          </button>
          <p className="caption muted">
            {pick(
              'El guía responde en hasta 2 horas. Pagas solo si acepta.',
              'The guide answers within 2 hours. You only pay if accepted.',
            )}
          </p>
        </>
      ) : (
        <>
          {departures.error && <ErrorState message={departures.error} />}
          {departures.data && openDepartures.length === 0 && (
            <p className="notice small">
              {pick(
                'Esta ruta no tiene salidas grupales abiertas.',
                'This route has no open group departures.',
              )}
            </p>
          )}
          <ul className="departure-list">
            {openDepartures.map((item) => {
              const value = groupPeople[item.id] ?? '1';
              const wanted = Number(value);
              const valid =
                Number.isInteger(wanted) &&
                wanted >= 1 &&
                wanted <= item.seatsLeft;
              return (
                <li key={item.id}>
                  <strong>
                    {dayLabel(item.departureDate, item.meetingTime, dateLocale)}
                  </strong>
                  <span className="small muted">
                    {item.agency.legalName}, {item.meetingPoint}
                  </span>
                  <span className="small">
                    {bolivianos(item.pricePerPerson, dateLocale)}{' '}
                    {pick('por persona', 'per person')},{' '}
                    {pick(
                      `quedan ${item.seatsLeft} cupos`,
                      `${item.seatsLeft} seats left`,
                    )}
                  </span>
                  <div className="departure-join">
                    <input
                      type="number"
                      min={1}
                      max={item.seatsLeft}
                      aria-label={pick('Personas', 'People')}
                      value={value}
                      onChange={(event) =>
                        setGroupPeople((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={
                        busy ||
                        item.seatsLeft === 0 ||
                        (Boolean(user) && (!isTourist || !valid))
                      }
                      onClick={() => {
                        if (!requireAccount()) return;
                        void run(async () => {
                          const booking = await joinDeparture(item.id, wanted);
                          navigate(`/reservas/${booking.id}/pagar`);
                        });
                      }}
                    >
                      {user
                        ? pick('Inscribirme', 'Join')
                        : pick('Ingresar', 'Sign in')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
