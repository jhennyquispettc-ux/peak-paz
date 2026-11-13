import { AppDataSource } from '../data-source.js';
import { seedDemoRoutes } from './demo-routes.seed.js';

await AppDataSource.initialize();
try {
  const created = await seedDemoRoutes(AppDataSource);
  console.log(`Rutas de demostración: ${created} creadas`);
} finally {
  await AppDataSource.destroy();
}
