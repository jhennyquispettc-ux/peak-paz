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
import { useI18n } from '../i18n/I18nContext';
import RouteBookingPanel from './tourist/RouteBookingPanel';
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
  const { locale, pick, dateLocale } = useI18n();
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
          <Link to="/rutas">{pick('Volver a las rutas', 'Back to trails')}</Link>
        </main>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="pp app-shell">
        <SiteHeader />
        <main className="detail">
          <p className="muted">{pick('Cargando la ruta...', 'Loading trail...')}</p>
        </main>
      </div>
    );
  }

  const name = locale === 'en' ? route.nameEn : route.nameEs;
  const season = locale === 'en' ? route.bestSeasonEn : route.bestSeasonEs;

  const reserve = () => {
    if (!user) {
      navigate('/ingresar', { state: { from: `/rutas/${route.slug}` } });
      return;
    }
    if (!user.emailVerifiedAt && ['TOURIST', 'GUIDE'].includes(user.role)) {
      navigate('/mi-verificacion');
      return;
    }
    document
      .getElementById('reservar')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pp app-shell">
      <SiteHeader />
      <main className="detail">
        <Link to="/rutas" className="back small">
          ← {pick('Todas las rutas', 'All trails')}
        </Link>

        <header className="detail-head">
          <div>
            <p className="eyebrow">{pick('Ruta en La Paz', 'Trail in La Paz')}</p>
            <h1 className="h1">{name}</h1>
            <div className="badges">
              <DifficultyBadge difficulty={route.difficulty} />
              <span className="badge badge-guindo">{pick('Con guía', 'With guide')}</span>
            </div>
          </div>
          <div className="detail-cta card">
            <p className="caption muted">
              {pick(`Tour particular hasta ${route.privateMaxPeople} personas`, `Private tour up to ${route.privateMaxPeople} people`)}
            </p>
            <p className="h2">{formatPrice(route.privatePrice)}</p>
            <button
              type="button"
              className="btn btn-primary wide"
              onClick={reserve}
            >
              {pick('Reservar', 'Book now')}
            </button>
          </div>
        </header>

        <section className="stats stats-wide card">
          <div>
            <p className="h3">{route.distanceKm} km</p>
            <p className="caption muted">{pick('Distancia', 'Distance')}</p>
          </div>
          <div>
            <p className="h3">{formatDays(route.days, locale)}</p>
            <p className="caption muted">{pick('Duración', 'Duration')}</p>
          </div>
          <div>
            <p className="h3">↗ {route.elevationGainM} m</p>
            <p className="caption muted">{pick('Ascenso', 'Ascent')}</p>
          </div>
          <div>
            <p className="h3">↘ {route.elevationLossM} m</p>
            <p className="caption muted">{pick('Descenso', 'Descent')}</p>
          </div>
          <div>
            <p className="h3">{route.maxAltitudeM} m</p>
            <p className="caption muted">{pick('Altura máxima', 'Max altitude')}</p>
          </div>
        </section>

        <div className="detail-grid">
          <div className="detail-main">
            <RouteMap className="map map-detail" selected={route} />

            <section>
              <h2 className="h2">{pick('Sobre la ruta', 'About this trail')}</h2>
              <p className="body">{locale === 'en' ? route.descriptionEn : route.descriptionEs}</p>
              <h3 className="h3">{pick('Cómo llegar', 'How to get there')}</h3>
              <p className="body">{locale === 'en' ? route.howToGetThereEn : route.howToGetThereEs}</p>
              {season && (
                <>
                  <h3 className="h3">{pick('Mejor época', 'Best season')}</h3>
                  <p className="body">{season}</p>
                </>
              )}
            </section>

            <section>
              <div className="section-head">
                <h2 className="h2">{pick('Itinerario por etapas', 'Stage itinerary')}</h2>
                <label className="time-select small">
                  {pick('Salida', 'Start')}
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
                      <span className="timeline-time body-strong">
                        {stop.arrivalTime}
                      </span>
                      <span className="timeline-dot" aria-hidden="true" />
                      <span>
                        <span className="body-strong">{locale === 'en' ? stop.nameEn : stop.nameEs}</span>
                        <span className="small muted">
                          {' '}
                          · {pick('Día', 'Day')} {stop.dayNumber}
                          {stop.minutesFromPrevious > 0 &&
                            ` · ${formatMinutes(stop.minutesFromPrevious)} ${pick('desde la parada anterior', 'from the previous stop')}`}
                          {stop.isOvernight && ` · ${pick('Noche de campamento', 'Camp night')}`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">
                  {pick('El itinerario de esta ruta todavía no está cargado.', 'The itinerary for this trail is not available yet.')}
                </p>
              )}
            </section>
          </div>

          <aside className="detail-side">
            <RouteBookingPanel route={route} times={options} />
            <section className="card side-card">
              <h2 className="h3">{pick('Clima en el punto de inicio', 'Weather at the trailhead')}</h2>
              {weatherError && (
                <p className="notice notice-info small">
                  {pick('El pronóstico no está disponible en este momento.', 'The forecast is not available right now.')}
                </p>
              )}
              {weather && (
                <ul className="weather">
                  {weather.days.map((day) => (
                    <li key={day.date}>
                      <span className="small">{formatDate(day.date, dateLocale)}</span>
                      <span className="small muted">
                        {weatherLabel(day.weatherCode, locale)}
                      </span>
                      <span className="small body-strong">
                        {Math.round(day.temperatureMinC)}° /{' '}
                        {Math.round(day.temperatureMaxC)}°
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card side-card" id="guias">
              <h2 className="h3">{pick('Guías para esta ruta', 'Guides for this trail')}</h2>
              {guides.length === 0 ? (
                <p className="small muted">
                  {pick('Todavía no hay guías verificados para esta ruta.', 'There are no verified guides for this trail yet.')}
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
                          {guide.yearsExperience} {pick('años de experiencia', 'years of experience')} ·{' '}
                          {guide.languages.join(', ').toUpperCase()}
                        </span>
                      </span>
                      <span className="badge badge-success">{pick('Verificado', 'Verified')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {route.gearRecommendations.length > 0 && (
              <section className="card side-card">
                <h2 className="h3">{pick('Qué llevar', 'What to bring')}</h2>
                <ul className="gear small">
                  {route.gearRecommendations.map((gear) => (
                    <li key={gear.id}>
                      {locale === 'en' ? gear.descriptionEn : gear.descriptionEs}
                      {gear.isRequired && (
                        <span className="badge badge-warning">{pick('Obligatorio', 'Required')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card side-card">
              <h2 className="h3">{pick('Emergencias', 'Emergencies')}</h2>
              <p className="small">{route.emergencyContacts}</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
