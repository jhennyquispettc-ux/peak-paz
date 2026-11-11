import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { mimetypeForExtension } from './file-signature.js';
import {
  FileToStore,
  OpenedFile,
  StorageService,
  StoredFile,
} from './storage.service.js';

const LOCAL_SCHEME = 'local://';

export class LocalStorageService extends StorageService {
  private readonly root: string;

  constructor(directory: string) {
    super();
    this.root = resolve(directory);
  }

  async save(folder: string, file: FileToStore): Promise<StoredFile> {
    const publicId = `${folder}/${randomUUID()}.${file.extension}`;
    const path = this.pathOf(publicId);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.buffer);
    return { url: `${LOCAL_SCHEME}${publicId}`, publicId };
  }

  async open(stored: StoredFile): Promise<OpenedFile> {
    const path = this.pathOf(stored.publicId);
    try {
      await access(path);
    } catch {
      throw new NotFoundException({
        error: 'FILE_NOT_FOUND',
        message: 'The stored file could not be found.',
      });
    }
    return {
      stream: createReadStream(path),
      mimetype: mimetypeForExtension(extname(path).slice(1)),
    };
  }

  async remove(stored: StoredFile): Promise<void> {
    await rm(this.pathOf(stored.publicId), { force: true });
  }

  private pathOf(publicId: string): string {
    const path = resolve(join(this.root, publicId));
    const inside = relative(this.root, path);
    if (inside.startsWith('..') || isAbsolute(inside)) {
      throw new Error('Invalid storage path.');
    }
    return path;
  }
}
