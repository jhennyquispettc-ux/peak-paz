import { ApiError } from "./client";
import type { Itinerary, RouteDetail } from "./types";

type DemoRoute = Omit<RouteDetail, 'pointsOfInterest'> & {
  pointsOfInterest: (RouteDetail["pointsOfInterest"][number] & {
    minutesFromPrevious: number;
    isOvernight: boolean;
    nameEn: string;
  })[];
};

let catalog: Promise<DemoRoute[]> | undefined;
function loadCatalog() {
  return (catalog ??= fetch(
    `${import.meta.env.BASE_URL}demo/catalog.json`,
  ).then((response) => {
    if (!response.ok)
      throw new Error("No se pudo cargar el catálogo de ejemplo.");
    return response.json() as Promise<DemoRoute[]>;
  }));
}

const minutes = (time: string) => {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
};
const clock = (total: number) =>
  `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

function itinerary(route: DemoRoute, startTime: string): Itinerary {
  const start = minutes(startTime);
  if (
    !/^\d{2}:\d{2}$/.test(startTime) ||
    start < minutes(route.startTimeFrom) ||
    start > minutes(route.startTimeTo)
  ) {
    throw new ApiError(
      400,
      "START_TIME_OUTSIDE_WINDOW",
      "Elige una hora dentro del horario sugerido.",
    );
  }
  let day: number | null = null;
  let current = start;
  const days = new Map<number, Itinerary["days"][number]>();
  const stops = route.pointsOfInterest.map((point) => {
    const dayNumber = point.dayNumber ?? 1;
    if (day !== dayNumber) {
      day = dayNumber;
      current = start;
    }
    current += point.minutesFromPrevious;
    days.set(dayNumber, {
      dayNumber,
      startTime,
      endTime: clock(current),
      walkingMinutes: current - start,
    });
    return {
      stageOrder: point.stageOrder ?? 0,
      dayNumber,
      nameEs: point.nameEs,
      nameEn: point.nameEn,
      arrivalTime: clock(current),
      minutesFromPrevious: point.minutesFromPrevious,
      isOvernight: point.isOvernight,
    };
  });
  return {
    startTime,
    suggestedStartFrom: route.startTimeFrom,
    suggestedStartTo: route.startTimeTo,
    days: [...days.values()],
    stops,
  };
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export async function demoApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if ((init.method ?? "GET").toUpperCase() !== "GET") {
    throw new ApiError(
      403,
      "DEMO_READ_ONLY",
      "Esta demostración permite consultar rutas. Las cuentas, reservas y pagos no están habilitados.",
    );
  }
  const url = new URL(path, "https://demo.invalid");
  if (url.pathname === "/routes") {
    const routes = await loadCatalog();
    const search = normalize(url.searchParams.get("search") ?? "");
    const difficulty = url.searchParams.get("difficulty");
    const data = routes.filter(
      (route) =>
        (!difficulty || route.difficulty === difficulty) &&
        normalize(`${route.nameEs} ${route.nameEn}`).includes(search),
    );
    return {
      data,
      meta: {
        page: 1,
        limit: 100,
        total: data.length,
        totalPages: data.length ? 1 : 0,
      },
    } as T;
  }
  const match = url.pathname.match(
    /^\/routes\/([^/]+)(?:\/(itinerary|weather|guides))?$/,
  );
  if (match) {
    const route = (await loadCatalog()).find(
      (entry) => entry.slug === decodeURIComponent(match[1]),
    );
    if (!route)
      throw new ApiError(404, "ROUTE_NOT_FOUND", "No encontramos esa ruta.");
    if (!match[2]) return route as T;
    if (match[2] === "guides") return [] as T;
    if (match[2] === "itinerary")
      return itinerary(
        route,
        url.searchParams.get("startTime") ?? route.startTimeFrom,
      ) as T;
    throw new ApiError(
      503,
      "WEATHER_UNAVAILABLE",
      "La demostración no incluye pronósticos en tiempo real.",
    );
  }
  throw new ApiError(
    403,
    "DEMO_READ_ONLY",
    "Esta función requiere el backend del proyecto. Consulta el catálogo de demostración.",
  );
}
