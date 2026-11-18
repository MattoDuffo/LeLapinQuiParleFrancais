import { CATEGORY_ORDER, cardById, cards, itemKey, type Dir } from './data';
import type { LogEntry } from './store';
import type { Progress } from './session';
import { dueAt } from './priority';
import { STATE_REVIEW, type GradeValue, type StoredCard } from './srs';

const DAY = 24 * 60 * 60 * 1000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey = (t: number) => startOfDay(new Date(t)).getTime();

export function reviewedToday(log: LogEntry[], now: Date): number {
  const start = startOfDay(now).getTime();
  return log.filter((e) => e.t >= start).length;
}

/** Consecutive days with at least one review, ending today (or yesterday if not studied yet today). */
export function streak(log: LogEntry[], now: Date): number {
  const days = new Set(log.map((e) => dayKey(e.t)));
  let day = startOfDay(now);
  if (!days.has(day.getTime())) day = new Date(day.getTime() - DAY);
  let count = 0;
  while (days.has(day.getTime())) {
    count++;
    day = startOfDay(new Date(day.getTime() - DAY / 2)); // DST-safe step back one day
  }
  return count;
}

export function dueBy(progress: Progress, until: Date): number {
  return Object.entries(progress).filter(([key, s]) => dueAt(key, s) <= until.getTime()).length;
}

/** Number of items becoming due on each of the next `days` days (today includes overdue). */
export function forecast(progress: Progress, now: Date, days = 7): number[] {
  const today = startOfDay(now).getTime();
  const out = new Array(days).fill(0);
  for (const [key, s] of Object.entries(progress)) {
    const idx = Math.max(0, Math.floor((dayKey(dueAt(key, s)) - today) / DAY + 0.5));
    if (idx < days) out[idx]++;
  }
  return out;
}

export interface CategoryProgress {
  category: string;
  learned: number;
  studying: number;
  total: number;
}

export function categoryProgress(progress: Progress): CategoryProgress[] {
  return CATEGORY_ORDER.map((category) => {
    let learned = 0;
    let studying = 0;
    let total = 0;
    for (const card of cards.filter((c) => c.category === category))
      for (const dir of card.directions) {
        total++;
        const s = progress[itemKey(card.id, dir)];
        if (s) {
          studying++;
          if (s.state === STATE_REVIEW) learned++;
        }
      }
    return { category, learned, studying, total };
  });
}

export interface DirectionStats {
  dir: Dir;
  /** Scheduler state, or undefined if the card hasn't been added yet. */
  stored?: StoredCard;
  views: number;
  ratings: Record<GradeValue, number>;
  lastReviewed?: number;
  /** When it next comes up, priority included (ms). */
  due?: number;
  /** Average grade (0-1), recent reviews counting more; undefined before the first review. */
  score?: number;
}

/** Each rating as a share: Forgot 0, Hard 1/3, Good 2/3, Easy 1. */
const GRADE_SHARE: Record<GradeValue, number> = { 1: 0, 2: 1 / 3, 3: 2 / 3, 4: 1 };

/**
 * Weighted average of a card's grades, oldest first: the n-th review counts n times,
 * so the score follows how well it is known now. Forgot, Hard, Good, Good, Easy -> 69%.
 */
export function gradeScore(grades: GradeValue[]): number | undefined {
  if (!grades.length) return undefined;
  let sum = 0;
  let weights = 0;
  grades.forEach((g, i) => {
    sum += GRADE_SHARE[g] * (i + 1);
    weights += i + 1;
  });
  return sum / weights;
}

/** Review history and schedule for each direction of a card. */
export function cardStats(cardId: string, progress: Progress, log: LogEntry[]): DirectionStats[] {
  const card = cardById.get(cardId);
  if (!card) return [];
  return card.directions.map((dir) => {
    const key = itemKey(cardId, dir);
    const stored = progress[key];
    const ratings: Record<GradeValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const reviews = log.filter((e) => e.k === key).sort((a, b) => a.t - b.t);
    for (const e of reviews) ratings[e.g]++;
    return {
      dir,
      stored,
      views: reviews.length,
      ratings,
      lastReviewed: reviews.at(-1)?.t,
      due: stored ? dueAt(key, stored) : undefined,
      score: gradeScore(reviews.map((e) => e.g)),
    };
  });
}
