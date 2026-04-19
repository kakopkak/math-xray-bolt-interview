import { randomUUID } from 'node:crypto';

export function createHomeworkShareToken() {
  return randomUUID().replace(/-/g, '').slice(0, 24);
}