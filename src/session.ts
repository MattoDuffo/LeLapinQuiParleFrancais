import { cardById, cardsInSheets, itemKey, parseKey, type CardData, type Dir, type DirChoice } from './data';
import { gradeCard, isDue, newCard, STATE_REVIEW, type GradeValue, type StoredCard } from './srs';

export type Progress = Record<string, StoredCard>;

export interface SessionItem {
  key: string;
  card: CardData;
  dir: Dir;
}

/** Cards graded again within this window come back later in the same session. */
export const REQUEUE_WINDOW_MS = 20 * 60 * 1000;

const directionsFor = (card: CardData, choice: DirChoice): Dir[] =>
  card.directions.filter((d) => choice === 'mixed' || d === choice);

export const isAdded = (progress: Progress, card: CardData) =>
  card.directions.some((d) => itemKey(card.id, d) in progress);

export function dueItems(progress: Progress, sheetIds: string[], choice: DirChoice, now: Date): SessionItem[] {
  const items: SessionItem[] = [];
  for (const card of cardsInSheets(sheetIds)) {
    for (const dir of directionsFor(card, choice)) {
      const key = itemKey(card.id, dir);
      const stored = progress[key];
      if (stored && isDue(stored, now)) items.push({ key, card, dir });
    }
  }
  return items.sort(
    (a, b) => new Date(progress[a.key].due).getTime() - new Date(progress[b.key].due).getTime(),
  );
}

/**
 * Shuffle a session so cards don't come in printed order, and keep the two
 * directions of the same card apart (Mixed mode) where possible.
 */
export function shuffleItems(items: SessionItem[], random: () => number = Math.random): SessionItem[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Rebuild the order, never placing a card right after its other direction.
  const out: SessionItem[] = [];
  const sameCard = (a: SessionItem | undefined, b: SessionItem) => a?.card.id === b.card.id;
  while (pool.length) {
    const idx = pool.findIndex((x) => !sameCard(out[out.length - 1], x));
    if (idx !== -1) {
      out.push(pool.splice(idx, 1)[0]);
      continue;
    }
    // Only the twin of the last card is left: slot it in earlier between two other cards.
    const item = pool.shift()!;
    const spot = out.findIndex((x, k) => !sameCard(x, item) && (k === 0 || !sameCard(out[k - 1], item)));
    out.splice(spot === -1 ? out.length : spot, 0, item);
  }
  return out;
}

export function newCardsAvailable(progress: Progress, sheetIds: string[]): CardData[] {
  return cardsInSheets(sheetIds).filter((c) => !isAdded(progress, c));
}

/** Introduce `count` unstudied cards chosen at random, in every direction they support. */
export function addNewCards(
  progress: Progress,
  sheetIds: string[],
  count: number,
  now: Date,
  random: () => number = Math.random,
): CardData[] {
  // Pick at random from everything not yet studied in the chosen categories.
  const pool = newCardsAvailable(progress, sheetIds);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const added = pool.slice(0, count);
  for (const card of added) for (const dir of card.directions) progress[itemKey(card.id, dir)] = newCard(now);
  return added;
}

export interface SheetCounts {
  due: number;
  fresh: number;
  learned: number;
  total: number;
}

export function sheetCounts(progress: Progress, sheetId: string, choice: DirChoice, now: Date): SheetCounts {
  const list = cardsInSheets([sheetId]);
  let learned = 0;
  let total = 0;
  for (const card of list)
    for (const dir of card.directions) {
      total++;
      if (progress[itemKey(card.id, dir)]?.state === STATE_REVIEW) learned++;
    }
  return {
    due: dueItems(progress, [sheetId], choice, now).length,
    fresh: list.filter((c) => !isAdded(progress, c)).length,
    learned,
    total,
  };
}

interface HistoryEntry {
  item: SessionItem;
  before: StoredCard;
  queue: SessionItem[];
  grade: GradeValue;
}

export class Session {
  queue: SessionItem[];
  history: HistoryEntry[] = [];
  readonly gradeCounts: Record<GradeValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  constructor(
    items: SessionItem[],
    private progress: Progress,
    private random: () => number = Math.random,
  ) {
    this.queue = [...items];
  }

  get current(): SessionItem | undefined {
    return this.queue[0];
  }

  get reviewed(): number {
    return this.history.length;
  }

  answer(grade: GradeValue, now: Date): StoredCard {
    const item = this.queue[0];
    if (!item) throw new Error('No card to answer');
    const before = this.progress[item.key];
    const after = gradeCard(before, grade, now);
    this.history.push({ item, before, queue: [...this.queue], grade });
    this.gradeCounts[grade]++;
    this.progress[item.key] = after;
    this.queue.shift();
    if (new Date(after.due).getTime() - now.getTime() < REQUEUE_WINDOW_MS) {
      const gap = 3 + Math.floor(this.random() * 3); // after 3-5 other cards
      this.queue.splice(Math.min(gap, this.queue.length), 0, item);
    }
    return after;
  }

  undo(): SessionItem | undefined {
    const last = this.history.pop();
    if (!last) return undefined;
    this.progress[last.item.key] = last.before;
    this.queue = last.queue;
    this.gradeCounts[last.grade]--;
    return last.item;
  }
}

/** Earliest upcoming due date across all studied items. */
export function nextDue(progress: Progress, now: Date): Date | undefined {
  let best: number | undefined;
  for (const s of Object.values(progress)) {
    const t = new Date(s.due).getTime();
    if (t > now.getTime() && (best === undefined || t < best)) best = t;
  }
  return best === undefined ? undefined : new Date(best);
}

export const cardForKey = (key: string) => cardById.get(parseKey(key).cardId);
