# Changelog

## v0.0.03
- First run in a real Unity project (Unity 6000.6.10f1, URP). It builds and plays with no errors.
- Fixed a compile error on Unity 6.x (`GetInstanceID` is no longer allowed) and replaced deprecated find calls.
- Fixed UI text showing stale or wrong strings: title cards, the phase tag, toasts and the continue prompt.
  - Unity 6.x's IMGUI text breaks under a `GUI.matrix` scale and with OS fonts that aren't installed.
  - The UI now scales rects and font sizes by hand, and only asks for fonts that are installed.
- Scale: the arena now reads as a big city with giant machines in it.
  - Floodlight lamps cut from 4x to 1.7x human size.
  - Towers have human-size floors and are about twice as tall.
  - The thin crane poles, which looked like lamp posts, are now proper dockside gantry cranes.
  - Added stacks of shipping containers, knee-high on the Graven.
- Mech camera sits further back and over the shoulder, so the Tidewarden stays visible past the Graven.
- Added the menu **Halcyon Noir → Build Windows Player** and command-line smoke-test switches for the built player:
  `-hn-fight` (skip to the boss), `-hn-shots <dir>` (screenshot every 3 s) and `-hn-quit <seconds>`.


## v0.0.02
- Renamed the game to Halcyon Noir: the title cards, pause screen, Unity menu, folder, scene and code namespace.
- Story: the mystery now runs through the Graven. The Tidewarden recognizes it, the lens holds a second message addressed to it by name, and the tide gate's wave mark turns up inside its cockpit.

## v0.0.01
- New game (first released as "Amnesia City"), a Unity (URP) noir giant-robot game for PC.
- Episode 1 "Low Tide" vertical slice. It includes a rainy city block, three characters, five clues, a notebook,
  and a one-chance deduction with three outcomes (Sharp, Shaken, Lost).
- Robot fight against the Tidewarden.
  - Moves: jab chains, heavy punch, charged piston strike, guard and perfect guard, dodge with invulnerability frames.
  - Heat and overheating, plus venting.
  - Boss posture and stagger, an exposed core, three phases, five telegraphed attacks and a finisher.
- Epilogue and end card. Retrying a lost fight keeps your deduction result.
- Toon shading with outlines, synthesized jazz score and sound effects, rain, hit-stop, screen shake. F9 switches to plain shading.
