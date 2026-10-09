# Brain Champ

Daily brain training for your phone, inspired by the 2012 "Brain Champ" game and apps like Elevate.
No accounts, no ads, no server: an installable PWA that works offline and keeps all progress on the device.

## What's inside

**A daily workout of 7 games** (rotates every day, ~8 minutes):

| Game | Category | What it trains |
|---|---|---|
| Shape Recall | Memory | Shapes appear on a grid, vanish, tap where they were (from level 8: where a *specific* shape was) |
| Echo Path | Memory | Simon-style sequence of pads to repeat |
| Number Vault | Memory | Digit span, forwards and (from level 6) backwards |
| Colour Clash | Attention | Stroop test: tap the ink colour, rule flips at higher levels |
| Odd One Out | Attention | Spot the one shape that differs in hue, shape, size or rotation |
| Speed Match | Speed | Does this card match the last one? 2-back from level 7 |
| Quick Sums | Maths | Mental arithmetic with speed bonuses |
| Letter Mix | Language | Unscramble 4-6 letter words |
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
`vocab-data.js` (200-word deck), `vocab.js` (Lexicon game + Words tab), `words.js` (unscramble lists), `app.js` (shell, state, daily plan, stats), `sw.js`.

When you change files, bump the `?v=` query in `index.html` and `CACHE` in `sw.js` so installed phones pick up the update.
