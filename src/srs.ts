import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

/** FSRS card as stored in IndexedDB / export files (dates as ISO strings). */
export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export type GradeValue = 1 | 2 | 3 | 4;
export const GRADES: GradeValue[] = [1, 2, 3, 4];
export const STATE_REVIEW = 2;

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

const toStored = (c: Card): StoredCard => ({
  due: c.due.toISOString(),
  stability: c.stability,
  difficulty: c.difficulty,
  elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  last_review: c.last_review?.toISOString(),
});

const fromStored = (s: StoredCard): Card => ({
  ...s,
  due: new Date(s.due),
  last_review: s.last_review ? new Date(s.last_review) : undefined,
});

const RATING: Record<GradeValue, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

export const newCard = (now: Date): StoredCard => toStored(createEmptyCard(now));

export function gradeCard(card: StoredCard, grade: GradeValue, now: Date): StoredCard {
  return toStored(scheduler.next(fromStored(card), now, RATING[grade]).card);
}

/** Next due time for each grade, without changing the card. */
export function previewDue(card: StoredCard, now: Date): Record<GradeValue, Date> {
  const log = scheduler.repeat(fromStored(card), now);
  return {
    1: log[Rating.Again].card.due,
    2: log[Rating.Hard].card.due,
    3: log[Rating.Good].card.due,
    4: log[Rating.Easy].card.due,
  };
}

export const isDue = (card: StoredCard, now: Date) => new Date(card.due).getTime() <= now.getTime();

