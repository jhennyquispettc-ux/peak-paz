import { DataSource } from 'typeorm';
import { GearRecommendation } from '../../modules/routes/entities/gear-recommendation.entity.js';
import { PointOfInterest } from '../../modules/routes/entities/point-of-interest.entity.js';
import { Route } from '../../modules/routes/entities/route.entity.js';
import {
  AutonomyLevel,
  Difficulty,
  GearCategory,
  PointOfInterestType,
} from '../../modules/routes/routes.enums.js';

interface DemoStop {
  name: string;
  type: PointOfInterestType;
  lat: number;
  lng: number;
  alt: number;
  day: number;
  minutes: number;
  overnight?: boolean;
}

interface DemoRoute {
  slug: string;
  nameEs: string;
  nameEn: string;
  difficulty: Difficulty;
  days: number;
  distanceKm: number;
  gain: number;
  loss: number;
  maxAlt: number;
  window: [string, string];
  privatePrice: number;
  groupMinPrice: number;
  descriptionEs: string;
  howToGetThereEs: string;
  stops: DemoStop[];
}

const NOTE =
  'Datos referenciales para la demostración. Deben verificarse con el trazado GPX real.';

const CHORO_STOPS: DemoStop[] = [
  {
    name: 'La Cumbre',
    type: PointOfInterestType.START,
    lat: -16.354,
    lng: -68.039,
    alt: 4650,
    day: 1,
    minutes: 0,
  },
  {
    name: 'Apacheta Chucura',
    type: PointOfInterestType.VIEWPOINT,
    lat: -16.335,
    lng: -68.016,
    alt: 4860,
    day: 1,
    minutes: 120,
  },
  {
    name: 'Challapampa',
    type: PointOfInterestType.CAMPSITE,
    lat: -16.29,
    lng: -67.95,
    alt: 2800,
    day: 1,
    minutes: 330,
    overnight: true,
  },
];

const ROUTES: DemoRoute[] = [
  {
    slug: 'choro-2-dias',
    nameEs: 'El Choro en 2 días',
    nameEn: 'El Choro in 2 days',
    difficulty: Difficulty.HARD,
    days: 2,
    distanceKm: 57,
    gain: 600,
    loss: 3900,
    maxAlt: 4860,
    window: ['06:00', '08:00'],
    privatePrice: 900,
    groupMinPrice: 380,
    descriptionEs: `Camino prehispánico que baja desde la cordillera hasta los Yungas, pasando del altiplano al bosque nublado. Versión exigente en dos jornadas largas. ${NOTE}`,
    howToGetThereEs:
      'Transporte desde Villa Fátima hasta La Cumbre, en el camino a los Yungas.',
    stops: [
      ...CHORO_STOPS,
      {
        name: 'Challapampa',
        type: PointOfInterestType.CAMPSITE,
        lat: -16.29,
        lng: -67.95,
        alt: 2800,
        day: 2,
        minutes: 0,
      },
      {
        name: 'Sandillani',
        type: PointOfInterestType.SHELTER,
        lat: -16.24,
        lng: -67.84,
        alt: 2050,
        day: 2,
        minutes: 300,
      },
      {
        name: 'Chairo',
        type: PointOfInterestType.END,
        lat: -16.215,
        lng: -67.735,
        alt: 1300,
        day: 2,
        minutes: 240,
      },
    ],
  },
  {
    slug: 'choro-3-dias',
    nameEs: 'El Choro en 3 días',
    nameEn: 'El Choro in 3 days',
    difficulty: Difficulty.MODERATE,
    days: 3,
    distanceKm: 57,
    gain: 600,
    loss: 3900,
    maxAlt: 4860,
    window: ['06:00', '08:00'],
    privatePrice: 1100,
    groupMinPrice: 450,
    descriptionEs: `El mismo camino prehispánico del Choro, repartido en tres días para caminar con calma y disfrutar el cambio de paisaje. ${NOTE}`,
    howToGetThereEs:
      'Transporte desde Villa Fátima hasta La Cumbre, en el camino a los Yungas.',
    stops: [
      ...CHORO_STOPS,
      {
        name: 'Challapampa',
        type: PointOfInterestType.CAMPSITE,
        lat: -16.29,
        lng: -67.95,
        alt: 2800,
        day: 2,
        minutes: 0,
      },
      {
        name: 'Sandillani',
        type: PointOfInterestType.CAMPSITE,
        lat: -16.24,
        lng: -67.84,
        alt: 2050,
        day: 2,
        minutes: 300,
        overnight: true,
      },
      {
        name: 'Sandillani',
        type: PointOfInterestType.CAMPSITE,
        lat: -16.24,
        lng: -67.84,
        alt: 2050,
        day: 3,
        minutes: 0,
      },
      {
        name: 'Chairo',
        type: PointOfInterestType.END,
        lat: -16.215,
        lng: -67.735,
        alt: 1300,
        day: 3,
        minutes: 240,
      },
    ],
  },
  {
    slug: 'takesi-1-dia',
    nameEs: 'Takesi en 1 día',
    nameEn: 'Takesi in 1 day',
    difficulty: Difficulty.HARD,
    days: 1,
    distanceKm: 23,
    gain: 400,
    loss: 2400,
    maxAlt: 4630,
    window: ['05:30', '07:00'],
    privatePrice: 550,
    groupMinPrice: 250,
    descriptionEs: `Uno de los caminos empedrados mejor conservados de Bolivia, desde la apacheta de Takesi hasta el valle. Jornada larga para caminantes con experiencia en altura. ${NOTE}`,
    howToGetThereEs: 'Transporte desde La Paz hasta Choquekhota, por Palca.',
    stops: [
      {
        name: 'Choquekhota',
        type: PointOfInterestType.START,
        lat: -16.43,
        lng: -67.98,
        alt: 4200,
        day: 1,
        minutes: 0,
      },
      {
        name: 'Apacheta de Takesi',
        type: PointOfInterestType.VIEWPOINT,
        lat: -16.415,
        lng: -67.935,
        alt: 4630,
        day: 1,
        minutes: 150,
      },
      {
        name: 'Takesi',
        type: PointOfInterestType.SHELTER,
        lat: -16.39,
        lng: -67.87,
        alt: 3600,
        day: 1,
        minutes: 180,
      },
      {
        name: 'Kakapi',
        type: PointOfInterestType.END,
        lat: -16.37,
        lng: -67.81,
        alt: 2600,
        day: 1,
        minutes: 150,
      },
    ],
  },
  {
    slug: 'takesi-2-dias',
    nameEs: 'Takesi en 2 días',
    nameEn: 'Takesi in 2 days',
    difficulty: Difficulty.MODERATE,
    days: 2,
    distanceKm: 40,
    gain: 450,
    loss: 2900,
    maxAlt: 4630,
    window: ['06:00', '08:00'],
    privatePrice: 800,
    groupMinPrice: 350,
    descriptionEs: `El camino prehispánico de Takesi completo hasta Yanacachi, con noche de campamento en el valle. ${NOTE}`,
    howToGetThereEs: 'Transporte desde La Paz hasta Choquekhota, por Palca.',
    stops: [
      {
        name: 'Choquekhota',
        type: PointOfInterestType.START,
        lat: -16.43,
        lng: -67.98,
        alt: 4200,
        day: 1,
        minutes: 0,
      },
      {
        name: 'Apacheta de Takesi',
        type: PointOfInterestType.VIEWPOINT,
        lat: -16.415,
        lng: -67.935,
        alt: 4630,
        day: 1,
        minutes: 150,
      },
      {
        name: 'Takesi',
        type: PointOfInterestType.CAMPSITE,
        lat: -16.39,
        lng: -67.87,
        alt: 3600,
        day: 1,
        minutes: 180,
        overnight: true,
      },
      {
        name: 'Takesi',
        type: PointOfInterestType.CAMPSITE,
        lat: -16.39,
        lng: -67.87,
        alt: 3600,
        day: 2,
        minutes: 0,
      },
      {
        name: 'Kakapi',
        type: PointOfInterestType.WATER,
        lat: -16.37,
        lng: -67.81,
        alt: 2600,
        day: 2,
        minutes: 150,
      },
      {
        name: 'Yanacachi',
        type: PointOfInterestType.END,
        lat: -16.39,
        lng: -67.75,
        alt: 2100,
        day: 2,
        minutes: 180,
      },
    ],
  },
  {
    slug: 'valle-de-las-animas-medio-dia',
    nameEs: 'Valle de las Ánimas, medio día',
    nameEn: 'Valley of the Souls, half day',
    difficulty: Difficulty.EASY,
    days: 1,
    distanceKm: 6,
    gain: 350,
    loss: 350,
    maxAlt: 3900,
    window: ['07:00', '10:00'],
    privatePrice: 250,
    groupMinPrice: 120,
    descriptionEs: `Caminata corta entre torres de arcilla erosionada al sur de la ciudad, con vista al Illimani. Ideal para aclimatarse. ${NOTE}`,
    howToGetThereEs:
      'Transporte público hasta Ovejuyo y luego a pie hasta el inicio del sendero.',
    stops: [
      {
        name: 'Ovejuyo',
        type: PointOfInterestType.START,
        lat: -16.528,
        lng: -68.04,
        alt: 3650,
        day: 1,
        minutes: 0,
      },
      {
        name: 'Mirador de las Ánimas',
        type: PointOfInterestType.VIEWPOINT,
        lat: -16.515,
        lng: -68.025,
        alt: 3900,
        day: 1,
        minutes: 90,
      },
      {
        name: 'Ovejuyo',
        type: PointOfInterestType.END,
        lat: -16.528,
        lng: -68.04,
        alt: 3650,
        day: 1,
        minutes: 75,
      },
    ],
  },
  {
    slug: 'valle-de-las-animas-canon-de-palca',
    nameEs: 'Valle de las Ánimas hasta el Cañón de Palca',
    nameEn: 'Valley of the Souls to Palca Canyon',
    difficulty: Difficulty.MODERATE,
    days: 1,
    distanceKm: 16,
    gain: 600,
    loss: 900,
    maxAlt: 4100,
    window: ['06:30', '08:30'],
    privatePrice: 450,
    groupMinPrice: 200,
    descriptionEs: `Travesía de un día desde el Valle de las Ánimas hasta el cañón de Palca, entre formaciones de roca y quebradas. ${NOTE}`,
    howToGetThereEs:
      'Transporte público hasta Ovejuyo. El regreso se hace en transporte desde Palca.',
    stops: [
      {
        name: 'Ovejuyo',
        type: PointOfInterestType.START,
        lat: -16.528,
        lng: -68.04,
        alt: 3650,
        day: 1,
        minutes: 0,
      },
      {
        name: 'Valle de las Ánimas',
        type: PointOfInterestType.VIEWPOINT,
        lat: -16.515,
        lng: -68.02,
        alt: 4000,
        day: 1,
        minutes: 120,
      },
      {
        name: 'Cañón de Palca',
        type: PointOfInterestType.VIEWPOINT,
        lat: -16.555,
        lng: -67.975,
        alt: 3300,
        day: 1,
        minutes: 180,
      },
      {
        name: 'Palca',
        type: PointOfInterestType.END,
        lat: -16.56,
        lng: -67.955,
        alt: 3200,
        day: 1,
        minutes: 60,
      },
    ],
  },
  {
    slug: 'muela-del-diablo',
    nameEs: 'Muela del Diablo',
    nameEn: "Devil's Tooth",
    difficulty: Difficulty.EASY,
    days: 1,
    distanceKm: 7,
    gain: 450,
    loss: 450,
    maxAlt: 3830,
    window: ['07:00', '10:00'],
    privatePrice: 250,
    groupMinPrice: 120,
    descriptionEs: `Subida al cerro con forma de muela que domina la zona sur de La Paz, con vista a la ciudad y a la cordillera. ${NOTE}`,
    howToGetThereEs:
      'Transporte hasta el cementerio de Calacoto o Pedregal, y desde ahí a pie.',
    stops: [
      {
        name: 'Pedregal',
        type: PointOfInterestType.START,
        lat: -16.555,
        lng: -68.09,
        alt: 3400,
        day: 1,
        minutes: 0,
      },
      {
        name: 'Muela del Diablo',
        type: PointOfInterestType.VIEWPOINT,
        lat: -16.565,
        lng: -68.075,
        alt: 3830,
        day: 1,
        minutes: 120,
      },
      {
        name: 'Pedregal',
        type: PointOfInterestType.END,
        lat: -16.555,
        lng: -68.09,
        alt: 3400,
        day: 1,
        minutes: 90,
      },
    ],
  },
];

const GEAR: {
  category: GearCategory;
  es: string;
  en: string;
  required: boolean;
}[] = [
  {
    category: GearCategory.CLOTHING,
    es: 'Chamarra impermeable',
    en: 'Waterproof jacket',
    required: true,
  },
  {
    category: GearCategory.WATER,
    es: 'Dos litros de agua',
    en: 'Two liters of water',
    required: true,
  },
  {
    category: GearCategory.EQUIPMENT,
    es: 'Protector solar y gorra',
    en: 'Sunscreen and cap',
    required: false,
  },
];

export async function seedDemoRoutes(dataSource: DataSource): Promise<number> {
  const routes = dataSource.getRepository(Route);
  let created = 0;

  for (const demo of ROUTES) {
    if (
      await routes.exists({ where: { slug: demo.slug }, withDeleted: true })
    ) {
      continue;
    }
    await dataSource.transaction(async (manager) => {
      const start = demo.stops[0];
      const route = await manager.getRepository(Route).save(
        manager.getRepository(Route).create({
          slug: demo.slug,
          nameEs: demo.nameEs,
          nameEn: demo.nameEn,
          descriptionEs: demo.descriptionEs,
          descriptionEn: demo.descriptionEs,
          difficulty: demo.difficulty,
          autonomyLevel: AutonomyLevel.GUIDE_RECOMMENDED,
          days: demo.days,
          distanceKm: demo.distanceKm,
          elevationGainM: demo.gain,
          elevationLossM: demo.loss,
          maxAltitudeM: demo.maxAlt,
          startTimeFrom: demo.window[0],
          startTimeTo: demo.window[1],
          howToGetThereEs: demo.howToGetThereEs,
          howToGetThereEn: demo.howToGetThereEs,
          bestSeasonEs: 'De mayo a septiembre, en la época seca.',
          bestSeasonEn: 'From May to September, in the dry season.',
          emergencyContacts: 'Policía 110 · Bomberos 119 · Ambulancia 165',
          startLatitude: start.lat,
          startLongitude: start.lng,
          track: {
            type: 'LineString',
            coordinates: demo.stops.map((stop) => [
              stop.lng,
              stop.lat,
              stop.alt,
            ]),
          },
          privatePrice: demo.privatePrice,
          groupMinPrice: demo.groupMinPrice,
          groupMaxPeople: 12,
          isPublished: true,
        }),
      );

      await manager.getRepository(PointOfInterest).save(
        demo.stops.map((stop, index) =>
          manager.getRepository(PointOfInterest).create({
            routeId: route.id,
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
          }),
        ),
      );

      await manager.getRepository(GearRecommendation).save(
        GEAR.map((gear) =>
          manager.getRepository(GearRecommendation).create({
            routeId: route.id,
            category: gear.category,
            descriptionEs: gear.es,
            descriptionEn: gear.en,
            isRequired: gear.required,
          }),
        ),
      );
    });
    created++;
  }
  return created;
}
