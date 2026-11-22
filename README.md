# Halcyon Noir

An original noir giant-robot game for PC, made in Unity. A rain-soaked art deco city lost its memory
forty years ago. You play Elias Vane, who finds lost things for a living, and who has a very large
machine sleeping under the old foundry.

**Current version: v0.0.07.** The version is shown in the bottom-right corner of the screen, on the title card and on the pause screen. Every update bumps it by one (see CHANGELOG.md).

This first build is a playable vertical slice of **Episode 1: Low Tide**. It plays in this order:

1. **Investigation.** Walk a rainy city block. Talk to three people and examine two places. Clues go into your notebook.
2. **Deduction.** Answer two questions about what happened. You get one chance, with no retries. Getting both right marks
   the enemy's weak point, and it takes triple damage there. Each wrong answer weakens your robot.
3. **The fight.** Pilot the Graven against the Tidewarden, a giant Relic that rises from the harbor. It has three phases,
   telegraphed attacks, a posture/stagger system and a heat meter. It is hard on purpose.
4. **Epilogue.**

Everything is built from code: the city, the robots, the shaders, the music and the sound effects.
There are no asset store packages to import.

## How to run it

1. Install **Unity Hub** from unity.com. In Hub, install **Unity 6 (6000.0 LTS)** or newer.
2. In Hub, click **New project** and pick the **Universal 3D** template (it's also called "3D (URP)"). Create it.
3. Copy the `HalcyonNoir` folder from this repository into the project's `Assets` folder. You should end up with `Assets/HalcyonNoir/...`.
4. Go back to Unity and wait for it to finish importing.
5. In the top menu, click **Halcyon Noir → Create & Open Slice Scene**.
6. Press **Play**. For the best experience, set the Game view to Full HD (1920x1080) or maximize it.

To build a standalone game, open **File → Build Profiles** (it's called **Build Settings** in older versions), choose Windows, and build.
The scene is already added to the build list.

## Controls

| On foot | |
|---|---|
| WASD / left stick | Move |
| Mouse / right stick | Look |
| Shift | Run |
| E | Interact / continue |
| 1–4 or click | Pick a dialogue choice |
| Tab | Notebook |
| C | Light up or take a drag, and think the case over |
| Esc | Pause (mouse sensitivity, restart fight, quit) |
| G (hold) | Call the Graven, when the prompt appears |

| Street fight (on foot) | |
|---|---|
| Left mouse | Jab (the third in a row is a hook) |
| Right mouse | Haymaker (slow; staggers) |
| Shift (hold) | Guard. Tap it as a fist glints to **parry**. |
| Space | Dodge |

A pale glint on a man's fist means his swing is coming. Hitting him mid-windup breaks it.

| The Graven | |
|---|---|
| Left mouse | Jab (chain it) |
| Right mouse | Heavy punch (slow, big posture damage) |
| Hold Q, release | Piston strike (charge it longer for more damage, but it costs a lot of heat) |
| Shift (hold) | Guard. Pressing it just as a hit lands is a **perfect guard**. |
| Space | Dodge (brief invulnerability) |
| E | Vent heat (you're vulnerable while venting) |
| F | Finish it, when the prompt appears |

**Reading the fight:** amber shapes on the ground mean you can guard or dodge. Red means dodge only.
Fill the boss's posture bar to stagger it, then hit the exposed core. Every action builds heat,
and if heat reaches 100% the Graven locks up.

## Troubleshooting

- **Everything is pink or magenta.** Press **F9** to switch to Unity's standard URP shader. Also make sure the
  project uses the Universal Render Pipeline (the Universal 3D template does).
- **The menu item doesn't appear.** Check the Console for compile errors, and confirm the folder is at `Assets/HalcyonNoir`.
- **Keys don't respond.** Go to Edit → Project Settings → Player → Active Input Handling. Both "Input System Package"
  and "Both" work.
- **Play does nothing in another scene.** The game only starts in the scene named `HalcyonNoir`, or in any scene that
  contains a `BootMarker` component.

## Project layout

```
HalcyonNoir/
  Editor/SetupMenu.cs           menu item that creates the scene
  Resources/Shaders/            toon (with outlines), glow, unlit and window shaders for URP
  Scripts/Core/                 game director and story flow, input, materials, sound synth, effects
  Scripts/OnFoot/               Vane, the people of Halcyon, the third-person camera
  Scripts/Mech/                 the Graven and the Tidewarden
  Scripts/World/                the city block and the harbor arena
  Scripts/UI/                   dialogue, notebook, HUD, pause menu
docs/STORY.md                   story bible
CHANGELOG.md
```
