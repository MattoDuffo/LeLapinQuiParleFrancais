# Play mode 1: flip-card review — plan

## Decisions

| Topic | Decision |
|---|---|
| Platform | Web app / PWA, installable on phone home screen, works offline |
| Card art | Cropped from the printed sheets in `source-sheets/`, with rounded corners like real playing cards |
| Sessions | Pick one or more categories (or All); review the cards that are due. New cards are only introduced when the user chooses to add them (no automatic daily limit) |
| Interface language | English by default, switchable to French (prompts, buttons, menus) |
| Grade buttons | Forgot / Hard / Good / Easy (FR: Oublié / Difficile / Bien / Facile), each showing when the card would come back, e.g. "Good · 3 days" |
| Directions | French → English and English → French scheduled separately (134 vocab cards × 2 + 10 pronunciation cards × 1 = 278 review items) |
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
- Pronunciation cards (`type: "pronunciation"`, `directions: ["fr-en"]`): cards that only represent a sound
  — Eu (Mathieu), A, E, I, O, U, Ou, Oi, Au, ~eau. French → English only, shown with a
  "Pronunciation" / "Prononciation" badge. Eau (Water) is a real word, so it stays a normal card.
- Duplicates across categories stay separate cards.

## Adding new cards

The home and category screens show how many cards haven't been studied yet, with an
"Add new cards" control where the user picks how many to introduce. Only added cards are scheduled.

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
6. Polish: sounds, haptics, interface-language setting.
