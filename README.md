# Crestville

A cozy creature-collecting auto-battler for phones. Build a team of 5, watch them
battle on their own, hatch eggs, earn crests, and test your team against other tamers.

See [docs/DESIGN.md](docs/DESIGN.md) for the full game concept.

## Play locally

It's a plain web game with no build step:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (on your phone, use your computer's local IP address).
On a phone you can "Add to Home Screen" to play it like an app.

## Files

- `index.html`, `css/style.css` – page and cozy styling
- `js/data.js` – creatures, elements, roles, regions
- `js/art.js` – hand-drawn style creature and egg art (SVG)
- `js/battle.js` – auto-battle engine
- `js/main.js` – game state, screens, saving
- `tools/balance.js` – quick balance check (`node tools/balance.js`)
