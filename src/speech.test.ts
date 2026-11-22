import { describe, expect, it } from 'vitest';
import { bestVoice, voiceQuality } from './speech';

const v = (name: string, lang: string, voiceURI = name) => ({ name, lang, voiceURI });

describe('voiceQuality', () => {
  it('ranks premium > enhanced > default > compact > novelty', () => {
    expect(voiceQuality(v('Amélie', 'fr-CA', 'com.apple.voice.premium.fr-CA.Amelie'))).toBe(3);
    expect(voiceQuality(v('Amélie', 'fr-CA', 'com.apple.voice.enhanced.fr-CA.Amelie'))).toBe(2);
    expect(voiceQuality(v('Amélie', 'fr-CA'))).toBe(1);
    expect(voiceQuality(v('Amélie', 'fr-CA', 'com.apple.voice.compact.fr-CA.Amelie'))).toBe(0);
    expect(voiceQuality(v('Eddy (French (Canada))', 'fr-CA', 'com.apple.eloquence.fr-CA.Eddy'))).toBe(-10);
    expect(voiceQuality(v('Grandma (Français (Canada))', 'fr-CA'))).toBe(-10);
  });
});

describe('bestVoice', () => {
  it('skips novelty voices even when listed first', () => {
    const voices = [
      v('Eddy (French (Canada))', 'fr-CA', 'com.apple.eloquence.fr-CA.Eddy'),
      v('Flo (French (Canada))', 'fr-CA', 'com.apple.eloquence.fr-CA.Flo'),
      v('Amélie', 'fr-CA', 'com.apple.voice.compact.fr-CA.Amelie'),
    ];
    expect(bestVoice(voices, 'fr-CA')?.name).toBe('Amélie');
  });

  it('prefers enhanced over compact', () => {
    const voices = [
      v('Amélie', 'fr-CA', 'com.apple.voice.compact.fr-CA.Amelie'),
      v('Amélie (Enhanced)', 'fr-CA', 'com.apple.voice.enhanced.fr-CA.Amelie'),
    ];
    expect(bestVoice(voices, 'fr-CA')?.name).toBe('Amélie (Enhanced)');
  });

  it('prefers the chosen accent at equal quality', () => {
    const voices = [v('Thomas', 'fr-FR'), v('Amélie', 'fr_CA')];
    expect(bestVoice(voices, 'fr-CA')?.name).toBe('Amélie');
    expect(bestVoice(voices, 'fr-FR')?.name).toBe('Thomas');
  });

  it('uses a normal voice in the other accent rather than a novelty one', () => {
    const voices = [v('Eddy', 'fr-CA', 'com.apple.eloquence.fr-CA.Eddy'), v('Thomas', 'fr-FR')];
    expect(bestVoice(voices, 'fr-CA')?.name).toBe('Thomas');
  });

  it('falls back to a novelty voice if nothing else exists', () => {
    expect(bestVoice([v('Eddy', 'fr-CA', 'com.apple.eloquence.fr-CA.Eddy')], 'fr-CA')?.name).toBe('Eddy');
    expect(bestVoice([v('Samantha', 'en-US')], 'fr-CA')).toBeUndefined();
  });
});
