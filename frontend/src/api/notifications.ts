import { noticesPathFor, type Role } from '../auth/roles';
import { api } from './client';
import type { Page } from './types';

export interface Notice {
  id: string;
  type: string;
  subject: string;
  body: string;
  link: string | null;
  emailStatus: 'PENDING' | 'SENT' | 'FAILED';
  readAt: string | null;
  createdAt: string;
}

export interface NoticePage extends Page<Notice> {
  unread: number;
}

export function listNotices(page: number, limit: number, unread: boolean) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (unread) query.set('unread', 'true');
  return api<NoticePage>(`/notifications/me?${query}`);
}

export function markNoticeRead(id: string) {
  return api<void>(`/notifications/me/${id}/read`, { method: 'PATCH' });
}

export function markAllNoticesRead() {
  return api<{ updated: number }>('/notifications/me/read-all', {
    method: 'POST',
  });
}

export function noticeHref(link: string | null, role: Role): string {
  if (!link) return noticesPathFor(role);
  if (link.startsWith('/guia/')) return link.replace('/guia/', '/panel/');
  if (link.startsWith('/reservas')) {
    if (role === 'GUIDE' || role === 'AGENCY') return `/panel${link}`;
    if (role === 'ADMIN') return `/admin${link}`;
  }
  return link;
}
