/** Read French aloud with the device's built-in voices (Web Speech API). */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export const speechAvailable = () => !!synth;

function pickVoice(pref: string): SpeechSynthesisVoice | undefined {
  const voices = synth?.getVoices() ?? [];
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => norm(v.lang) === pref.toLowerCase()) ??
    voices.find((v) => norm(v.lang).startsWith('fr'))
  );
}

/** Text to read: drop bracketed hints, "~", and read "Ils/Elles" as "Ils, Elles". */
export function speakableFrench(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/~/g, '')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** English text to read: brackets become pauses, "/" becomes "or". */
export function speakableEnglish(text: string): string {
  return text
    .replace(/[()]/g, ', ')
    .replace(/\s*\/\s*/g, ' or ')
    .replace(/\s*,(\s*,)*/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
}

// Bumped whenever speech is started or stopped, so a pending follow-up is dropped.
let token = 0;
let followUp: ReturnType<typeof setTimeout> | undefined;
// Keep a reference so the browser doesn't garbage-collect it before "end" fires.
const live = new Set<SpeechSynthesisUtterance>();

function keep(u: SpeechSynthesisUtterance): void {
  live.clear();
  live.add(u);
}

function reset(): number {
  clearTimeout(followUp);
  followUp = undefined;
  synth?.cancel();
  return ++token;
}

/**
 * Read French aloud. If `english` is given, read it in English one second
 * after the French finishes.
 */
export function speakFrench(text: string, pref: 'fr-CA' | 'fr-FR', english?: string): void {
  if (!synth) return;
  const my = reset();
  const u = new SpeechSynthesisUtterance(speakableFrench(text));
  const voice = pickVoice(pref);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? pref;
  u.rate = 0.85;
  const en = english && speakableEnglish(english);
  if (en) {
    u.onend = () => {
      if (my !== token) return;
      followUp = setTimeout(() => {
        if (my !== token) return;
        speakEnglish(en);
      }, 1000);
    };
  }
  keep(u);
  synth.speak(u);
}

function speakEnglish(text: string): void {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(text);
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const voice = synth.getVoices().find((v) => norm(v.lang).startsWith('en'));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = 0.9;
  keep(u);
  synth.speak(u);
}

/** iOS only allows speech after a user gesture; call this from a tap handler once. */
let unlocked = false;
export function unlockSpeech(): void {
  if (!synth || unlocked) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

export const stopSpeech = (): void => {
  reset();
  live.clear();
};
