import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRoute, listRoutes } from '../api/routes';
import type { Difficulty, RouteDetail, RouteSummary } from '../api/types';
import DifficultyBadge from '../components/DifficultyBadge';
import RouteMap from '../components/RouteMap';
import SiteHeader from '../components/SiteHeader';
import { formatDays, formatPrice } from '../format';

const FILTERS: { label: string; value?: Difficulty }[] = [
  { label: 'Todas' },
  { label: 'Fáciles', value: 'EASY' },
  { label: 'Moderadas', value: 'MODERATE' },
  { label: 'Difíciles', value: 'HARD' },
];

export default function RoutesPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>();
  const [search, setSearch] = useState('');
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RouteDetail | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      listRoutes({ difficulty, search: search.trim() || undefined })
        .then((page) => {
          setRoutes(page.data);
          setError(null);
        })
        .catch((caught: Error) => setError(caught.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [difficulty, search]);

  const select = useCallback((slug: string) => {
    getRoute(slug)
      .then(setSelected)
      .catch(() => setSelected(null));
  }, []);

  return (
    <div className="pp app-shell">
      <SiteHeader />
      <main className="explore">
        <aside className="explore-list">
          <section className="explore-hero">
            <p className="eyebrow eyebrow-on-dark">La Paz, Bolivia</p>
            <h1 className="h1">Hay un camino esperándote</h1>
            <p className="small">
              Senderos de La Paz con guías verificados y salidas grupales.
            </p>
          </section>

          <label className="search">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Busca una ruta"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar ruta"
            />
          </label>

          <div className="chips" role="group" aria-label="Filtrar por dificultad">
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className="chip"
                aria-pressed={difficulty === filter.value}
                onClick={() => setDifficulty(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="list-head">
            <h2 className="h3">Rutas para descubrir</h2>
            <span className="small muted">
              {loading ? 'Cargando...' : `${routes.length} rutas publicadas`}
            </span>
          </div>

          {error && <p className="notice notice-danger">{error}</p>}
          {!loading && !error && routes.length === 0 && (
            <p className="notice">No hay rutas con esos filtros.</p>
          )}

          <ul className="route-list">
            {routes.map((route) => (
              <li key={route.id}>
                <button
                  type="button"
                  className={`route-item card${selected?.id === route.id ? ' selected' : ''}`}
                  onClick={() => select(route.slug)}
                >
                  <span className="route-thumb" aria-hidden="true">
                    <svg viewBox="0 0 96 72">
                      <rect width="96" height="72" fill="#24160D" />
                      <circle cx="64" cy="70" r="40" fill="#F77F00" />
                      <circle cx="64" cy="70" r="29" fill="#FCA311" />
                      <circle cx="64" cy="70" r="18" fill="#FFD166" />
                      <path d="M0 62 L22 50 L44 58 L66 42 L96 56 V72 H0 Z" fill="#3B2416" />
                    </svg>
                  </span>
                  <span className="route-info">
                    <DifficultyBadge difficulty={route.difficulty} />
                    <span className="route-name body-strong">{route.nameEs}</span>
                    <span className="route-meta small">
                      {route.distanceKm} km · {formatDays(route.days)} · ↗{' '}
                      {route.elevationGainM} m
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="explore-map" aria-label="Mapa de rutas">
          <RouteMap
            className="map"
            routes={routes}
            selected={selected}
            onSelect={select}
          />
          {selected && (
            <article className="card map-card">
              <button
                type="button"
                className="map-card-close"
                aria-label="Cerrar"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
              <DifficultyBadge difficulty={selected.difficulty} />
              <h3 className="h3">{selected.nameEs}</h3>
              <div className="stats">
                <div>
                  <p className="body-strong">{selected.distanceKm} km</p>
                  <p className="caption muted">Distancia</p>
                </div>
                <div>
                  <p className="body-strong">{formatDays(selected.days)}</p>
                  <p className="caption muted">Duración</p>
                </div>
                <div>
                  <p className="body-strong">{selected.maxAltitudeM} m</p>
                  <p className="caption muted">Altura máxima</p>
                </div>
              </div>
              <p className="small muted">
                Tour particular desde {formatPrice(selected.privatePrice)}
              </p>
              <Link to={`/rutas/${selected.slug}`} className="btn btn-primary wide">
                Ver ruta
              </Link>
            </article>
          )}
          <div className="map-legend caption">
            <span>
              <svg width="22" height="8" aria-hidden="true">
                <line x1="2" y1="4" x2="20" y2="4" stroke="#3B2416" strokeWidth="7" strokeLinecap="round" />
                <line x1="2" y1="4" x2="20" y2="4" stroke="#FCA311" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Ruta seleccionada
            </span>
            <span>
              <svg width="10" height="10" aria-hidden="true">
                <circle cx="5" cy="5" r="4" fill="#A3284B" />
              </svg>
              Paradas
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
