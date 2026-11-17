# Play mode 1: flip-card review — plan

## Decisions

| Topic | Decision |
|---|---|
| Platform | Web app / PWA, installable on phone home screen, works offline |
| Card art | Cropped from the printed sheets in `source-sheets/`, with rounded corners like real playing cards |
| Sessions | Pick one or more categories (or All); show due cards first, then up to a daily limit of new cards |
| Directions | French → English and English → French scheduled separately (144 cards × 2 = 288 review items) |
| Scheduler | FSRS (four grades: Forgot / Hard / Good / Easy) |
| Storage | On the device (IndexedDB); sync can come later |

## Card screen

The printed card has French on the top half and English upside down on the bottom half,
so rotating 180° is the same as turning the physical card around.

1. Card rises from the bottom showing the illustrated back. For English → French the card is pre-rotated 180°.
2. It stops when the card's middle is at the bottom edge of the screen, then flips to the text face.
   Only the prompt half is on-screen; the answer half is off-screen, not just covered.
3. Prompt: "What does this mean in English?" / "How do you say this in French?"
4. Tap: the card rotates 180° and rises until fully visible (answer upright on top, prompt upside down below).
5. Four self-grade buttons appear. "Forgot" re-queues the card later in the same session.

Taps are ignored while an animation is running.

## Special cards

- E → 饿 and U → 鱼 (`answerLanguage: "zh"`): normal flip cards; shown as the prompt in English → French.
- Eu (Mathieu): answer is a pronunciation hint, so French → English only.
- Duplicates across categories stay separate cards.

## Advanced mode: typed answers

- Lenient matching: ignores case, punctuation and bracketed hints like "(Être)" or "(Plural)";
  "/" and "," separate accepted alternatives.
- A missing accent counts as "nearly right" and is highlighted.
- The app suggests Good or Forgot; the user can override.
- Cards with Chinese answers are excluded.

## Build order

1. Crop the 144 card faces and 5 back illustrations from the sheets; round the corners; add image paths to `cards.json`.
2. Card component and animations, tested at phone size.
3. Session flow, grade buttons, FSRS scheduling.
4. Home and category screens; save progress on the device.
5. Typing mode.
6. Polish: sounds, haptics, settings (daily new-card limit).
