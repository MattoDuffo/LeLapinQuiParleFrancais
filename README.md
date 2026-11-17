# LeLapinQuiParleFrancais

French flashcard app data.

- `data/cards.json`: 144 cards from 8 printed sheets (3 rows x 6 columns each).
  Each card has `id`, `sheet`, `category`, `page`, `row`, `col`, `french`, `english`,
  and sometimes `note` / `answerLanguage`.
- `source-sheets/`: the original front (text) and back (illustration) sheet images.

`category` and `page` were reconstructed from the back illustration of each sheet
(sheets sharing a back art = same category; page order = upload order), because the
original file names were not available. Categories: `son-ay`, `accents`, `nasales`,
`verbes` (pages 1-3), `voyelles` (pages 1-2).
