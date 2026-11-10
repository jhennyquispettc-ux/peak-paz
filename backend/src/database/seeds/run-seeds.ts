import { AppDataSource } from '../data-source.js';
import { seedSettings } from './settings.seed.js';

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const settings = await seedSettings(AppDataSource);
    console.log(`Settings: ${settings} valores revisados`);
  } finally {
    await AppDataSource.destroy();
  }
}

await runSeeds();
