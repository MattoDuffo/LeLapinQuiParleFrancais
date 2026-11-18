import { CATEGORY_ORDER, cardById, cards, itemKey, type Dir } from './data';
import type { LogEntry } from './store';
import type { Progress } from './session';
import { dueAt } from './priority';
import { retrievability, STATE_REVIEW, type GradeValue, type StoredCard } from './srs';

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
  /** Chance of remembering it now (0-1), once it has been reviewed. */
  memory?: number;
}

/** Review history and schedule for each direction of a card. */
export function cardStats(cardId: string, progress: Progress, log: LogEntry[], now: Date): DirectionStats[] {
  const card = cardById.get(cardId);
  if (!card) return [];
  return card.directions.map((dir) => {
    const key = itemKey(cardId, dir);
    const stored = progress[key];
    const ratings: Record<GradeValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let views = 0;
    let lastReviewed: number | undefined;
    for (const e of log)
      if (e.k === key) {
        views++;
        ratings[e.g]++;
        lastReviewed = Math.max(lastReviewed ?? 0, e.t);
      }
    return {
      dir,
      stored,
      views,
      ratings,
      lastReviewed,
      due: stored ? dueAt(key, stored) : undefined,
      memory: stored && stored.reps > 0 ? retrievability(stored, now) : undefined,
    };
  });
}
