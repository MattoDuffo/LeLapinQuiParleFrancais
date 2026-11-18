import { describe, expect, it } from 'vitest';
import { cardById, cards, itemKey } from './data';
import { addNewCards, dueItems, newCardsAvailable, Session, sheetCounts, shuffleItems, type Progress } from './session';

const now = new Date('2026-11-17T12:00:00Z');

describe('cards', () => {
  it('has 186 cards with 362 review directions', () => {
    expect(cards).toHaveLength(186);
    expect(cards.reduce((n, c) => n + c.directions.length, 0)).toBe(362);
    expect(cards.filter((c) => c.type === 'pronunciation')).toHaveLength(10);
  });
});

describe('adding and reviewing cards', () => {
  it('adds new cards in every direction, without repeats', () => {
    const p: Progress = {};
    const added = addNewCards(p, ['A'], 3, now);
    expect(new Set(added.map((c) => c.id)).size).toBe(3);
    expect(added.every((c) => c.sheet === 'A')).toBe(true);
    expect(Object.keys(p)).toHaveLength(6);
    expect(newCardsAvailable(p, ['A'])).toHaveLength(15);
    expect(addNewCards(p, ['A'], 100, now)).toHaveLength(15);
    expect(newCardsAvailable(p, ['A'])).toHaveLength(0);
  });

  it('picks new cards at random across the chosen categories', () => {
    const firstPicks = new Set<string>();
    const categories = new Set<string>();
    for (let run = 0; run < 200; run++) {
      const p: Progress = {};
      const added = addNewCards(p, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'], 10, now);
      firstPicks.add(added[0].id);
      added.forEach((c) => categories.add(c.category));
    }
    expect(firstPicks.size).toBeGreaterThan(50);
    expect(categories.size).toBe(6);
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

describe('number cards', () => {
  it('has zéro to vingt, then the larger numbers, on three Numbers sheets', () => {
    const numbers = cards.filter((c) => c.category === 'Numbers');
    expect(numbers.map((c) => c.french)).toEqual([
      'Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix',
      'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf', 'Vingt',
      'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingts', 'Quatre-vingt-dix',
      'Cent', 'Trois cents', 'Sept cents', 'Mille', 'Mille cinq cents', 'Vingt-trois', 'Trente-neuf',
      'Quarante-huit', 'Cinquante et un', 'Soixante-quatre', 'Soixante-treize', 'Quatre-vingt-deux',
      'Quatre-vingt-quinze', 'Mille neuf cent quatre-vingt-cinq',
    ]);
    expect(numbers.filter((c) => c.sheet === 'I')).toHaveLength(18);
    expect(numbers.filter((c) => c.sheet === 'J')).toHaveLength(18);
    expect(numbers.filter((c) => c.sheet === 'K')).toHaveLength(6);
    expect(cardById.get('J-r1c3')?.french).toBe('Vingt'); // saved progress keeps its card
    expect(numbers.every((c) => c.backImage === 'assets/backs/Numbers.webp')).toBe(true);
  });
});
