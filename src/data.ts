import raw from '../data/cards.json';

export type Dir = 'fr-en' | 'en-fr';
export type DirChoice = Dir | 'mixed';

export interface CardData {
  id: string;
  sheet: string;
  category: string;
  page: number;
  row: number;
  col: number;
  french: string;
  english: string;
  type: 'vocab' | 'pronunciation';
  directions: Dir[];
  frontImage: string;
  backImage: string;
  answerLanguage?: string;
  note?: string;
}

export interface Sheet {
  sheet: string;
  category: string;
  page: number;
}

export const cards: CardData[] = raw.cards as CardData[];
export const cardById = new Map(cards.map((c) => [c.id, c]));
export const CATEGORY_ORDER = ['ErSound', 'ESound', 'OnSound', 'Verbs', 'Vowels', 'Numbers', 'Calendar', 'Phrases'];

export const sheets: Sheet[] = raw.sheets
  .map((s) => ({ sheet: s.sheet, category: s.category, page: s.page }))
  .sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.page - b.page,
  );

export const backImageFor = (category: string) => `assets/backs/${category}.webp`;

export const itemKey = (cardId: string, dir: Dir) => `${cardId}|${dir}`;
export function parseKey(key: string): { cardId: string; dir: Dir } {
  const [cardId, dir] = key.split('|');
  return { cardId, dir: dir as Dir };
}

/** Cards in printed order: by sheet order, then row, then column. */
export function cardsInSheets(sheetIds: string[]): CardData[] {
  const order = sheets.filter((s) => sheetIds.includes(s.sheet)).map((s) => s.sheet);
  return cards
    .filter((c) => order.includes(c.sheet))
    .sort((a, b) => order.indexOf(a.sheet) - order.indexOf(b.sheet) || a.row - b.row || a.col - b.col);
}

export const promptSide = (card: CardData, dir: Dir) => (dir === 'fr-en' ? card.french : card.english);
export const answerSide = (card: CardData, dir: Dir) => (dir === 'fr-en' ? card.english : card.french);
