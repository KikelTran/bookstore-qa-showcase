import { randomBytes } from 'node:crypto';
import { env } from '../config/env';
import { Credentials } from '../api/types';

/** Run-unique, alphanumeric, prefixed: safe for parallel workers and for prefix cleanup. */
export function uniqueUserName(): string {
  return `${env.dataPrefix}${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

/** Meets demoqa rules: 8+ chars, upper, lower, digit, special. */
export function strongPassword(): string {
  return `Qa@${randomBytes(4).toString('hex')}9X`;
}

export function newCredentials(): Credentials {
  return { userName: uniqueUserName(), password: strongPassword() };
}
