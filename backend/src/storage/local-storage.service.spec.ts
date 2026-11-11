import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { LocalStorageService } from './local-storage.service.js';

describe('LocalStorageService', () => {
  let directory: string;
  let storage: LocalStorageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'peak-paz-storage-'));
    storage = new LocalStorageService(directory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('saves, reads back and removes a file', async () => {
    const stored = await storage.save('guides/abc', {
      buffer: Buffer.from('%PDF-1.4 content'),
      extension: 'pdf',
      mimetype: 'application/pdf',
    });

    expect(stored.url).toBe(`local://${stored.publicId}`);
    expect(stored.publicId).toMatch(/^guides\/abc\/[0-9a-f-]{36}\.pdf$/);

    const opened = await storage.open(stored);
    expect(opened.mimetype).toBe('application/pdf');
    expect(await text(opened.stream)).toBe('%PDF-1.4 content');

    await storage.remove(stored);
    expect(await readdir(join(directory, 'guides', 'abc'))).toHaveLength(0);
  });

  it('refuses paths that leave the storage folder', async () => {
    await expect(
      storage.open({ url: 'local://x', publicId: '../../etc/passwd' }),
    ).rejects.toThrow('Invalid storage path.');
  });
});
