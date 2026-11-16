import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getItinerary,
  getRoute,
  getRouteGuides,
  getWeather,
} from '../api/routes';
import type {
  Itinerary,
  PublicGuide,
  RouteDetail,
  WeatherForecast,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';
import DifficultyBadge from '../components/DifficultyBadge';
import RouteMap from '../components/RouteMap';
import SiteHeader from '../components/SiteHeader';
import {
  formatDate,
  formatDays,
  formatMinutes,
  formatPrice,
  weatherLabel,
} from '../format';

function startTimes(from: string, to: string): string[] {
  const toMinutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const times: string[] = [];
  for (let minutes = toMinutes(from); minutes <= toMinutes(to); minutes += 30) {
    times.push(
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    );
  }
  return times;
}

export default function RouteDetailPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [guides, setGuides] = useState<PublicGuide[]>([]);

  useEffect(() => {
    getRoute(slug)
      .then((detail) => {
        setRoute(detail);
        setStartTime(detail.startTimeFrom);
      })
      .catch((caught: Error) => setError(caught.message));
    getWeather(slug)
      .then(setWeather)
      .catch(() => setWeatherError(true));
    getRouteGuides(slug)
      .then(setGuides)
      .catch(() => setGuides([]));
  }, [slug]);

  useEffect(() => {
    if (!startTime) return;
    getItinerary(slug, startTime)
      .then(setItinerary)
      .catch(() => setItinerary(null));
  }, [slug, startTime]);

  const options = useMemo(
    () => (route ? startTimes(route.startTimeFrom, route.startTimeTo) : []),
    [route],
  );

  if (error) {
    return (
      <div className="pp app-shell">
        <SiteHeader />
        <main className="detail">
          <p className="notice notice-danger">{error}</p>
          <Link to="/rutas">Volver a las rutas</Link>
        </main>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="pp app-shell">
        <SiteHeader />
        <main className="detail">
          <p className="muted">Cargando la ruta...</p>
        </main>
      </div>
    );
  }

  const reserve = () => {
    if (!user) {
      navigate('/ingresar', { state: { from: `/rutas/${route.slug}` } });
      return;
    }
    document.getElementById('guias')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pp app-shell">
      <SiteHeader />
      <main className="detail">
        <Link to="/rutas" className="back small">
          ← Todas las rutas
        </Link>

        <header className="detail-head">
          <div>
            <p className="eyebrow">Ruta en La Paz</p>
            <h1 className="h1">{route.nameEs}</h1>
            <div className="badges">
              <DifficultyBadge difficulty={route.difficulty} />
              <span className="badge badge-guindo">Con guía</span>
            </div>
          </div>
          <div className="detail-cta card">
            <p className="caption muted">Tour particular hasta {route.privateMaxPeople} personas</p>
            <p className="h2">{formatPrice(route.privatePrice)}</p>
            <button type="button" className="btn btn-primary wide" onClick={reserve}>
              Reservar guía
            </button>
          </div>
        </header>

        <section className="stats stats-wide card">
          <div>
            <p className="h3">{route.distanceKm} km</p>
            <p className="caption muted">Distancia</p>
          </div>
          <div>
            <p className="h3">{formatDays(route.days)}</p>
            <p className="caption muted">Duración</p>
          </div>
          <div>
            <p className="h3">↗ {route.elevationGainM} m</p>
            <p className="caption muted">Ascenso</p>
          </div>
          <div>
            <p className="h3">↘ {route.elevationLossM} m</p>
            <p className="caption muted">Descenso</p>
          </div>
          <div>
            <p className="h3">{route.maxAltitudeM} m</p>
            <p className="caption muted">Altura máxima</p>
          </div>
        </section>

        <div className="detail-grid">
          <div className="detail-main">
            <RouteMap className="map map-detail" selected={route} />

            <section>
              <h2 className="h2">Sobre la ruta</h2>
              <p className="body">{route.descriptionEs}</p>
              <h3 className="h3">Cómo llegar</h3>
              <p className="body">{route.howToGetThereEs}</p>
              {route.bestSeasonEs && (
                <>
                  <h3 className="h3">Mejor época</h3>
                  <p className="body">{route.bestSeasonEs}</p>
                </>
              )}
            </section>

            <section>
              <div className="section-head">
                <h2 className="h2">Itinerario por etapas</h2>
                <label className="time-select small">
                  Salida
                  <select
                    value={startTime ?? ''}
                    onChange={(event) => setStartTime(event.target.value)}
                  >
                    {options.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {itinerary ? (
                <ol className="timeline">
                  {itinerary.stops.map((stop) => (
                    <li key={stop.stageOrder}>
                      <span className="timeline-time body-strong">{stop.arrivalTime}</span>
                      <span className="timeline-dot" aria-hidden="true" />
                      <span>
                        <span className="body-strong">{stop.nameEs}</span>
                        <span className="small muted">
                          {' '}
                          · Día {stop.dayNumber}
                          {stop.minutesFromPrevious > 0 &&
                            ` · ${formatMinutes(stop.minutesFromPrevious)} desde la parada anterior`}
                          {stop.isOvernight && ' · Noche de campamento'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">El itinerario de esta ruta todavía no está cargado.</p>
              )}
            </section>
          </div>

          <aside className="detail-side">
            <section className="card side-card">
              <h2 className="h3">Clima en el punto de inicio</h2>
              {weatherError && (
                <p className="notice notice-info small">
                  El pronóstico no está disponible en este momento.
                </p>
              )}
              {weather && (
                <ul className="weather">
                  {weather.days.map((day) => (
                    <li key={day.date}>
                      <span className="small">{formatDate(day.date)}</span>
                      <span className="small muted">{weatherLabel(day.weatherCode)}</span>
                      <span className="small body-strong">
                        {Math.round(day.temperatureMinC)}° / {Math.round(day.temperatureMaxC)}°
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card side-card" id="guias">
              <h2 className="h3">Guías para esta ruta</h2>
              {guides.length === 0 ? (
                <p className="small muted">
                  Todavía no hay guías verificados para esta ruta.
                </p>
              ) : (
                <ul className="guides">
                  {guides.map((guide) => (
                    <li key={guide.id}>
                      <span className="avatar" aria-hidden="true">
                        {guide.firstName[0]}
                        {guide.lastName[0]}
                      </span>
                      <span>
                        <span className="body-strong">
                          {guide.firstName} {guide.lastName}
                        </span>
                        <span className="small muted">
                          {guide.yearsExperience} años de experiencia ·{' '}
                          {guide.languages.join(', ').toUpperCase()}
                        </span>
                      </span>
                      <span className="badge badge-success">Verificado</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {route.gearRecommendations.length > 0 && (
              <section className="card side-card">
                <h2 className="h3">Qué llevar</h2>
                <ul className="gear small">
                  {route.gearRecommendations.map((gear) => (
                    <li key={gear.id}>
                      {gear.descriptionEs}
                      {gear.isRequired && <span className="badge badge-warning">Obligatorio</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card side-card">
              <h2 className="h3">Emergencias</h2>
              <p className="small">{route.emergencyContacts}</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
