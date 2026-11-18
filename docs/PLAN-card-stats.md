# Word lists, card statistics and card priority — plan

Status: **draft, for review.** A first version is built on the branch to try out
(not merged); it follows this plan, and the plan wins where they differ.

## Screens

1. **Statistics → category.** Each category row on the Statistics screen opens that category's word list.
2. **Word list.** Every word in the category, in printed order, including words not added yet. Each row shows:
   - French, and English (or the sound description for pronunciation cards)
   - priority stars
   - status and when it next comes up, e.g. "Learning · in 9 min", "Learned · in 12 days", "Not added yet"
3. **Card page.** Opened by tapping a word.
   - Card picture, French, English, "Pronunciation" badge where relevant
   - Priority: three star buttons (1, 2 or 3 stars)
   - One section per direction (FR → EN, EN → FR), since each direction is scheduled on its own:
     - status: New / Learning / Learned / Relearning / Not added yet
     - **score**: "Memory": the chance (%) of remembering it right now, from FSRS
     - next review (relative + date) and last review
     - times viewed, and the count for each rating (Forgot / Hard / Good / Easy)
4. Back goes card page → word list → Statistics, returning to the same scroll position.

## Priority

| Topic | Decision |
|---|---|
| Values | 1, 2 or 3 stars; every card starts at 2 |
| Applies to | The word as a whole (both directions) |
| 2 stars | The FSRS schedule, unchanged |
| 3 stars | The card comes up early by a random share of its interval: 0-35% |
| 1 star | The card comes up late by a random share of its interval: 0-25% |
| Randomness | Drawn once per review, so the date doesn't jump around between screens; drawn again after the next review |
| Example | 2-star card due in 5 days, 3-star card due in 7 days (10-day interval): the 3-star card comes first a little under half the time |
| Learning steps | Not nudged (intervals under a day) |
| Adding new cards | Picks weighted by stars: 3 stars ≈ twice as likely, 1 star ≈ half as likely |
| Order within a session | Unchanged: shuffled; stars only decide *when* a card is due |
| Counts and charts | Home counts, "Due today" and the 7-day forecast use the nudged dates |
| Storage | On the device with progress; included in Export / Import; "Reset all progress" keeps stars |

## Open questions

1. **Strength of the nudge.** Is 0-35% early / 0-25% late about right, or should it be gentler or stronger?
2. **New cards.** Should stars change which new cards get added, or only the timing of cards already added?
3. **Score.** Is "Memory %" the right score to show, or something else (e.g. how many days it's remembered for)?
4. **Per word or per direction.** One priority for the word, or one each for FR → EN and EN → FR?
5. **Reset.** Should "Reset all progress" also reset stars to 2?

## Tests

- Priority: default 2 stars; 3 stars never later and 1 star never earlier than the schedule, within the limits;
  the example above happens sometimes but not always; learning steps untouched; weighted new-card picks.
- Card statistics: views and rating counts per direction match the review log.
- Scripted walk-through at iPhone size: Statistics → category → word → set stars → back.
