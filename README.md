# Les Lapins qui parlent français

A French flashcard web app for iPhone, built from a set of printed cards.
Cards rise from the bottom of the screen, flip to show one language, and turn
around to show the other; you grade yourself and spaced repetition (FSRS)
decides when each card comes back.

**Play:** https://mattoduffo.github.io/LeLapinQuiParleFrancais/
(open in Safari on the iPhone, then Share → Add to Home Screen).

## Development

```bash
npm install
npm run dev        # local server with hot reload
npm test           # unit tests (scheduling, sessions, answer checking)
npm run build      # production build in dist/
npm run preview    # serve the production build
```

End-to-end walk-through at iPhone size with screenshots (needs Playwright, and
`npm run build && npm run preview` running):

```bash
node e2e/run.mjs http://localhost:4173/ e2e/screens
```

Every push to `main` is tested, built and published to GitHub Pages by
`.github/workflows/deploy.yml`.

## Card priority

Each card has 1, 2 (default) or 3 stars, set on its page (Statistics → a
category → a word). Stars nudge, not override, the schedule: a 3-star card
comes up a random 0-35% of its interval early, a 1-star card 0-25% late,
drawn again after each review. Cards still in learning steps (under a day)
aren't nudged. When adding new cards, 3-star cards are picked about twice as
often and 1-star cards half as often. Stars are saved with progress and
included in backups; resetting progress keeps them.

A card's score is its average grade (Forgot 0%, Hard 33%, Good 67%, Easy 100%),
with the n-th review counting n times so recent reviews weigh more.
See `docs/PLAN-card-stats.md`.

## Layout

- `src/` — the app (TypeScript, no framework)
  - `data.ts` card data, `srs.ts` FSRS scheduling, `session.ts` study queue,
    `answer.ts` typed-answer checking, `store.ts` on-device storage and backups,
    `i18n.ts` English/French interface, `speech.ts` French read-aloud,
    `priority.ts` the 1-3 star priority of each card
  - `ui/` screens: home, study (card animations), statistics, settings,
    `words.ts` the word list of a category and the page for one card
- `data/cards.json` — the 223 cards: `id`, `sheet`, `category`, `page`, `row`, `col`,
  `french`, `english`, `type` (`vocab` / `pronunciation`), `directions`,
  `frontImage`, `backImage`, and sometimes `note` / `answerLanguage`
- `public/assets/` — card images, `public/icons/` — app icons
- `source-sheets/` — the high-res print sheets the images are cut from
- `tools/make_word_sheets.py` — draws the sheets of the categories with no printed
  sheets (Numbers, Calendar, Phrases) from `Front_TEMPLATE.png` and `Art_<Category>.png`, and
  writes their cards into `cards.json` (run it before `crop_cards.py`); add new words
  at the end of a category's list. Without an `Art_<Category>.png` it draws a
  placeholder back.
- `tools/crop_cards.py` — re-cuts the card images; `tools/make_icons.py` — app icons
- `docs/PLAN.md` — the design plan

## Categories

Categories and pages come from the sheet file names (`Front_<Category><page>.png`):

| Category | Pages | Topic |
|---|---|---|
| `ErSound` | 1 | The "ay" sound (et, ez, er, ai, é, ées) |
| `ESound` | 1 | The accents é / è / ê / ë |
| `OnSound` | 1 | Nasal sounds (un, on, in, an) |
| `Verbs` | 3 | Conjugations of être, avoir, manger, faire, boire |
| `Vowels` | 2 | Vowel sounds and common words |
| `Numbers` | 3 | Zéro to vingt, the tens, hundreds, and some larger numbers |
| `Calendar` | 2 | Days of the week, months, seasons, times of day, week / weekend / month |
| `Phrases` | 1 | Useful everyday phrases (Phrases utiles) |
