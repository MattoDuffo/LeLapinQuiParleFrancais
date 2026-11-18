import { parseKey } from './data';
import type { StoredCard } from './srs';
import { state } from './store';

/** User priority for a card: 1 (low), 2 (normal, the default) or 3 (high). */
export type Stars = 1 | 2 | 3;
export const DEFAULT_STARS: Stars = 2;

const DAY = 24 * 60 * 60 * 1000;
/** A 3-star card can come up to this share of its interval early. */
export const EARLY_SHARE = 0.35;
/** A 1-star card can come up to this share of its interval late. */
export const LATE_SHARE = 0.25;

export const starsFor = (cardId: string): Stars => state.priority[cardId] ?? DEFAULT_STARS;

export function setStars(cardId: string, stars: Stars): void {
  if (stars === DEFAULT_STARS) delete state.priority[cardId];
  else state.priority[cardId] = stars;
}

/** Stable pseudo-random number in [0, 1) for a string (FNV-1a hash). */
export function hashUnit(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 2 ** 32;
}

/**
 * When an item actually comes up for review, in ms. The scheduler's due date is
 * nudged by the card's priority: a 3-star card comes a random 0-35% of its interval
 * early, a 1-star card a random 0-25% late. The random share is drawn once per
 * review (seeded by the item and its last review), so it doesn't change between screens.
 * Cards still in short learning steps (interval under a day) are not nudged.
 */
export function dueAt(key: string, card: StoredCard, stars: Stars = starsFor(parseKey(key).cardId)): number {
  const due = new Date(card.due).getTime();
  const interval = card.scheduled_days * DAY;
  if (stars === DEFAULT_STARS || interval < DAY) return due;
  const u = hashUnit(`${key}|${card.last_review ?? ''}`);
  return Math.round(stars === 3 ? due - interval * EARLY_SHARE * u : due + interval * LATE_SHARE * u);
}

export const isDueNow = (key: string, card: StoredCard, now: Date) => dueAt(key, card) <= now.getTime();

/** Weight when picking new cards to add: 3-star cards are picked about twice as often, 1-star half as often. */
export const pickWeight = (cardId: string) => ({ 1: 0.5, 2: 1, 3: 2 })[starsFor(cardId)];
