import { Logger, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { mimetypeForExtension } from './file-signature.js';
import {
  FileToStore,
  OpenedFile,
  StorageService,
  StoredFile,
} from './storage.service.js';

const ROOT_FOLDER = 'peak-paz';
const DOWNLOAD_LINK_SECONDS = 60;

type ResourceType = 'image' | 'raw';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryStorageService extends StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(credentials: CloudinaryCredentials) {
    super();
    if (
      !credentials.cloudName ||
      !credentials.apiKey ||
      !credentials.apiSecret
    ) {
      throw new Error(
        'STORAGE_DRIVER=cloudinary needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  async save(folder: string, file: FileToStore): Promise<StoredFile> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: `${ROOT_FOLDER}/${folder}`,
          type: 'private',
          resource_type: this.resourceTypeOf(file.extension),
        },
        (error, response) => {
          if (error || !response) reject(error ?? new Error('Empty upload'));
          else resolve(response);
        },
      );
      upload.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  async open(stored: StoredFile): Promise<OpenedFile> {
    const extension = this.extensionOf(stored.url);
    const resourceType = this.resourceTypeOf(extension);
    const link = cloudinary.utils.private_download_url(
      stored.publicId,
      resourceType === 'raw' ? '' : extension,
      {
        resource_type: resourceType,
        type: 'private',
        expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_SECONDS,
      },
    );
    const response = await fetch(link);
    if (!response.ok || !response.body) {
      this.logger.warn(
        `Download failed for ${stored.publicId}: HTTP ${response.status}`,
      );
      throw new NotFoundException({
        error: 'FILE_NOT_FOUND',
        message: 'The stored file could not be found.',
      });
    }
    return {
      stream: Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
      mimetype: mimetypeForExtension(extension),
    };
  }

  async remove(stored: StoredFile): Promise<void> {
    await cloudinary.uploader.destroy(stored.publicId, {
      type: 'private',
      resource_type: this.resourceTypeOf(this.extensionOf(stored.url)),
    });
  }

  private resourceTypeOf(extension: string): ResourceType {
    return extension === 'pdf' ? 'raw' : 'image';
  }

  private extensionOf(url: string): string {
    return new URL(url).pathname.split('.').pop() ?? '';
  }
}
