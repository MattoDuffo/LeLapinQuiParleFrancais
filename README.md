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

## Layout

- `src/` — the app (TypeScript, no framework)
  - `data.ts` card data, `srs.ts` FSRS scheduling, `session.ts` study queue,
    `answer.ts` typed-answer checking, `store.ts` on-device storage and backups,
    `i18n.ts` English/French interface, `speech.ts` French read-aloud
  - `ui/` screens: home, study (card animations), statistics, settings
- `data/cards.json` — the 144 cards: `id`, `sheet`, `category`, `page`, `row`, `col`,
  `french`, `english`, `type` (`vocab` / `pronunciation`), `directions`,
  `frontImage`, `backImage`, and sometimes `note` / `answerLanguage`
- `public/assets/` — card images, `public/icons/` — app icons
- `source-sheets/` — the high-res print sheets the images are cut from
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
