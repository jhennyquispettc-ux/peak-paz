import { describe, expect, it } from 'vitest';
import { parseEnvelope } from './messaging.contracts.js';

describe('message envelope', () => {
  it('reads a valid envelope', () => {
    const body = Buffer.from(
      JSON.stringify({
        id: 'a',
        type: 'system.pong',
        version: 1,
        occurredAt: '2026-11-21T12:00:00Z',
        correlationId: 'b',
        data: { service: 'verification-python' },
      }),
    );
    expect(parseEnvelope(body)?.correlationId).toBe('b');
  });

  it('rejects invalid messages', () => {
    expect(parseEnvelope(Buffer.from('not json'))).toBeNull();
    expect(
      parseEnvelope(
        Buffer.from(
          JSON.stringify({ id: 'a', type: 'x', version: 2, data: {} }),
        ),
      ),
    ).toBeNull();
    expect(
      parseEnvelope(
        Buffer.from(JSON.stringify({ id: 'a', type: 'x', version: 1 })),
      ),
    ).toBeNull();
  });
});
