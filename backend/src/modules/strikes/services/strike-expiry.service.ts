import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { StrikesRepository } from '../repositories/strikes.repository.js';

const EVERY_HOUR = 60 * 60_000;

@Injectable()
export class StrikeExpiryService {
  private readonly logger = new Logger(StrikeExpiryService.name);

  constructor(private readonly strikes: StrikesRepository) {}

  @Interval('strike-expiry', EVERY_HOUR)
  async run(): Promise<void> {
    try {
      const expired = await this.strikes.expireDue(new Date());
      if (expired > 0) this.logger.log(`${expired} strikes expired`);
    } catch (error) {
      this.logger.error(
        'Strike expiry failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
