import { cardById, cards, type CardData } from '../data';
import { formatInterval, t, tAny } from '../i18n';
import { setStars, starsFor, type Stars } from '../priority';
import { cardStats, type DirectionStats } from '../stats';
import { GRADES } from '../srs';
import { savePriority, state } from '../store';
import { h, icon, ICONS } from './dom';
import { directionLabel } from './study';
import { nav } from './nav';

const locale = () => (state.settings.lang === 'fr' ? 'fr-CA' : 'en-CA');
const starsText = (n: Stars) => (n === 1 ? t('starLabel') : t('starsLabel', { n }));

function subBar(title: string, back: () => void): HTMLElement {
  return h(
    'header',
    { class: 'sub-bar' },
    h('button', { class: 'icon-btn', 'aria-label': t('back'), onclick: back }, icon(ICONS.back)),
    h('h1', {}, title),
  );
}

/** Small read-only row of stars. */
const starRow = (n: Stars) =>
  h(
    'span',
    { class: 'stars', role: 'img', 'aria-label': starsText(n) },
    ...[1, 2, 3].map((i) => h('span', { class: i <= n ? 'star on' : 'star' }, '★')),
  );

/** "in 3 days", "now", "2 days ago". */
function relative(ms: number, now: number): string {
  const diff = ms - now;
  if (Math.abs(diff) < 60000) return t('dueNow');
  return diff > 0 ? t('in', { t: formatInterval(diff) }) : t('ago', { t: formatInterval(-diff) });
}

/** Order of the scheduler states from least to most advanced: new, learning, relearning, learned. */
const STATE_RANK: Record<number, number> = { 0: 0, 1: 1, 3: 2, 2: 3 };

/** Status of the card as a whole (its least advanced direction) and when it next comes up. */
function cardStatus(card: CardData): { key: string; due?: number } {
  const added = cardStats(card.id, state.progress, [], new Date()).filter((s) => s.stored);
  if (!added.length) return { key: 'status_none' };
  const least = added.reduce((a, b) => (STATE_RANK[b.stored!.state] < STATE_RANK[a.stored!.state] ? b : a));
  return { key: `status_${least.stored!.state}`, due: Math.min(...added.map((s) => s.due!)) };
}

export function categoryScreen(category: string): HTMLElement {
  const now = Date.now();
  const list = cards
    .filter((c) => c.category === category)
    .sort((a, b) => a.sheet.localeCompare(b.sheet) || a.row - b.row || a.col - b.col);
  const rows = list.map((card) => {
    const status = cardStatus(card);
    const when = status.due === undefined ? tAny(status.key) : `${tAny(status.key)} · ${relative(status.due, now)}`;
    return h(
      'button',
      { class: 'word-row', onclick: () => nav.card(card.id) },
      h(
        'span',
        { class: 'word-text' },
        h('span', { class: 'word-fr' }, card.french),
        h('span', { class: 'word-en' }, card.english),
        h('span', { class: `word-status ${status.due === undefined ? 'none' : ''}` }, when),
      ),
      starRow(starsFor(card.id)),
      h('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
    );
  });
  return h(
    'div',
    { class: 'words screen' },
    subBar(tAny(`cat_${category}`), () => nav.stats()),
    h('p', { class: 'muted words-count' }, t('words', { n: list.length })),
    h('section', { class: 'panel word-list' }, ...rows),
  );
}

function directionPanel(s: DirectionStats, now: number): HTMLElement {
  const fact = (label: string, value: string, hint?: string) =>
    h(
      'div',
      { class: 'fact' },
      h('div', { class: 'fact-label' }, label),
      h('div', { class: 'fact-value' }, value),
      hint ? h('div', { class: 'fact-hint' }, hint) : null,
    );
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString(locale(), { weekday: 'short', month: 'short', day: 'numeric' });
  const status = s.stored ? tAny(`status_${s.stored.state}`) : t('status_none');
  return h(
    'section',
    { class: 'panel' },
    h('h2', {}, directionLabel(s.dir), h('span', { class: 'status-chip' }, status)),
    s.stored
      ? h(
          'div',
          { class: 'facts' },
          fact(
            t('memory'),
            s.memory === undefined ? '—' : `${Math.round(s.memory * 100)} %`,
            s.memory === undefined ? undefined : t('memoryHint'),
          ),
          fact(t('nextReview'), relative(s.due!, now), s.due! > now ? date(s.due!) : undefined),
          fact(t('timesViewed'), String(s.views)),
          fact(
            t('lastReviewed'),
            s.lastReviewed ? relative(s.lastReviewed, now) : t('never'),
            s.lastReviewed ? date(s.lastReviewed) : undefined,
          ),
        )
      : h('p', { class: 'muted' }, t('notAddedHint')),
    s.views
      ? h(
          'div',
          { class: 'rating-counts' },
          h('div', { class: 'fact-label' }, t('ratings')),
          h(
            'div',
            { class: 'grade-summary' },
            ...GRADES.map((g) => h('span', { class: `chip g${g}` }, `${t(`g${g}` as 'g1')} · ${s.ratings[g]}`)),
          ),
        )
      : null,
  );
}

export function cardScreen(cardId: string): HTMLElement {
  const card = cardById.get(cardId);
  if (!card) return categoryScreen(cards[0].category);
  const now = Date.now();
  const stars = starsFor(cardId);
  const picker = h(
    'div',
    { class: 'star-picker', role: 'radiogroup', 'aria-label': t('priority') },
    ...([1, 2, 3] as Stars[]).map((n) =>
      h(
        'button',
        {
          class: n <= stars ? 'star on' : 'star',
          role: 'radio',
          'aria-checked': String(n === stars),
          'aria-label': starsText(n),
          onclick: () => {
            setStars(cardId, n);
            void savePriority();
            nav.card(cardId);
          },
        },
        '★',
      ),
    ),
  );
  const stats = cardStats(cardId, state.progress, state.log, new Date());
  return h(
    'div',
    { class: 'word screen' },
    subBar(tAny(`cat_${card.category}`), () => nav.category(card.category)),
    h(
      'section',
      { class: 'panel word-head' },
      h('img', { class: 'word-img', src: card.frontImage, alt: '' }),
      h(
        'div',
        {},
        h('div', { class: 'word-fr big' }, card.french),
        h('div', { class: 'word-en' }, card.english),
        card.type === 'pronunciation' ? h('span', { class: 'badge' }, t('pronunciation')) : null,
      ),
    ),
    h(
      'section',
      { class: 'panel' },
      h('h2', {}, t('priority')),
      picker,
      h('p', { class: 'muted small' }, t('priorityHint')),
    ),
    ...stats.map((s) => directionPanel(s, now)),
  );
}
