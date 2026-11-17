# Play mode 1: flip-card review — plan

## Decisions

| Topic | Decision |
|---|---|
| Platform | Web app (PWA) for iPhone: opened in Safari, added to the home screen, runs full screen and offline |
| Card art | Cut from the printed sheets in `source-sheets/`, framed in a white border with rounded corners like real playing cards (approved) |
| Sessions | Pick one or more categories (or All); review the cards that are due. New cards are only introduced when the user chooses to add them (no automatic daily limit) |
| Interface language | English by default, switchable to French (prompts, buttons, menus) |
| Grade buttons | Forgot / Hard / Good / Easy (FR: Oublié / Difficile / Bien / Facile), each showing when the card would come back, e.g. "Good · 3 days" |
| Directions | French → English and English → French scheduled separately (134 vocab cards × 2 + 10 pronunciation cards × 1 = 278 review items) |
| Scheduler | FSRS (four grades: Forgot / Hard / Good / Easy) |
| Storage | On the device (IndexedDB), with Export / Import to a file as a backup; sync can come later |
| Session direction | French → English, English → French, or Mixed (random direction per card) |
| Tech | Vite + TypeScript, FSRS via the open-source `ts-fsrs` library |
| Hosting | GitHub Pages; the repo will be made public. A GitHub Action publishes the app whenever `main` changes |
| App name / icon | "Le Lapin" under the home-screen icon; the icon is the bunny cropped from the card art |
| Speech | French is read aloud with the iPhone's built-in French voice: on by default when the French side appears, can be turned off in settings; a speaker button replays it |
| Workflow | All work goes straight to `main`; no pull requests |

## Card screen

The printed card has French on the top half and English upside down on the bottom half,
so rotating 180° is the same as turning the physical card around.

1. Card rises from the bottom showing the illustrated back. For English → French the card is pre-rotated 180°.
2. It stops when the card's middle is at the bottom edge of the screen, then flips to the text face.
   Only the prompt half is on-screen; the answer half is off-screen, not just covered.
3. Prompt: "What does this mean in English?" / "How do you say this in French?"
4. Tap: the card rotates 180° and rises until fully visible (answer upright on top, prompt upside down below).
5. Four self-grade buttons appear. "Forgot" brings the card back after about 3-5 other cards in the same session.

- Taps are ignored while an animation is running.
- An Undo button takes back the last grade.
- The session ends when no cards are due or when the user stops; there is no fixed length.
- Layout (portrait): prompt text above the card, grade buttons at the bottom, card fills most of the width.
- With iOS "Reduce Motion" on, the animations become simple fades.
- On a computer (for testing): Space / Enter turns the card, keys 1-4 grade it.

## Special cards

- E → 饿 and U → 鱼 (`answerLanguage: "zh"`): normal flip cards; shown as the prompt in English → French.
- Pronunciation cards (`type: "pronunciation"`, `directions: ["fr-en"]`): cards that only represent a sound
  — Eu (Mathieu), A, E, I, O, U, Ou, Oi, Au, ~eau. French → English only, shown with a
  "Pronunciation" / "Prononciation" badge. Eau (Water) is a real word, so it stays a normal card.
- Duplicates across categories stay separate cards.

## Adding new cards

The home and category screens show how many cards haven't been studied yet, with an
"Add new cards" control where the user picks how many to introduce. Only added cards are scheduled.
New cards are added in sheet order (row by row) within the chosen categories.

## Progress

- Statistics screen: cards due today, cards learned per category, daily streak.
- Progress is keyed by card ID and direction (e.g. `D-r2c3` + `fr-en`), so fixing a card's text keeps its history.

## iPhone specifics

- Installed from Safari via Share → Add to Home Screen; the app shows a short "how to install" hint when opened in the browser.
- Home-screen icon (`apple-touch-icon`), app name, splash colour, and full-screen (standalone) display.
- Layout respects the notch / Dynamic Island and home-indicator safe areas (`viewport-fit=cover`).
- No accidental zoom, text selection or rubber-band scrolling during play; tap targets at least 44 pt.
- Works offline once installed (service worker caches the app and all card images, ~5 MB).
- iOS can clear website storage, so the app asks for persistent storage and the Export backup matters.
  Data in the home-screen app is separate from data in Safari, so study from the installed app.
- Haptics: the web vibration API is not supported on iPhone, so feedback is visual (and optional sounds) instead.
- Sounds start only after the first tap (iOS rule).
- Portrait is the main layout; landscape still works but isn't optimised.

## Advanced mode: typed answers

- Lenient matching: ignores case, punctuation and bracketed hints like "(Être)" or "(Plural)";
  "/" and "," separate accepted alternatives.
- A missing accent counts as "nearly right" and is highlighted.
- The app suggests Good or Forgot; the user can override.
- Cards with Chinese answers are excluded.
- A row of accent buttons (é è ê ë à â ç î ï ô û ù) above the keyboard; long-press accents on the iOS keyboard also work.

## Build order

1. ~~Crop the 144 card faces and 5 back illustrations from the sheets; round the corners; add image paths to `cards.json`.~~ Done.
2. Card component and animations, tested at phone size.
3. Session flow, grade buttons, FSRS scheduling.
4. Home and category screens; save progress on the device.
5. Typing mode.
6. Polish: sounds, French speech (auto-play setting + replay button), interface-language setting, statistics, Export / Import.
7. iPhone install: icon, manifest, offline caching, hosting, test on a real iPhone.

Testing throughout: automatic tests for scheduling and answer checking, plus a scripted
run through a full session at iPhone size with screenshots.
