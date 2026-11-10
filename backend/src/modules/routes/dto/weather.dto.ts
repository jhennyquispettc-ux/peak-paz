import { ApiProperty } from '@nestjs/swagger';

export class WeatherDayDto {
  @ApiProperty({ example: '2026-11-10' })
  date: string;

  @ApiProperty({ example: 61, description: 'Código WMO del estado del cielo' })
  weatherCode: number;

  @ApiProperty({ example: 14.2 })
  temperatureMaxC: number;

  @ApiProperty({ example: -2.1 })
  temperatureMinC: number;

  @ApiProperty({ example: 70, nullable: true })
  precipitationProbability: number | null;

  @ApiProperty({ example: 25.3 })
  windSpeedMaxKmh: number;
}

export class WeatherForecastDto {
  @ApiProperty({ format: 'uuid' })
  routeId: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ example: 'open-meteo.com' })
  source: string;

  @ApiProperty()
  fetchedAt: string;

  @ApiProperty({ type: [WeatherDayDto] })
  days: WeatherDayDto[];
}
