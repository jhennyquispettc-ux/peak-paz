export function formatDays(days: number, locale = 'es'): string {
  if (locale === 'en') return days === 1 ? '1 day' : `${days} days`;
  return days === 1 ? '1 día' : `${days} días`;
}

export function formatPrice(amount: number): string {
  return `Bs ${amount.toLocaleString('es-BO')}`;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

const WEATHER: [number[], string, string][] = [
  [[0], 'Despejado', 'Clear'],
  [[1, 2, 3], 'Parcialmente nublado', 'Partly cloudy'],
  [[45, 48], 'Niebla', 'Fog'],
  [[51, 53, 55, 56, 57], 'Llovizna', 'Drizzle'],
  [[61, 63, 65, 66, 67], 'Lluvia', 'Rain'],
  [[71, 73, 75, 77], 'Nieve', 'Snow'],
  [[80, 81, 82], 'Chubascos', 'Showers'],
  [[85, 86], 'Nevadas', 'Snowfall'],
  [[95, 96, 99], 'Tormenta', 'Thunderstorm'],
];

export function weatherLabel(code: number, locale = 'es'): string {
  const entry = WEATHER.find(([codes]) => codes.includes(code));
  if (!entry) return 'Variable';
  return locale === 'en' ? entry[2] : entry[1];
}

export function formatDate(date: string, dateLocale = 'es-BO'): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
