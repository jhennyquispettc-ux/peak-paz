import { AppDataSource } from '../data-source.js';
import { seedAdmin } from './admin.seed.js';
import { seedSettings } from './settings.seed.js';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const settings = await seedSettings(AppDataSource);
    console.log(`Settings: ${settings} valores revisados`);

    const admin = await seedAdmin(AppDataSource, {
      email: requiredEnv('SEED_ADMIN_EMAIL'),
      password: requiredEnv('SEED_ADMIN_PASSWORD'),
      firstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'Admin',
      lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Peak Paz',
    });
    console.log(
      admin === 'created' ? 'Admin: creado' : 'Admin: ya existía, sin cambios',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

await runSeeds();
