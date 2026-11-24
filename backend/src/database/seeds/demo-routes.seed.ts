import { DataSource } from 'typeorm';
import { GearRecommendation } from '../../modules/routes/entities/gear-recommendation.entity.js';
import { PointOfInterest } from '../../modules/routes/entities/point-of-interest.entity.js';
import { Route } from '../../modules/routes/entities/route.entity.js';
import { AutonomyLevel } from '../../modules/routes/routes.enums.js';
import { GEAR, ROUTES } from './demo-route-data.js';

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
