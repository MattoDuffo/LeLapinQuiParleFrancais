import { backImageFor } from '../data';
import { t, tAny } from '../i18n';
import { categoryProgress, dueBy, forecast, reviewedToday, startOfDay, streak } from '../stats';
import { STATE_REVIEW } from '../srs';
import { state } from '../store';
import { h, icon, ICONS } from './dom';
import { nav } from './nav';

export function statsScreen(): HTMLElement {
  const now = new Date();
  const endOfToday = new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000 - 1);
  const learned = Object.values(state.progress).filter((s) => s.state === STATE_REVIEW).length;
  const tile = (value: number, label: string) =>
    h('div', { class: 'tile' }, h('div', { class: 'tile-value' }, String(value)), h('div', { class: 'tile-label' }, label));

  const days = forecast(state.progress, now, 7);
  const max = Math.max(1, ...days);
  const locale = state.settings.lang === 'fr' ? 'fr-CA' : 'en-CA';
  const chart = h(
    'div',
    { class: 'forecast' },
    ...days.map((n, i) => {
      const d = new Date(startOfDay(now).getTime() + i * 864e5 + 3600e3);
      const label = i === 0 ? t('today') : d.toLocaleDateString(locale, { weekday: 'short' });
      return h(
        'div',
        { class: 'bar-col' },
        h('div', { class: 'bar-num' }, n ? String(n) : ''),
        h('div', { class: 'bar', style: `height:${(n / max) * 100}%` }),
        h('div', { class: 'bar-label' }, label),
      );
    }),
  );

  const categories = categoryProgress(state.progress).map((c) =>
    h(
      'div',
      { class: 'cat-progress' },
      h('img', { class: 'cat-thumb small', src: backImageFor(c.category), alt: '' }),
      h(
        'div',
        { class: 'cat-text' },
        h('div', { class: 'cat-name' }, tAny(`cat_${c.category}`)),
        h(
          'div',
          { class: 'meter', role: 'img', 'aria-label': t('learnedOf', { a: c.learned, b: c.studying, c: c.total }) },
          h('div', { class: 'meter-studying', style: `width:${(c.studying / c.total) * 100}%` }),
          h('div', { class: 'meter-learned', style: `width:${(c.learned / c.total) * 100}%` }),
        ),
        h('div', { class: 'cat-counts' }, t('learnedOf', { a: c.learned, b: c.studying, c: c.total })),
      ),
    ),
  );

  return h(
    'div',
    { class: 'stats screen' },
    h(
      'header',
      { class: 'sub-bar' },
      h('button', { class: 'icon-btn', 'aria-label': t('back'), onclick: () => nav.home() }, icon(ICONS.back)),
      h('h1', {}, t('stats')),
    ),
    h(
      'div',
      { class: 'tiles' },
      tile(dueBy(state.progress, endOfToday), t('dueToday')),
      tile(reviewedToday(state.log, now), t('reviewedToday')),
      tile(streak(state.log, now), t('streak')),
      tile(learned, t('learnedTotal')),
    ),
    h('section', { class: 'panel' }, h('h2', {}, t('next7')), chart),
    h('section', { class: 'panel' }, h('h2', {}, t('byCategory')), ...categories),
  );
}
