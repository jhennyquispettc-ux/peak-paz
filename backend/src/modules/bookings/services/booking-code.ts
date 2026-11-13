import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

export function generateBookingCode(): string {
  let code = '';
  for (let index = 0; index < LENGTH; index++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `PP-${code}`;
}
