import { get, set, del } from 'idb-keyval';
import type { DirChoice } from './data';
import { sheets } from './data';
import type { Progress } from './session';
import type { GradeValue } from './srs';

export type Lang = 'en' | 'fr';

export interface Settings {
  lang: Lang;
  autoSpeak: boolean;
  voice: 'fr-CA' | 'fr-FR';
  sounds: boolean;
  direction: DirChoice;
  mode: 'flip' | 'type';
  selectedSheets: string[];
  installHintDismissed: boolean;
}

/** One review: item key, grade, time (ms). */
export interface LogEntry {
  k: string;
  g: GradeValue;
  t: number;
}

export const defaultSettings = (): Settings => ({
  lang: 'en',
  autoSpeak: true,
  voice: 'fr-CA',
  sounds: false,
  direction: 'fr-en',
  mode: 'flip',
  selectedSheets: sheets.map((s) => s.sheet),
  installHintDismissed: false,
});

export const state = {
  progress: {} as Progress,
  log: [] as LogEntry[],
  settings: defaultSettings(),
};

export async function loadState(): Promise<void> {
  try {
    const [progress, log, settings] = await Promise.all([get('progress'), get('log'), get('settings')]);
    state.progress = progress ?? {};
    state.log = log ?? [];
    state.settings = { ...defaultSettings(), ...(settings ?? {}) };
  } catch (e) {
    console.warn('Could not read saved progress', e);
  }
  // Ask iOS/Safari not to evict our data. Best effort.
  navigator.storage?.persist?.().catch(() => undefined);
}

const safeSet = (key: string, value: unknown) =>
  set(key, value).catch((e) => console.warn(`Could not save ${key}`, e));

export const saveProgress = () => Promise.all([safeSet('progress', state.progress), safeSet('log', state.log)]);
export const saveSettings = () => safeSet('settings', state.settings);

export function exportData(): string {
  return JSON.stringify(
    { app: 'le-lapin', version: 1, exportedAt: new Date().toISOString(), ...state },
    null,
    1,
  );
}

export async function importData(text: string): Promise<void> {
  const data = JSON.parse(text);
  if (data?.app !== 'le-lapin' || typeof data.progress !== 'object') throw new Error('Not a Les Lapins backup');
  state.progress = data.progress;
  state.log = Array.isArray(data.log) ? data.log : [];
  state.settings = { ...defaultSettings(), ...(data.settings ?? {}) };
  await Promise.all([saveProgress(), saveSettings()]);
}

export async function resetProgress(): Promise<void> {
  state.progress = {};
  state.log = [];
  await Promise.all([del('progress'), del('log')]);
}
