# Halcyon Noir: handoff brief for building in Unity

You're picking up an original noir giant-robot game for PC, built in Unity 6 with URP. The code is written:
about 4,100 lines of C# and 4 shaders. **It has never been opened in the Unity Editor.** It compiles against
Unity's reference libraries with no errors or warnings, but nobody has run or played it.

Your job:
1. Get it running in a real Unity project.
2. Fix whatever breaks.
3. Tune it until it feels good.
4. Continue development.

## Source

- Repo: `therarefew-arch/crestville`, branch `ccr-11c75931-71hmm0`
- Game code: `HalcyonNoir/`. Story bible: `docs/STORY.md`. Setup and controls: `README.md`. Version history: `CHANGELOG.md`
- Current version: **v0.0.02**. It's defined as `Game.Version` in `HalcyonNoir/Scripts/Core/GameDirector.cs`.

## Ground rules from the owner

- **Versioning:** every update bumps the version by 1 (v0.0.02 → v0.0.03 → …). Update `Game.Version` and add a `CHANGELOG.md` entry.
- **Tone:** serious. Not cheesy, not easy. Restrained noir dialogue; the tone rules are in `docs/STORY.md`. Combat is meant to be hard.
- **Originality:** the mood is inspired by late-90s Toonami-era noir mecha anime, but use no names, designs, lines or music from The Big O
  or any other show. The title "Halcyon Noir" and the city "Halcyon" are ours.
- **The core hook:** the city's mystery is tied to the giant robot, the Graven. Keep that thread central (see "The Graven thread" in STORY.md).
- **Platform:** PC (Windows), keyboard and mouse first. Gamepad is supported.

## Step 1: Get it running

1. Create a Unity 6 LTS project from the **Universal 3D** template.
2. Copy `HalcyonNoir/` into `Assets/` so it sits at `Assets/HalcyonNoir/`.
3. Use the menu **Halcyon Noir → Create & Open Slice Scene**. This creates `Assets/Scenes/HalcyonNoir.unity` (a camera and a BootMarker) and adds it to Build Settings.
4. Press Play. `Bootstrap` (`[RuntimeInitializeOnLoadMethod(AfterSceneLoad)]`) spawns the `GameDirector`, which builds everything from code.

There are no prefabs and no imported assets. Everything else comes from the default URP template packages, including the
Input System. It does not use TextMeshPro, UGUI or Cinemachine.

## Architecture

| File | What it does |
|---|---|
| `Scripts/Core/GameDirector.cs` | `Game` (Version, Paused), `Bootstrap`, `BootMarker`, `MechCamera`, and `GameDirector`: the whole episode as coroutines (intro → investigation → deduction → summon → fight → defeat/retry → finisher → epilogue). All dialogue lives here. |
| `Scripts/Core/Inputs.cs` | Static `In`: every control. Uses the Input System when `ENABLE_INPUT_SYSTEM` is defined, legacy `Input` otherwise. |
| `Scripts/Core/Mats.cs` | `Mats`: cached materials (Toon / Glow / Unlit / Windows). Falls back to URP Lit, and F9 toggles. `Build`: primitive-part helpers, point lights, sector meshes for attack telegraphs. |
| `Scripts/Core/Sound.cs` | Synthesizes all audio at 22050 Hz: rain, a noir jazz loop at 66 bpm, a fight loop at 132 bpm, and the sound effects. `PlayMusic`, `Ambience`, `Play`. |
| `Scripts/Core/Fx.cs` | Particle pools (sparks, debris, steam, splash, embers), screen shake, flashes, hit-stop and slow-mo (via `Time.timeScale`). |
| `Scripts/OnFoot/Figure.cs` | People built from primitives, with procedural walk and idle animation. |
| `Scripts/OnFoot/Player.cs` | `PlayerMotor` (Vane, CharacterController) and `OrbitCamera` (third person, spherecast collision, cinematic shot mode). |
| `Scripts/World/City.cs` | `City`: atmosphere, the street block (towers, Blue Lantern bar, harbor, interactables, NPCs), the robot arena at `(0,0,2000)` and rain. `Interactable`. |
| `Scripts/Mech/Graven.cs` | `GravenController`: the player's robot. A state machine with procedural animation. |
| `Scripts/Mech/Boss.cs` | `BossController`: the Tidewarden, a crab Relic. AI, telegraphs, posture/stagger, phases. |
| `Scripts/UI/UI.cs` | IMGUI on a 1080p virtual canvas: dialogue with a typewriter effect, choices, notebook, title cards, mech HUD, pause menu, damage numbers, film grain and vignette. |
| `Resources/Shaders/*.shader` | URP HLSL: `HalcyonNoir/Toon` (banded light, rim, inverted-hull outline, shadow and depth passes, Forward+ loop), `Glow` (additive), `Unlit`, `Windows`. |
| `Editor/SetupMenu.cs` | The menu items. |

## Episode 1, "Low Tide": the flow

1. **Intro.** Narration, then the title card.
2. **Investigation**, on the street block.
   - People: Mara (the client), Ostrowski (the bartender), Gil (the harbor watchman).
   - Places: the pier gouges and the tide gate.
   - Five clues go into the notebook (Tab).
   - Gil lies until you confront him with the gouges.
3. **Deduction.** It unlocks once you've met Mara and talked to Gil, and you start it at the pier. You get one try.
   - Two questions. The correct answers are option 3, then option 2.
   - The outcome sets the fight:

     | Outcome | Graven HP | Exposed-core damage |
     |---|---|---|
     | Sharp | ×1.0 | ×3 (core is marked) |
     | Shaken | ×0.9 | ×2 |
     | Lost | ×0.8 | ×2 |

4. **Summon.** Hold G, then cut to the harbor arena. The Tidewarden rises, then pauses because it recognizes the Graven.
5. **Fight.**
   - Defeat offers a retry. The pause menu also has "Restart the fight".
   - The finisher (F) is allowed when the boss is staggered and at or below 12% HP. The boss can't die except through the finisher.
6. **Epilogue.**
   - The lens plays Teo's message, then a second voice: "Warden to Graven. The gate is open. Come home."
   - The wave mark turns up in the Graven's cockpit.
   - A final scene with Mara, then the end card. Any key restarts.

## Combat tuning (starting values, all untested)

**The Graven**
- 1600 HP. Move speed 11. Passive cooling 10 heat per second.
- Overheats at 100 heat: locked for 2.8 s, then resets to 40 heat.

| Move | Damage | Posture | Heat | Notes |
|---|---|---|---|---|
| Jab | 34 | 7 | +7 | Chains |
| Heavy | 95 | 24 | +15 | Hits at 0.6 s |
| Piston strike (hold Q) | 110–340 | 15–55 | +16/s while charging, +14 on release | Charges over 1.4 s |
| Dodge | — | — | +12 | Invulnerable for 0.32 s |
| Guard | — | — | +8 per blocked hit | Takes 30% damage. A press within 0.22 s of the hit is a perfect guard: no damage, −15 heat, slow-mo, +28 boss posture. |
| Vent (E) | — | — | −110/s | Lasts 1.4 s. You take 1.3× damage while venting. |

**The Tidewarden**
- 3200 HP. The posture bar fills to 100, which staggers it for 4 s (4.5 s if Sharp).
- Posture decays when it hasn't been hit for 2.5 s.
- Posture damage is ×1.25 for frontal hits and ×1.6 for hits that interrupt a windup.
- Phases change at 60% and 25% HP. Windups get faster (×0.85, then ×0.72) and combos get more frequent.

| Attack | Damage | Windup | Can you guard it? |
|---|---|---|---|
| Slam | 210 | 1.15 s | Yes (amber circle) |
| Sweep | 150 | 1.0 s | Yes (amber 150° cone) |
| Beam | 250 | 1.5 s | Yes (amber line that tracks you, then locks) |
| Grab | 300 + stun | 0.95 s | No (red) |
| Tidal Surge (phase 3 only) | 190 | — | No. It's an expanding ring; dodge through it. |

## Expect to fix these first (untested risks)

1. **Shaders.** The toon shader targets the URP 17 (Unity 6) include paths, plus Forward+ (`_FORWARD_PLUS` / `_CLUSTER_LIGHT_LOOP`).
   - If materials are pink or the outlines are missing, check the Console for shader errors.
   - F9 switches to URP Lit as a fallback.
   - Confirm the outline pass (`LightMode SRPDefaultUnlit`) renders in the URP renderer you're using.
2. **Scale and camera framing.** The street is human scale and the robots are about 20 units tall. `MechCamera` sits 40 back and 19 up. Check that the Graven and the boss both stay in frame.
3. **Fog and lighting.** The fog is exponential squared, density 0.018. The arena is lit by six floodlights and the moon. The arena may be too dark or the fog too thick.
4. **Telegraph visibility.** The ground telegraphs are sector meshes at y = 0.08 with the additive Glow shader. Check that they're readable and aren't z-fighting.
5. **Interactable positions.** The NPCs, the gouges at (54, 0, −0.3) and the gate at (38.2, 0, −16) are placed by hand. Check that they're reachable and not inside walls. There are invisible bounds colliders.
6. **Difficulty.** Aim for hard but fair. A first-time player should usually lose once or twice.
7. **Input.** If "Active Input Handling" is set to Old only, the code uses the legacy path. The gamepad look scaling in `In.Look` is a guess.
8. **Audio levels.** Everything is synthesized, so balance music against effects.
9. **Performance.** Rain runs at 2600 particles per second with up to 6000 alive. There are many point lights in the arena.

## Suggested next work, once it runs and feels good

- Replace the primitive models with proper art in the same art deco style. Keep the readable silhouettes: the Graven's amber visor slit, piston forearms and exhaust stacks; the Tidewarden's lantern core and two big claws.
- Add a lock-on toggle and better hit reactions. Consider using Animator-driven rigs once real models exist.
- Add save, settings (volume, sensitivity, resolution) and a title menu.
- **Episode 2, "The Lighthouse That Wasn't."** Follow Teo's trail and the "Warden to Graven… come home" message. Keep building the Graven mystery: who piloted it before Vane, and where is home?

## Conventions

- Namespace `HalcyonNoir`. The world is built from code through `Build.Part` and `Mats.*`.
- Everything that should fade or pulse uses `Mats.GlowInstance` (uncached). Everything else uses the cached `Mats.*`.
- Keep the game booting without hand-made scene setup until real assets replace the procedural ones.
