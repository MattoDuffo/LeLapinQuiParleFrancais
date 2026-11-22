/** Read French aloud with the device's built-in voices (Web Speech API). */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export const speechAvailable = () => !!synth;

const norm = (l: string) => l.replace('_', '-').toLowerCase();

// iOS/macOS novelty voices that sound deliberately robotic or silly.
const NOVELTY = new Set(
  [
    'Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley',
    'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News',
    'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
  ].map((n) => n.toLowerCase()),
);

/** Higher is better: premium > enhanced/Siri > default > compact; novelty voices last. */
export function voiceQuality(v: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): number {
  const uri = (v.voiceURI ?? '').toLowerCase();
  const name = (v.name ?? '').toLowerCase();
  const base = name.replace(/\s*\(.*\)\s*$/, '').trim();
  if (uri.includes('eloquence') || uri.includes('novelty') || NOVELTY.has(base)) return -10;
  if (uri.includes('premium') || name.includes('premium')) return 3;
  if (uri.includes('enhanced') || name.includes('enhanced') || name.includes('amélioré')) return 2;
  if (uri.includes('siri')) return 2;
  if (uri.includes('compact')) return 0;
  return 1;
}

/** Best voice for a language: exact match beats same language, then by quality. */
export function bestVoice<V extends Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>>(
  voices: readonly V[],
  pref: string,
): V | undefined {
  const want = pref.toLowerCase();
  const family = want.split('-')[0];
  let best: V | undefined;
  let bestScore = -Infinity;
  for (const v of voices) {
    const lang = norm(v.lang);
    if (!lang.startsWith(family)) continue;
    const q = voiceQuality(v);
    // A good voice in the other accent beats a novelty voice in the preferred one.
    const score = q * 10 + (lang === want ? 5 : 0);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

function pickVoice(pref: string): SpeechSynthesisVoice | undefined {
  return bestVoice(synth?.getVoices() ?? [], pref);
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
  const voice = pickVoice('en-US');
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
