import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('stores the algorithm, a salt and the derived key', async () => {
    const hash = await service.hash('Trekking2026');
    const [algorithm, salt, key] = hash.split('$');

    expect(algorithm).toBe('scrypt');
    expect(Buffer.from(salt, 'base64')).toHaveLength(16);
    expect(Buffer.from(key, 'base64')).toHaveLength(64);
  });

  it('produces a different hash for the same password', async () => {
    const first = await service.hash('Trekking2026');
    const second = await service.hash('Trekking2026');

    expect(first).not.toBe(second);
  });

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await service.hash('Trekking2026');

    await expect(service.verify('Trekking2026', hash)).resolves.toBe(true);
    await expect(service.verify('trekking2026', hash)).resolves.toBe(false);
  });

  it('rejects a malformed stored hash', async () => {
    await expect(service.verify('Trekking2026', 'plain-text')).resolves.toBe(
      false,
    );
  });
});
