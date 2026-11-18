import { describe, expect, it } from 'vitest';
import { cards, itemKey } from './data';
import { addNewCards, dueItems, newCardsAvailable, Session, sheetCounts, shuffleItems, type Progress } from './session';

const now = new Date('2026-11-17T12:00:00Z');

describe('cards', () => {
  it('has 144 cards with 278 review directions', () => {
    expect(cards).toHaveLength(144);
    expect(cards.reduce((n, c) => n + c.directions.length, 0)).toBe(278);
    expect(cards.filter((c) => c.type === 'pronunciation')).toHaveLength(10);
  });
});

describe('adding and reviewing cards', () => {
  it('adds new cards in printed order, in every direction', () => {
    const p: Progress = {};
    const added = addNewCards(p, ['A'], 3, now);
    expect(added.map((c) => c.id)).toEqual(['A-r1c1', 'A-r1c2', 'A-r1c3']);
    expect(Object.keys(p)).toHaveLength(6);
    expect(newCardsAvailable(p, ['A'])).toHaveLength(15);
  });

  it('pronunciation cards only go French to English', () => {
    const p: Progress = {};
    addNewCards(p, ['G'], 18, now);
    expect(itemKey('G-r1c2', 'en-fr') in p).toBe(false);
    expect(dueItems(p, ['G'], 'en-fr', now).some((i) => i.card.type === 'pronunciation')).toBe(false);
    expect(dueItems(p, ['G'], 'fr-en', now)).toHaveLength(18);
    expect(dueItems(p, ['G'], 'mixed', now)).toHaveLength(18 + 8);
  });

  it('requeues forgotten cards 3-5 cards later and supports undo', () => {
    const p: Progress = {};
    addNewCards(p, ['B'], 10, now);
    const s = new Session(dueItems(p, ['B'], 'fr-en', now), p, () => 0);
    const first = s.current!;
    const before = p[first.key];
    s.answer(1, now);
    expect(s.queue.indexOf(first)).toBe(3);
    expect(p[first.key]).not.toEqual(before);
    expect(s.undo()).toBe(first);
    expect(p[first.key]).toEqual(before);
    expect(s.current).toBe(first);
    expect(s.reviewed).toBe(0);
  });

  it('easy cards leave the session and are no longer due', () => {
    const p: Progress = {};
    addNewCards(p, ['B'], 1, now);
    const s = new Session(dueItems(p, ['B'], 'fr-en', now), p);
    s.answer(4, now);
    expect(s.queue).toHaveLength(0);
    expect(dueItems(p, ['B'], 'fr-en', now)).toHaveLength(0);
    expect(sheetCounts(p, 'B', 'fr-en', now)).toMatchObject({ due: 0, fresh: 17, total: 36 });
  });
});

describe('shuffleItems', () => {
  it('changes the printed order but keeps every item', () => {
    const p: Progress = {};
    addNewCards(p, ['A', 'B'], 36, now);
    const items = dueItems(p, ['A', 'B'], 'fr-en', now);
    const shuffled = shuffleItems(items);
    expect(shuffled.map((i) => i.key).sort()).toEqual(items.map((i) => i.key).sort());
    expect(shuffled.map((i) => i.key)).not.toEqual(items.map((i) => i.key));
  });

  it('keeps both directions of a card apart in Mixed mode', () => {
    const p: Progress = {};
    addNewCards(p, ['A', 'G'], 36, now);
    for (const sheets of [['A'], ['G'], ['A', 'G']])
      for (let run = 0; run < 2000; run++) {
        const items = dueItems(p, sheets, 'mixed', now);
        const s = shuffleItems(items);
        expect(s).toHaveLength(items.length);
        for (let i = 1; i < s.length; i++) expect(s[i].card.id).not.toBe(s[i - 1].card.id);
      }
    // Two directions of a single card can't be separated; they still both appear.
    const one: Progress = {};
    addNewCards(one, ['A'], 1, now);
    expect(shuffleItems(dueItems(one, ['A'], 'mixed', now))).toHaveLength(2);
  });
});
