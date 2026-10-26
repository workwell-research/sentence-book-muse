import { interestProfileSchema } from '../../shared/interests';
import type { InterestProfile } from '../../shared/interests';

export const INTERESTS_KEY = 'sentence-book-muse:interests:v1';
export type InterestRead = { kind: 'missing' } | { kind: 'ready'; profile: InterestProfile } | { kind: 'unreadable' };
type InterestStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readInterests(storage: InterestStorage): InterestRead {
  try {
    const raw = storage.getItem(INTERESTS_KEY);
    if (raw === null) return { kind: 'missing' };
    const result = interestProfileSchema.safeParse(JSON.parse(raw));
    return result.success ? { kind: 'ready', profile: result.data } : { kind: 'unreadable' };
  } catch { return { kind: 'unreadable' }; }
}

export function saveInterests(storage: InterestStorage, interests: string[]): InterestProfile {
  const profile = interestProfileSchema.parse({ schemaVersion: 1, interests });
  if (readInterests(storage).kind === 'unreadable') throw new Error('unreadable-storage');
  storage.setItem(INTERESTS_KEY, JSON.stringify(profile));
  return profile;
}
