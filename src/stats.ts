import { CATEGORY_ORDER, cards, itemKey } from './data';
import type { LogEntry } from './store';
import type { Progress } from './session';
import { STATE_REVIEW } from './srs';

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
  return Object.values(progress).filter((s) => new Date(s.due).getTime() <= until.getTime()).length;
}

/** Number of items becoming due on each of the next `days` days (today includes overdue). */
export function forecast(progress: Progress, now: Date, days = 7): number[] {
  const today = startOfDay(now).getTime();
  const out = new Array(days).fill(0);
  for (const s of Object.values(progress)) {
    const idx = Math.max(0, Math.floor((dayKey(new Date(s.due).getTime()) - today) / DAY + 0.5));
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
