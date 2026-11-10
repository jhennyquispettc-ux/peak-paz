import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const ALGORITHM = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = await scryptAsync(password, salt, KEY_LENGTH);
    return [
      ALGORITHM,
      salt.toString('base64'),
      derived.toString('base64'),
    ].join('$');
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [algorithm, saltBase64, hashBase64] = stored.split('$');
    if (algorithm !== ALGORITHM || !saltBase64 || !hashBase64) return false;

    const expected = Buffer.from(hashBase64, 'base64');
    const derived = await scryptAsync(
      password,
      Buffer.from(saltBase64, 'base64'),
      expected.length,
    );
    return timingSafeEqual(derived, expected);
  }
}
