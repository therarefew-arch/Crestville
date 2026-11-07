# Crestville — Game Concept (v2)

> **Current build (v0.4):** creatures level to 100 and earn XP from knockouts (the
> creature that lands it gets full XP, teammates get 20%; trainers give double). Each
> species learns skills at set levels (6, 14, 24, 36, 50, 65, 80, 95). A creature holds
> up to 4 skills, and all 4 work in battle. When a 5th unlocks you choose one to forget
> or skip it; unlocked skills can be swapped back in from its page. Skill power grows
> with evolution and every 30 levels.
>
> **v0.3:** walk around Crestville, meet wild creatures in tall grass, and
> fight lineup battles (front fights front, next steps up). 60 creatures across 5 regions.
> Every creature is one of a kind: random stars (stat quality), 1-3 random traits, one of
> its species' abilities, and a rare shiny color. Scout the enemy lineup and reorder before
> each fight. Merge duplicates to pass on traits or abilities, release for stardust, and
> spend stardust to reroll traits or polish stats. Meadow and Mystery eggs with a
> guaranteed great egg every 10. Rare visitors from far regions can appear in the grass.
> Element team bonus for 3+ of one element. Trainers, a crest boss, Market and Arena.

**Pitch:** A cozy, long-term grind on your phone. Walk around Crestville and the wilds
around it, gather and craft through slow-burn skills, raise companion creatures that
follow you and evolve, and fight in real-time with big floating damage numbers. You're
always making progress, in short sessions or long ones.

Platform: mobile web (HTML5), installable to the home screen. Portrait, one thumb.

## What the player loves (design pillars)
Taken from the player's own favorites (old-school MMO skilling, a chill ranged caster,
creature companions, side-scrolling MMO combat):

1. **Always progressing** – a long, slow grind with very high caps. Something is always
   leveling: a skill, a companion, a piece of gear.
2. **Hands-on where it's fun, hands-off where it's a chore** – bosses, quests, rare drops
   and gathering minigames are played by hand; repetitive grinding can run on its own.
3. **A companion that's yours** – it follows you, fights with you, levels up, evolves, and
   can be rebuilt with swappable parts.
4. **Big loot moments** – rare boss-only drops and gems with random bonus stats.
5. **Cozy, never harsh** – warm colors, soft shapes, friendly wording, no punishment for
   short sessions.
6. **Phone-first** – everything worth doing fits in a 2–10 minute session.

## The world
Crestville is a hill town (the hub) with five wild regions around it. You **walk** your
tamer around a top-down map to reach resources, NPCs and dungeons; nothing is a menu
click away if it makes sense to visit it.
- **Town:** bank, forge, kitchen, market stall, hatchery, workshop (companion parts),
  wardrobe (cosmetics), game parlor (puzzles).
- **Regions:** Meadow Hollow → Ember Ridge → Tidepool Coast → Whisperwood → Stormcrest Peak.
  Each has its own ores, trees, fish, creatures, a dungeon and a boss guarding a Crest.

## Skills (the core grind)
Gathering and crafting skills that feed each other:

| Gathering | Crafting | Feeds into |
|---|---|---|
| Mining | Smithing | Weapons, armor, companion mech parts |
| Woodcutting | Firemaking / Carpentry | Fires for cooking, staffs, bows, furniture |
| Fishing | Cooking | Food that heals and gives buffs |
| Foraging | Alchemy | Potions, gem polishing |

- **Very high level cap** (target 999) with a smooth curve: fast early levels, then a long,
  steady grind. New resources unlock at milestone levels.
- **Walk up to resources.** Rocks, trees and fishing spots are on the map; you go to them.
- **Gathering minigames instead of plain tapping**, short and skill-based:
  - Mining: tap the glowing crack at the right moment (timing ring).
  - Woodcutting: keep a swing meter in the sweet spot.
  - Fishing: reel tension, don't let the line snap.
  - Cooking: pull food off the heat in the "perfect" window.
  - Good play gives bonus yield, XP and a chance at rare finds (gems, seeds, eggs).
- **Auto-gather** for the chill grind: once you've mastered a resource, your companion
  can keep gathering it at a slower rate while you do something else.

## Companions
- Creatures follow you on the map, fight beside you, gain XP, and evolve in 3 stages.
- Three body types: **Organic** (hatched from eggs), **Mech** (built in the workshop
  from smithed parts), and **Hybrid** (organic creature with fitted mech parts).
- **Swappable parts** (head, body, arms, core) change stats, skills and looks.
- You bring 1 companion out at a time (more slots unlock later); the rest live in town
  and can be sent on gathering jobs.

## Creature battles (lineup auto-battles)
- Your team of up to 5 stands in a line, in the order you choose.
- The two front creatures hit each other at the same time. When one faints, the next
  steps up. Last team standing wins.
- Every creature has attack, HP and one ability (start of battle, when hurt, when it
  faints, after attacking, when an ally faints). Lineup order is the main strategy.
- Elements add a small bonus: Fire beats Leaf, Leaf beats Water, Water beats Fire.
- Used for wild encounters, trainers, bosses, and battles against other players' teams.

## Player combat (real-time, side-scrolling MMO feel, later)
- Real-time fights in a side-on arena when you enter combat on the map.
- **Three styles:** Melee, Ranged, Magic, chosen by your weapon. Magic is the
  "chill solo caster" option: ranged, with damage-over-time and a pet that tanks.
- **Skill hotbar** of 4–6 skills with cooldowns, plus your companion's auto skills.
- Big floating damage numbers, crits, combo counters, hit sparkles.
- Normal mobs can be set to auto-fight; **bosses are always played by hand**.

## Loot
- Rarity tiers: Common, Uncommon, Rare, Epic, Legendary.
- **Boss-only drops** with **random bonus stats** (e.g. +8% fire damage, +3% gather speed).
- **Gems** from mining and bosses, socketed into gear; polished with Alchemy.
- Rare drop moments get a special effect and sound so they feel big.

## Economy
- **Player-driven market:** list items for sale, buy from other players, prices set by
  supply and demand. Needs an online server.
- Until then: a town **Trading Post** with NPC buyers whose prices drift based on what
  you sell, so the economy still feels alive.

## Cosmetics
- Outfits, hats, hair, colors and companion skins in the Wardrobe.
- Earned through quests, bosses, achievements and crafting. Cosmetics never add power.

## Side activities
- **Game parlor:** tile-matching solitaire (mahjong-style) and other small puzzles.
  Rewards tickets for cosmetics and small boosts.
- Daily quests and town requests from villagers.

## Progress while away
Open decision (see below). Proposal: gathering jobs and auto-gather keep running offline
for up to ~8 hours; battles, bosses and rare drops only happen while you play.

## Session design
- Open the app → collect what your gatherers found → do a minigame or two, a quick
  boss, or a puzzle → set up the next gathering job → close. 2–10 minutes.

## Build plan
1. **Town + map + walking**: Crestville hub and Meadow Hollow, tap-to-walk.
2. **Skilling**: Mining, Smithing, Woodcutting, Fishing, Cooking, Firemaking with minigames,
   bank and inventory.
3. **Companion that follows you**, levels and evolves.
4. **Real-time combat** with hotbar, damage numbers, one boss with random-stat drops.
5. Trading Post, cosmetics, puzzle parlor.
6. Later: mech/hybrid parts, more regions, online market and player battles.

The current build (an auto-battler team game) is a prototype. Its creatures, art style,
battle numbers and eggs carry over into the new version.

## Roadmap (agreed ideas, roughly in order)
1. **Expeditions:** 3-5 minute runs through a region (choose a path of grass, trainers,
   treasure and rest stops) ending in a boss with loot.
2. **Boss charms:** equippable charms with random bonus stats, dropped by bosses. Later the
   home of mech and hybrid parts.
3. **Combo journal:** records ability combos you discover.
4. **Breeding:** two creatures make an egg that can inherit traits from both parents.
5. **More regions:** Ember Ridge, Tidepool Coast, Whisperwood, Stormcrest Peak, each with
   trainers and a crest boss.
6. **Town jobs and skilling:** resting creatures gather and craft (mining, fishing,
   cooking...). Crafted reroll charms give skilling a purpose.
7. **Time of day and weather** that change which creatures appear.
8. **Weekly cups** with special rules (one element only, level cap) against other
   players' saved teams, plus an online ladder.
9. **Player market** for trading creatures and items (needs a server).
10. **Seasonal events:** limited-time creatures, shiny colors, cosmetics and town
    decorations tied to the seasons.

## Open questions
- Progress while away: on for gathering only, or fully off?
- Keep the 5-creature team auto-battles as a side mode (e.g. the Arena), or drop them?
- Player-driven market and player battles need an online server. Build offline first?
