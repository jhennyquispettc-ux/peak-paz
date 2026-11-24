import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { GEAR, ROUTES } from "../backend/src/database/seeds/demo-route-data.js";

// Only the repository's fictional route seeds are exported, never a local database.
const catalog = ROUTES.map((demo) => ({
  id: `demo-${demo.slug}`,
  slug: demo.slug,
  nameEs: demo.nameEs,
  nameEn: demo.nameEn,
  difficulty: demo.difficulty,
  days: demo.days,
  distanceKm: demo.distanceKm,
  elevationGainM: demo.gain,
  elevationLossM: demo.loss,
  maxAltitudeM: demo.maxAlt,
  privatePrice: demo.privatePrice,
  groupMinPrice: demo.groupMinPrice,
  privateMaxPeople: 5,
  coverPhotoUrl: null,
  descriptionEs: demo.descriptionEs,
  descriptionEn: demo.descriptionEs,
  howToGetThereEs: demo.howToGetThereEs,
  howToGetThereEn: demo.howToGetThereEs,
  bestSeasonEs: "De mayo a septiembre, en la época seca.",
  bestSeasonEn: "From May to September, in the dry season.",
  emergencyContacts: "Policía 110 · Bomberos 119 · Ambulancia 165",
  startLatitude: demo.stops[0].lat,
  startLongitude: demo.stops[0].lng,
  startTimeFrom: demo.window[0],
  startTimeTo: demo.window[1],
  track: {
    type: "LineString",
    coordinates: demo.stops.map((stop) => [stop.lng, stop.lat, stop.alt]),
  },
  pointsOfInterest: demo.stops.map((stop, index) => ({
    id: `${demo.slug}-stop-${index}`,
    type: stop.type,
    nameEs: stop.name,
    nameEn: stop.name,
    latitude: stop.lat,
    longitude: stop.lng,
    altitudeM: stop.alt,
    isItineraryStop: true,
    stageOrder: index + 1,
    dayNumber: stop.day,
    minutesFromPrevious: stop.minutes,
    isOvernight: stop.overnight ?? false,
  })),
  gearRecommendations: GEAR.map((gear, index) => ({
    id: `demo-gear-${index}`,
    descriptionEs: gear.es,
    descriptionEn: gear.en,
    isRequired: gear.required,
  })),
}));

const directory = new URL("../frontend/public/demo/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("catalog.json", directory),
  `${JSON.stringify(catalog, null, 2)}\n`,
);
console.log(
  `${catalog.length} demo routes exported to ${fileURLToPath(directory)}`,
);
