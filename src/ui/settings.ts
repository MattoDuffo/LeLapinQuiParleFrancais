import { t, tAny } from '../i18n';
import { speakFrench, speechAvailable } from '../speech';
import { exportData, importData, resetProgress, saveSettings, state, type Lang, type Settings } from '../store';
import { h, icon, ICONS, toast } from './dom';
import { nav } from './nav';

function toggle(label: string, hint: string | null, value: boolean, onChange: (v: boolean) => void) {
  const input = h('input', { type: 'checkbox', checked: value, onchange: () => onChange(input.checked) }) as HTMLInputElement;
  return h(
    'label',
    { class: 'setting toggle' },
    h('div', {}, h('div', {}, label), hint ? h('div', { class: 'muted small' }, hint) : null),
    input,
    h('span', { class: 'switch', 'aria-hidden': 'true' }),
  );
}

function choice<T extends string>(label: string, options: T[], value: T, text: (v: T) => string, onChange: (v: T) => void) {
  return h(
    'div',
    { class: 'setting' },
    h('div', {}, label),
    h(
      'div',
      { class: 'segmented small' },
      ...options.map((o) =>
        h('button', { class: o === value ? 'active' : '', 'aria-pressed': String(o === value), onclick: () => onChange(o) }, text(o)),
      ),
    ),
  );
}

async function exportBackup(): Promise<void> {
  const name = `les-lapins-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([exportData()], name, { type: 'application/json' });
  // On iPhone the share sheet lets the user save to Files, AirDrop, mail, etc.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function settingsScreen(): HTMLElement {
  const s = state.settings;
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    s[key] = value;
    void saveSettings();
    document.documentElement.lang = s.lang;
    nav.settings();
  };

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        await importData(await file.text());
        document.documentElement.lang = state.settings.lang;
        toast(t('importDone'));
        nav.settings();
      } catch {
        toast(t('importFail'));
      }
    },
  }) as HTMLInputElement;

  return h(
    'div',
    { class: 'settings screen' },
    h(
      'header',
      { class: 'sub-bar' },
      h('button', { class: 'icon-btn', 'aria-label': t('back'), onclick: () => nav.home() }, icon(ICONS.back)),
      h('h1', {}, t('settings')),
    ),
    h(
      'section',
      { class: 'panel' },
      choice<Lang>(t('language'), ['en', 'fr'], s.lang, (l) => (l === 'en' ? 'English' : 'Français'), (l) => update('lang', l)),
    ),
    h(
      'section',
      { class: 'panel' },
      toggle(t('speak'), t('speakHint'), s.autoSpeak, (v) => update('autoSpeak', v)),
      choice<Settings['voice']>(t('voice'), ['fr-CA', 'fr-FR'], s.voice, (v) => tAny(`voice_${v}`), (v) => {
        update('voice', v);
        speakFrench('Bonjour !', v);
      }),
      speechAvailable() ? null : h('p', { class: 'muted small' }, t('noVoices')),
      toggle(t('sounds'), null, s.sounds, (v) => update('sounds', v)),
    ),
    h(
      'section',
      { class: 'panel' },
      h('h2', {}, t('backup')),
      h('p', { class: 'muted small' }, t('backupHint')),
      h('div', { class: 'button-col' },
        h('button', { class: 'secondary', onclick: () => void exportBackup() }, t('export')),
        h('button', { class: 'secondary', onclick: () => fileInput.click() }, t('import')),
        h(
          'button',
          {
            class: 'danger',
            onclick: async () => {
              if (!confirm(t('resetConfirm'))) return;
              await resetProgress();
              toast(t('resetDone'));
            },
          },
          t('reset'),
        ),
      ),
      fileInput,
    ),
  );
}
