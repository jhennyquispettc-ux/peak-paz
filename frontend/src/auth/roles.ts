import type { User } from '../api/types';

export type Role = User['role'];

export function homeFor(role: Role): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'GUIDE' || role === 'AGENCY') return '/panel';
  return '/rutas';
}

export function noticesPathFor(role: Role): string {
  if (role === 'ADMIN') return '/admin/avisos';
  if (role === 'GUIDE' || role === 'AGENCY') return '/panel/avisos';
  return '/avisos';
}

export function needsEmailCheck(user: User): boolean {
  return (
    (user.role === 'TOURIST' || user.role === 'GUIDE') && !user.emailVerifiedAt
  );
}
