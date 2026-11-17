# LeLapinQuiParleFrancais

French flashcard app data.

- `data/cards.json`: 144 cards from 8 printed sheets (3 rows x 6 columns each).
  Each card has `id`, `sheet`, `category`, `page`, `row`, `col`, `french`, `english`,
  and sometimes `note` / `answerLanguage`.
- `source-sheets/`: the original front (text) and back (illustration) sheet images.

`category` and `page` come from the original sheet file names; sheets whose names
haven't been recorded yet carry a `PENDING_*` category and a `null` page.
