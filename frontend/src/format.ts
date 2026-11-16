export function formatDays(days: number): string {
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

const WEATHER: [number[], string][] = [
  [[0], 'Despejado'],
  [[1, 2, 3], 'Parcialmente nublado'],
  [[45, 48], 'Niebla'],
  [[51, 53, 55, 56, 57], 'Llovizna'],
  [[61, 63, 65, 66, 67], 'Lluvia'],
  [[71, 73, 75, 77], 'Nieve'],
  [[80, 81, 82], 'Chubascos'],
  [[85, 86], 'Nevadas'],
  [[95, 96, 99], 'Tormenta'],
];

export function weatherLabel(code: number): string {
  return WEATHER.find(([codes]) => codes.includes(code))?.[1] ?? 'Variable';
}

export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-BO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
