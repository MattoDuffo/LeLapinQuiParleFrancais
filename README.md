# LeLapinQuiParleFrancais

French flashcard app.

## Card data

- `data/cards.json`: 144 cards from 8 printed sheets (3 rows x 6 columns each).
  Each card has `id`, `sheet`, `category`, `page`, `row`, `col`, `french`, `english`,
  `type` (`vocab` or `pronunciation`), `directions` (`fr-en`, `en-fr`),
  `frontImage`, `backImage`, and sometimes `note` / `answerLanguage`.
- Categories and pages come from the sheet file names (`Front_<Category><page>.png`):

  | Category | Pages | Topic |
  |---|---|---|
  | `ErSound` | 1 | The "ay" sound (et, ez, er, ai, é, ées) |
  | `ESound` | 1 | The accents é / è / ê / ë |
  | `OnSound` | 1 | Nasal sounds (un, on, in, an) |
  | `Verbs` | 3 | Conjugations of être, avoir, manger, faire, boire |
  | `Vowels` | 2 | Vowel sounds and common words |

## Images

- `source-sheets/`: the high-res print sheets (`Front_*.png` = text side,
  `Back_*.png` = illustration). `Front_TEMPLATE.png` is the blank layout and isn't used.
- `assets/cards/<id>.webp` and `assets/backs/<category>.webp`: individual cards with
  rounded corners, produced by `python3 tools/crop_cards.py`.
