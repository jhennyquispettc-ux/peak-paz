import type { Readable } from 'node:stream';

export interface StoredFile {
  url: string;
  publicId: string;
}

export interface FileToStore {
  buffer: Buffer;
  extension: string;
  mimetype: string;
}

export interface OpenedFile {
  stream: Readable;
  mimetype: string;
}

export abstract class StorageService {
  abstract save(folder: string, file: FileToStore): Promise<StoredFile>;

  abstract open(stored: StoredFile): Promise<OpenedFile>;

  abstract remove(stored: StoredFile): Promise<void>;
}
