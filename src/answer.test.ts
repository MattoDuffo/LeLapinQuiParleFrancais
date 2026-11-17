import { describe, expect, it } from 'vitest';
import { acceptedAnswers, checkAnswer } from './answer';

describe('checkAnswer', () => {
  it('accepts exact answers ignoring case and punctuation', () => {
    expect(checkAnswer('i have', 'I have', 'en')).toBe('correct');
    expect(checkAnswer('cheers', 'Cheers! (Health)', 'en')).toBe('correct');
  });
  it('accepts any alternative', () => {
    expect(checkAnswer('birthday', 'Celebration, Birthday', 'en')).toBe('correct');
    expect(checkAnswer('she is', 'He/She is', 'en')).toBe('correct');
    expect(checkAnswer('he/she is', 'He/She is', 'en')).toBe('correct');
    expect(checkAnswer('i do', 'I make / I do', 'en')).toBe('correct');
    expect(checkAnswer('elles ont', 'Ils/Elles ont (Avoir)', 'fr')).toBe('correct');
    expect(checkAnswer('le', 'La, Le', 'fr')).toBe('correct');
  });
  it('makes "to" and "the" optional in English', () => {
    expect(checkAnswer('eat', 'To eat', 'en')).toBe('correct');
    expect(checkAnswer('end', 'The End', 'en')).toBe('correct');
  });
  it('flags missing accents as nearly right', () => {
    expect(checkAnswer('pres', 'Près', 'fr')).toBe('accent');
    expect(checkAnswer('Je mangerai', 'Je mangerai', 'fr')).toBe('correct');
    expect(checkAnswer('j’ai mange', "J'ai mangé", 'fr')).toBe('accent');
  });
  it('rejects wrong or empty answers', () => {
    expect(checkAnswer('', 'Fête', 'fr')).toBe('wrong');
    expect(checkAnswer('tete', 'Bête', 'fr')).toBe('wrong');
  });
  it('lists accepted forms', () => {
    expect(acceptedAnswers('Washed (Plural, Fem)', 'en')).toEqual(['washed']);
  });
});
