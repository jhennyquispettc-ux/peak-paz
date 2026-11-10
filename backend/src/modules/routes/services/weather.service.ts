import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../config/app.config.js';
import { WeatherDayDto, WeatherForecastDto } from '../dto/weather.dto.js';
import { Route } from '../entities/route.entity.js';
import { WeatherUnavailableException } from '../exceptions/routes.exceptions.js';

const FORECAST_DAYS = 7;
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'wind_speed_10m_max',
];

interface OpenMeteoResponse {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
  };
}

interface CacheEntry {
  expiresAt: number;
  value: WeatherForecastDto;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: AppConfig) {}

  async forecast(route: Route): Promise<WeatherForecastDto> {
    const cached = this.cache.get(route.id);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await this.fetchForecast(route);
    this.cache.set(route.id, {
      expiresAt: Date.now() + this.config.weather.cacheMinutes * 60_000,
      value,
    });
    return value;
  }

  private async fetchForecast(route: Route): Promise<WeatherForecastDto> {
    const url = new URL(this.config.weather.apiUrl);
    url.searchParams.set('latitude', String(route.startLatitude));
    url.searchParams.set('longitude', String(route.startLongitude));
    url.searchParams.set('daily', DAILY_FIELDS.join(','));
    url.searchParams.set('timezone', 'America/La_Paz');
    url.searchParams.set('forecast_days', String(FORECAST_DAYS));

    let body: OpenMeteoResponse;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.weather.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      body = (await response.json()) as OpenMeteoResponse;
    } catch (error) {
      this.logger.warn(
        `Weather request failed for route ${route.slug}: ${(error as Error).message}`,
      );
      throw new WeatherUnavailableException();
    }

    if (!body.daily) throw new WeatherUnavailableException();

    return {
      routeId: route.id,
      latitude: route.startLatitude,
      longitude: route.startLongitude,
      source: url.hostname,
      fetchedAt: new Date().toISOString(),
      days: this.toDays(body.daily),
    };
  }

  private toDays(
    daily: NonNullable<OpenMeteoResponse['daily']>,
  ): WeatherDayDto[] {
    return daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index],
      temperatureMaxC: daily.temperature_2m_max[index],
      temperatureMinC: daily.temperature_2m_min[index],
      precipitationProbability:
        daily.precipitation_probability_max[index] ?? null,
      windSpeedMaxKmh: daily.wind_speed_10m_max[index],
    }));
  }
}
