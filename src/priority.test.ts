import { afterEach, describe, expect, it } from 'vitest';
import { itemKey } from './data';
import { dueAt, EARLY_SHARE, hashUnit, LATE_SHARE, setStars, starsFor } from './priority';
import { addNewCards, dueItems, Session, type Progress } from './session';
import { cardStats, gradeScore } from './stats';
import { gradeCard, newCard, type StoredCard } from './srs';
import { state } from './store';

const DAY = 864e5;
const now = new Date('2026-11-17T12:00:00Z');

/** A reviewed card with the given interval, due `dueIn` days from now. */
const reviewed = (interval: number, dueIn: number, seed = 'x'): StoredCard => ({
  ...newCard(now),
  state: 2,
  reps: 3,
  scheduled_days: interval,
  due: new Date(now.getTime() + dueIn * DAY).toISOString(),
  last_review: new Date(now.getTime() - (interval - dueIn) * DAY + seed.length).toISOString(),
});

afterEach(() => (state.priority = {}));

describe('priority stars', () => {
  it('defaults to 2 stars and only stores other values', () => {
    expect(starsFor('A-r1c1')).toBe(2);
    setStars('A-r1c1', 3);
    expect(starsFor('A-r1c1')).toBe(3);
    setStars('A-r1c1', 2);
    expect(state.priority).toEqual({});
  });

  it('2-star cards come up exactly when the scheduler says', () => {
    const c = reviewed(10, 7);
    expect(dueAt('A-r1c1|fr-en', c)).toBe(new Date(c.due).getTime());
  });

  it('3 stars bring a card forward by a random share of its interval; 1 star pushes it back', () => {
    const c = reviewed(10, 7);
    const due = new Date(c.due).getTime();
    for (let i = 0; i < 200; i++) {
      const key = `A-r${i}c1|fr-en`;
      const early = dueAt(key, c, 3);
      const late = dueAt(key, c, 1);
      expect(early).toBeLessThanOrEqual(due);
      expect(early).toBeGreaterThanOrEqual(due - 10 * DAY * EARLY_SHARE);
      expect(late).toBeGreaterThanOrEqual(due);
      expect(late).toBeLessThanOrEqual(due + 10 * DAY * LATE_SHARE);
    }
  });

  it('a 3-star card due in 7 days sometimes, not always, comes before a 2-star card due in 5', () => {
    let before = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const three = reviewed(10, 7);
      three.last_review = new Date(now.getTime() - 3 * DAY - i * 1000).toISOString(); // a different review each run
      if (dueAt('B-r1c1|fr-en', three, 3) < now.getTime() + 5 * DAY) before++;
    }
    expect(before / runs).toBeGreaterThan(0.25);
    expect(before / runs).toBeLessThan(0.65);
  });

  it('is stable between screens but re-drawn after each review', () => {
    const c = reviewed(10, 7);
    expect(dueAt('A-r1c1|fr-en', c, 3)).toBe(dueAt('A-r1c1|fr-en', c, 3));
    expect(hashUnit('a')).not.toBe(hashUnit('b'));
  });

  it('does not nudge cards still in short learning steps', () => {
    const p: Progress = {};
    addNewCards(p, ['A'], 18, now);
    for (const id of Object.keys(p)) setStars(id.split('|')[0], 3);
    const key = Object.keys(p)[0];
    const c = gradeCard(p[key], 3, now); // due in ~10 min
    expect(dueAt(key, c)).toBe(new Date(c.due).getTime());
  });

  it('3-star cards join a session early when their nudged date has come', () => {
    const p: Progress = { [itemKey('A-r1c1', 'fr-en')]: reviewed(20, 2) };
    expect(dueItems(p, ['A'], 'fr-en', now)).toHaveLength(0);
    setStars('A-r1c1', 3);
    // Find how early this item comes; check it is due from that moment.
    const at = dueAt(itemKey('A-r1c1', 'fr-en'), p[itemKey('A-r1c1', 'fr-en')]);
    expect(dueItems(p, ['A'], 'fr-en', new Date(at))).toHaveLength(1);
  });

  it('picks 3-star new cards more often than 1-star ones', () => {
    const highIds = ['B-r1c1', 'B-r1c2', 'B-r1c3'];
    const normalIds = ['B-r1c4', 'B-r1c5', 'B-r1c6'];
    const lowIds = ['B-r2c1', 'B-r2c2', 'B-r2c3'];
    highIds.forEach((id) => setStars(id, 3));
    lowIds.forEach((id) => setStars(id, 1));
    const picks = { high: 0, normal: 0, low: 0 };
    for (let run = 0; run < 1000; run++)
      for (const { id } of addNewCards({}, ['B'], 3, now)) {
        if (highIds.includes(id)) picks.high++;
        if (normalIds.includes(id)) picks.normal++;
        if (lowIds.includes(id)) picks.low++;
      }
    expect(picks.high).toBeGreaterThan(picks.normal * 1.5);
    expect(picks.normal).toBeGreaterThan(picks.low * 1.5);
    expect(picks.low).toBeGreaterThan(0); // still picked, just less often
  });
});

describe('cardStats', () => {
  it('counts views and ratings per direction, with memory and next review', () => {
    const p: Progress = {};
    addNewCards(p, ['A'], 18, now);
    const s = new Session(dueItems(p, ['A'], 'mixed', now), p);
    const log: { k: string; g: 1 | 2 | 3 | 4; t: number }[] = [];
    for (let i = 0; i < 60 && s.current; i++) {
      const g = (i % 2 ? 3 : 1) as 1 | 3;
      log.push({ k: s.current.key, g, t: now.getTime() + i });
      s.answer(g, now);
    }
    const id = log[0].k.split('|')[0];
    const stats = cardStats(id, p, log);
    expect(stats.map((d) => d.dir)).toEqual(['fr-en', 'en-fr']);
    for (const d of stats) {
      const mine = log.filter((e) => e.k === itemKey(id, d.dir));
      expect(d.views).toBe(mine.length);
      expect(d.ratings[1] + d.ratings[3]).toBe(mine.length);
      if (mine.length) expect(d.score).toBe(gradeScore(mine.map((e) => e.g)));
      else expect(d.score).toBeUndefined();
      expect(d.due).toBeTypeOf('number');
    }
    expect(cardStats('B-r1c1', {}, [])[0]).toMatchObject({ stored: undefined, views: 0 });
  });

  it('scores the average grade, recent reviews counting more', () => {
    expect(gradeScore([])).toBeUndefined();
    expect(gradeScore([4, 4])).toBe(1);
    expect(gradeScore([1])).toBe(0);
    expect(Math.round(gradeScore([1, 2, 3, 3, 4])! * 100)).toBe(69);
    // Improving beats declining with the same grades.
    expect(gradeScore([1, 4])!).toBeGreaterThan(gradeScore([4, 1])!);
  });
});
