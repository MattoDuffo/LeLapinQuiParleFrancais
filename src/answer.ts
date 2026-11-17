/** Lenient checking of typed answers. */

export type CheckResult = 'correct' | 'accent' | 'wrong';

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[~!?.;:"«»“”¡¿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandSlashes(phrase: string): string[] {
  let results = [''];
  for (const token of phrase.split(' ')) {
    const options = token.split('/').filter(Boolean);
    const next: string[] = [];
    for (const r of results) for (const o of options) next.push(r ? `${r} ${o}` : o);
    results = next.slice(0, 64);
  }
  return results;
}

/** All accepted forms of an answer, e.g. "He/She is" -> he is, she is, he/she is. */
export function acceptedAnswers(answer: string, answerLang: 'en' | 'fr'): string[] {
  const base = normalize(answer);
  const accepted = new Set<string>([base]);
  for (const phrase of base.split(/\s+\/\s+|,/).map((p) => p.trim()).filter(Boolean)) {
    accepted.add(phrase);
    for (const form of expandSlashes(phrase)) accepted.add(form);
  }
  if (answerLang === 'en') {
    for (const a of [...accepted]) {
      if (a.startsWith('to ')) accepted.add(a.slice(3));
      if (a.startsWith('the ')) accepted.add(a.slice(4));
    }
  }
  return [...accepted].map((a) => a.replace(/,/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function checkAnswer(input: string, answer: string, answerLang: 'en' | 'fr'): CheckResult {
  const typed = normalize(input).replace(/,/g, '').replace(/\s+/g, ' ').trim();
  if (!typed) return 'wrong';
  const accepted = acceptedAnswers(answer, answerLang);
  if (accepted.includes(typed)) return 'correct';
  const bare = stripAccents(typed);
  if (accepted.some((a) => stripAccents(a) === bare)) return 'accent';
  return 'wrong';
}
