# Brain Champ

Daily brain training for your phone, inspired by the 2012 "Brain Champ" game and apps like Elevate.
No accounts, no ads, no server: an installable PWA that works offline and keeps all progress on the device.

## What's inside

**Profiles**: the app opens on a profile picker. Eboski and Damoski by default; add or remove profiles right there. Each profile keeps its own levels, streaks, stats and vocabulary.

**A daily workout of 8 games** (rotates every day, ~9 minutes):

| Game | Category | What it trains |
|---|---|---|
| Shape Recall | Memory | Shapes flash on a grid and vanish: tap the spots (L1-3), where a *specific* shape was (L4-11), or in order of appearance (L12+) |
| Echo Path | Memory | Simon-style sequence (starts at 4, 16 pads from level 5, backwards rounds from level 9) |
| Number Vault | Memory | Digit span from 4 digits: forwards, backwards (level 4+) and sorted (level 9+) |
| Colour Clash | Attention | Stroop test: ink vs word rule flips, shuffling buttons (L5+), per-word time limit (L8+) |
| Odd One Out | Attention | Spot the one shape that differs in hue, brightness, shape, size or rotation; grids up to 7×7, board timeout (L8+) |
| Speed Match | Speed | Does this card match the last one? 2-back from level 7 |
| Quick Sums | Maths | Mental arithmetic with speed bonuses |
| Letter Mix | Language | Unscramble 4-6 letter words |
| Word Fit | Language | Fill-the-gap grammar and usage, 168 native-level traps with explanations |
| Lexicon | Vocabulary | Five new uncommon words a day + a 10-question quiz with spaced repetition |

Every game adapts its level to you (30 levels each). Stats tab shows a Brain Index, a radar chart by category,
14-day history, a consistency heatmap and personal bests.

## Install on a phone

Open the site, then **Add to Home Screen** (iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app).

## Develop

Plain HTML/CSS/JS, no build step. Serve the folder with any static server, e.g.

```bash
python -m http.server 5174 --directory .
```

Files: `index.html`, `styles.css`, `engine.js` (shared utilities, shapes, sound, haptics), `games.js` (8 games),
`vocab-data.js` (200-word deck), `grammar-data.js` (grammar bank), `vocab.js` (Lexicon game + Words tab), `words.js` (unscramble lists), `app.js` (shell, state, daily plan, stats), `sw.js`.

When you change files, bump the `?v=` query in `index.html` and `CACHE` in `sw.js` so installed phones pick up the update.
