# Crestville

A cozy creature-collecting RPG for phones. Walk around town, meet wild creatures in
tall grass, and win lineup auto-battles (front fights front) to make new friends.
Every creature rolls random stars, traits and abilities, so you grind for your own synergies.

See [docs/DESIGN.md](docs/DESIGN.md) for the full game concept and [CHANGELOG.md](CHANGELOG.md) for updates.

**Versioning:** bump `VERSION` in `js/data.js` by one with every update (v0.0.02, v0.0.03, ...) and add a CHANGELOG entry.

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
- `js/maps.js` – town, route and grove maps, NPCs and trainers
- `js/world.js` – walkable overworld (canvas)
- `js/battle.js` – lineup battle engine and creature abilities
- `js/main.js` – game state, screens, saving
- `tools/balance.js` – map checks and balance check (`node tools/balance.js`)
- `tools/build_artifact.py` – rebuilds `play.html` for the shareable link
