import { backImageFor, CATEGORY_ORDER, sheets, type DirChoice } from '../data';
import { t, tAny } from '../i18n';
import { addNewCards, dueItems, newCardsAvailable, sheetCounts, shuffleItems } from '../session';
import { sounds } from '../sound';
import { unlockSpeech } from '../speech';
import { saveProgress, saveSettings, state } from '../store';
import { h, icon, ICONS, toast } from './dom';
import { nav } from './nav';

const ADD_CHOICES = [5, 10, 20, 0]; // 0 = all
let addCount = 10;

export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

function segmented<T extends string>(label: string, options: T[], value: T, text: (v: T) => string, onChange: (v: T) => void) {
  return h(
    'div',
    { class: 'field' },
    h('div', { class: 'field-label' }, label),
    h(
      'div',
      { class: 'segmented', role: 'radiogroup', 'aria-label': label },
      ...options.map((o) =>
        h(
          'button',
          {
            class: o === value ? 'active' : '',
            role: 'radio',
            'aria-checked': String(o === value),
            onclick: () => onChange(o),
          },
          text(o),
        ),
      ),
    ),
  );
}

export function homeScreen(): HTMLElement {
  const s = state.settings;
  const now = new Date();
  const selected = new Set(s.selectedSheets);
  const rerender = () => nav.home();
  const setSelected = (ids: string[]) => {
    s.selectedSheets = sheets.map((x) => x.sheet).filter((id) => ids.includes(id));
    void saveSettings();
    rerender();
  };

  // ----- header -----
  const header = h(
    'header',
    { class: 'home-bar' },
    h('img', { class: 'logo', src: 'icons/bunny-192.png', alt: '' }),
    h('h1', {}, t('appName')),
    h('span', { class: 'spacer' }),
    h('button', { class: 'icon-btn', 'aria-label': t('stats'), onclick: () => nav.stats() }, icon(ICONS.chart)),
    h('button', { class: 'icon-btn', 'aria-label': t('settings'), onclick: () => nav.settings() }, icon(ICONS.gear)),
  );

  const install =
    isIOS() && !isStandalone() && !s.installHintDismissed
      ? h(
          'div',
          { class: 'install' },
          icon(ICONS.share, 'icon install-icon'),
          h('div', {}, h('strong', {}, t('installTitle')), h('p', {}, t('installText'))),
          h(
            'button',
            {
              class: 'link',
              onclick: () => {
                s.installHintDismissed = true;
                void saveSettings();
                rerender();
              },
            },
            t('ok'),
          ),
        )
      : null;

  // ----- categories -----
  // Categories are chosen as a whole (all their pages). Older saved selections
  // may hold only some pages of a category; treat those as the whole category.
  const chosenCategories = new Set(sheets.filter((x) => selected.has(x.sheet)).map((x) => x.category));
  const normalized = sheets.filter((x) => chosenCategories.has(x.category)).map((x) => x.sheet);
  if (normalized.join() !== s.selectedSheets.join()) {
    s.selectedSheets = normalized;
    void saveSettings();
  }

  const rows = CATEGORY_ORDER.map((category) => {
    const ids = sheets.filter((x) => x.category === category).map((x) => x.sheet);
    const on = chosenCategories.has(category);
    let due = 0;
    let fresh = 0;
    for (const id of ids) {
      const c = sheetCounts(state.progress, id, s.direction, now);
      due += c.due;
      fresh += c.fresh;
    }
    const toggle = () => {
      const others = s.selectedSheets.filter((id) => !ids.includes(id));
      setSelected(on ? others : [...others, ...ids]);
    };
    return h(
      'div',
      {
        class: `cat-row ${on ? 'on' : 'off'}`,
        role: 'checkbox',
        'aria-checked': String(on),
        tabindex: '0',
        onclick: toggle,
        onkeydown: (e: KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggle()),
      },
      h('img', { class: 'cat-thumb', src: backImageFor(category), alt: '' }),
      h(
        'div',
        { class: 'cat-text' },
        h('div', { class: 'cat-name' }, tAny(`cat_${category}`)),
        h('div', { class: 'cat-counts' }, t('counts', { due, fresh })),
      ),
      h('span', { class: 'check', 'aria-hidden': 'true' }),
    );
  });

  // ----- options -----
  const direction = segmented<DirChoice>(
    t('direction'),
    ['fr-en', 'en-fr', 'mixed'],
    s.direction,
    (d) => tAny(`dir_${d}`),
    (d) => {
      s.direction = d;
      void saveSettings();
      rerender();
    },
  );
  const mode = segmented<'flip' | 'type'>(
    t('mode'),
    ['flip', 'type'],
    s.mode,
    (m) => tAny(`mode_${m}`),
    (m) => {
      s.mode = m;
      void saveSettings();
      rerender();
    },
  );

  // ----- start -----
  const items = dueItems(state.progress, s.selectedSheets, s.direction, now);
  const start = h(
    'button',
    {
      class: 'primary start',
      disabled: items.length === 0,
      onclick: () => {
        unlockSpeech(); // iOS needs a tap before speech/audio can play
        if (s.sounds) sounds.unlock();
        nav.study(shuffleItems(items));
      },
    },
    s.selectedSheets.length === 0
      ? t('selectSome')
      : items.length === 0
        ? t('nothingDue')
        : items.length === 1
          ? t('startOne')
          : t('start', { n: items.length }),
  );

  // ----- add new cards -----
  const available = newCardsAvailable(state.progress, s.selectedSheets).length;
  const addSection = h(
    'section',
    { class: 'panel add' },
    h('h2', {}, t('addTitle')),
    h('p', { class: 'muted' }, available ? t('newAvailable', { n: available }) : t('noNew')),
    available
      ? h(
          'div',
          { class: 'add-row' },
          h(
            'div',
            { class: 'segmented small' },
            ...ADD_CHOICES.map((n) =>
              h(
                'button',
                {
                  class: n === addCount ? 'active' : '',
                  onclick: () => {
                    addCount = n;
                    rerender();
                  },
                },
                n === 0 ? t('all') : String(n),
              ),
            ),
          ),
          h(
            'button',
            {
              class: 'secondary',
              onclick: () => {
                const added = addNewCards(state.progress, s.selectedSheets, addCount || available, new Date());
                void saveProgress();
                toast(t('addedToast', { n: added.length }));
                rerender();
              },
            },
            t('add'),
          ),
        )
      : null,
  );

  return h(
    'div',
    { class: 'home screen' },
    header,
    install,
    h('section', { class: 'panel' }, h('h2', {}, t('categories')), ...rows),
    h('section', { class: 'panel options' }, direction, mode),
    start,
    addSection,
  );
}
