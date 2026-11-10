import { AppConfig } from '../../../config/app.config.js';
import { Route } from '../entities/route.entity.js';
import { WeatherUnavailableException } from '../exceptions/routes.exceptions.js';
import { WeatherService } from './weather.service.js';

const config = {
  weather: {
    apiUrl: 'https://weather.test/v1/forecast',
    timeoutMs: 1000,
    cacheMinutes: 30,
  },
} as AppConfig;

const route = Object.assign(new Route(), {
  id: 'route-1',
  slug: 'choro-3-dias',
  startLatitude: -16.3315,
  startLongitude: -68.0381,
});

const openMeteoBody = {
  daily: {
    time: ['2026-11-10'],
    weather_code: [61],
    temperature_2m_max: [12.5],
    temperature_2m_min: [-1.2],
    precipitation_probability_max: [80],
    wind_speed_10m_max: [22.4],
  },
};

describe('WeatherService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps the daily forecast and caches it per route', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(openMeteoBody));
    const service = new WeatherService(config);

    const first = await service.forecast(route);
    await service.forecast(route);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get('latitude')).toBe('-16.3315');
    expect(first.days).toEqual([
      {
        date: '2026-11-10',
        weatherCode: 61,
        temperatureMaxC: 12.5,
        temperatureMinC: -1.2,
        precipitationProbability: 80,
        windSpeedMaxKmh: 22.4,
      },
    ]);
  });

  it('reports the service as unavailable when the provider fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('error', { status: 500 }),
    );
    const service = new WeatherService(config);

    await expect(service.forecast(route)).rejects.toThrow(
      WeatherUnavailableException,
    );
  });
});
