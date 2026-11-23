import type { ConfigService } from '@nestjs/config';
import { WAKE_INTERVAL_MS, WorkerWakeService } from './worker-wake.service.js';

const configWith = (url: string) =>
  ({ get: () => url }) as unknown as ConfigService;

describe('WorkerWakeService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing without a configured address', () => {
    new WorkerWakeService(configWith('')).wake();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the worker only once per interval', () => {
    const service = new WorkerWakeService(configWith('https://worker/health'));
    service.wake(100_000);
    service.wake(100_000 + WAKE_INTERVAL_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    service.wake(100_000 + WAKE_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never throws and allows a new attempt after a failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('sleeping'));
    const service = new WorkerWakeService(configWith('https://worker/health'));
    expect(() => service.wake(100_000)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    service.wake(100_001);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
