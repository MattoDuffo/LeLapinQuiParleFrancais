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

export function speakFrench(text: string, pref: 'fr-CA' | 'fr-FR'): void {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speakableFrench(text));
  const voice = pickVoice(pref);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? pref;
  u.rate = 0.85;
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

export const stopSpeech = () => synth?.cancel();
