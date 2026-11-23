import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const WAKE_INTERVAL_MS = 60_000;
const WAKE_TIMEOUT_MS = 120_000;

@Injectable()
export class WorkerWakeService {
  private readonly logger = new Logger(WorkerWakeService.name);
  private readonly url: string;
  private lastWakeAt = 0;

  constructor(config: ConfigService) {
    this.url = config.get<string>('VERIFICATION_WAKE_URL') ?? '';
  }

  wake(now = Date.now()): void {
    if (!this.url || now - this.lastWakeAt < WAKE_INTERVAL_MS) return;
    this.lastWakeAt = now;
    void fetch(this.url, { signal: AbortSignal.timeout(WAKE_TIMEOUT_MS) })
      .then((response) => response.body?.cancel())
      .catch((error: Error) => {
        this.lastWakeAt = 0;
        this.logger.warn(`Verification worker wake failed: ${error.message}`);
      });
  }
}
