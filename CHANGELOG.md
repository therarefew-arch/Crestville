# Changelog

## v0.0.08
- **Lighting up, done properly.** Vane takes his time now:
  - The cigarette goes to his lips and his chin comes down.
  - Both hands come up and cup around a brass lighter right at the tip. The arms are solved so the hands really
    meet there.
  - The lid flips back. The first strike only throws a spark. The second catches, and the flame lights his face
    warm from below.
  - He draws, the flame bends up into the tip, and the paper catches.
  - The lid snaps shut, the hands come down, and his head comes up to let the first smoke out, up and away.
  - It works standing in the street, at the wheel of the car and in the cockpit.
- The ember's glow is softer, so it lights his face without washing his shirt pink.
- New dev switch: `-hn-lightup` films the light-up close from three angles.

## v0.0.07
- **The finishing move is a visor beam now.** When the crab is staggered and you press F, the Graven plants its
  feet and throws its arms back. The visor heats from amber to white, and it burns a beam straight through the
  crab's lantern core.
- **Fixed: heads poking through the car roof.** The cabin is taller and the bench seat sits lower, so Vane's hat
  and Wren's hair stay inside the car in the opening drive.
- **Fixed: Vane's coat hanging under the car.** When he sits, the back and side panels of his coat bunch up on the
  seat instead of hanging through the floor. Wren's coat does the same.

## v0.0.06
- **New opening: the drive in.**
  - The game starts on the causeway into Halcyon at night. Vane is at the wheel of his long black car, in the
    rain.
  - Wren, his assistant, rides in the passenger seat. She's an android and keeps his files. She gives him the
    rundown on the job: who Mara is, the missing brother, the cases the Trust closed, the light under the
    water, and how his link band warms up near the harbor.
  - Vane lights a cigarette one-handed while he drives.
  - The car rolls up Harbor Street and parks, Vane gets out into the rain, and the investigation starts.
  - Wren waits in the car. Walk up and talk to her for a recap or a nudge toward the next lead.
- **The Tidewarden doesn't wait anymore.**
  - It comes for the pier while you call the Graven, and tears the end of the pier off. Vane is thrown back.
  - The Graven rises beside it. They know each other for a moment. Then the Graven shoves it back out into deep
    water.
  - It comes again while Vane runs for the hand and climbs aboard, roaring as the hatch seals.
- **The fight happens in the same place.** There's no cut to a separate arena any more. When the link comes
  up, the tide goes out all at once, and the two machines fight on the harbor bed off the end of the pier. Under
  them are mud, rock, old pilings and a wrecked fishing boat. Around them are stone quays, cranes and
  warehouses, with Harbor Street right behind. The machines stay off the pier and out of the street.
- **Smoking.**
  - Vane has a real cigarette. He lights it with a lighter cupped in both hands, takes slow drags that make the
    ember flare and light his face, lets the smoke out, and flicks the butt away when he's done. A thin wisp
    curls off the tip.
  - **[C]** lights up or takes a drag, and he thinks the case over: a line about where to look next.
  - **The trail:** a meter in the corner fills with every clue and lead. The deeper he is in the case, the
    more often he lights up on his own and the heavier the smoke.
  - He smokes in the cutscenes:
    - every new clue
    - Mara's story
    - the pawn ticket
    - lighting up before he questions Gil
    - the gouges
    - the deduction, where he flicks the butt into the harbor before he calls the Graven
    - flicking it at the Trust's man ("This is the letter.") and lighting up after the fight
    - with it hanging from his lips while he picks the lock
    - the epilogue with Mara
  - **In the cockpit**, before the link, you light up (**[C]**) and take a drag (**[C]**) in the dark. The smoke
    hangs in the amber light, then he plugs in.
  - Ostrowski's cigarette smokes too.
- **People move more.**
  - Everyone turns their head to look at Vane when he's near, and he looks back.
  - Whoever is talking gestures and nods.
  - Idle people shift their weight. Mara stands with a hand on her hip and Gil keeps his hands in his pockets.
  - Vane leans into a run.
- **Harbor Street, lived in.**
  - Lit shop windows and doors, awnings, and vertical neon blade signs (HOTEL, PAWN, DINER, RADIO...).
  - Fire escapes up the towers, and parked cars along the curbs.
  - Steam rising from the manholes and puddles catching the lamplight.
  - Hydrants, trash cans, a mailbox and a lit phone booth.
  - The street now continues west out of town.
- New sounds: the lighter, an exhale, the car's engine and its door.


## v0.0.05
- **Your own music.** Drop an audio file named `investigation` (mp3, ogg or wav) into
  `HalcyonNoir/Resources/Music/` and it replaces the investigation theme. A file named `fight` replaces the fight
  music. Both loop. Without them, the game uses its synthesized music. `Resources/Music/README.md` explains it.
- **New investigation theme.** It's a slow, cool-jazz piece for muted trumpet, brushed drums, walking bass and sparse
  piano. It's 32 bars long (81 s), so the repeat isn't obvious.
- **Fights switch the music hard.** The street ambush and the robot fight cut straight to the fight track with an
  impact hit, instead of a slow crossfade. The fight track is longer (16 bars with a second section), with snare
  fills, faster hi-hats and a driving synth line.
- **Call-in polish.**
  - The Graven rises farther out in the harbor.
  - The camera holds a silent wide shot, low behind Vane, with a slow push-in while its visor flickers on.
  - The Graven wades in to the pier in three heavy strides, with splashes, before it kneels.
- New dev switch `-hn-wav <dir>` writes the synthesized music and rain to .wav files.


## v0.0.04
- **Calling the Graven is now a scene, not a fade to black.**
  - Hold G and Vane raises his left wrist. The amber link band on it burns brighter as you hold.
  - The Graven rises out of the harbor beside the pier, about 38 m tall (twenty times Vane's height), against
    much taller towers.
  - Its visor flickers on. It kneels and puts its hand down on the pier. Vane steps onto the hand, and it lifts him
    to its chest.
  - The chest hatch drops open like a drawbridge, he walks into the amber light, and it seals behind him.
  - Inside the new cockpit, he puts the band into a socket on the armrest. Light runs out along the floor and up the
    walls into the visor, and the screen reads LINK ESTABLISHED with a sync percentage. Then the fight starts.
- **More to do on foot.**
  - *The Trust's men.* Once Gil has lied to you, three Trust enforcers jump Vane on the street.
    - Hand-to-hand moves: jab chain (LMB, the third hit is a hook), haymaker (RMB), guard (Shift), dodge (Space).
    - They take turns. A pale glint on a fist means a swing is coming: tap Shift as it lands to parry and stagger him,
      or hit him mid-windup to break it.
    - Win and you take a Trust card from the leader. Lose and you wake up on the pavement with nothing. You only get
      one chance.
  - *The tide gate's lock.* After examining the gate you can try to pick it.
    - Three pins, a sweeping needle and a shrinking target. Three slips and the pick breaks; you can try again.
    - Inside is a page from Teo's notebook: a drawing of the Graven, and a note that it came out of the gate first.
  - Both are leads "off the record", tracked in the notebook. Each adds +8% to the Graven's hull in the boss fight
    (link sync 108% or 116%).
- **New Vane.** The capsule in a top hat is gone.
  - He's tall and narrow-waisted, with slicked-back black hair, a sharp jaw, narrow eyes and angled brows.
  - Long black double-breasted greatcoat with a stand-up collar, brass buttons and coat tails that swing when he moves.
  - White shirt, black tie, black gloves, elbows that bend, and the brass link band on his left wrist.
- **Rain no longer loops every few seconds.** The rain bed is now 20 seconds long with slow gusts and no baked-in
  drips. Drips and distant thunder play at random times, so nothing repeats.
- Both music loops are twice as long, each with a B section: new chords and an answering trumpet line in the noir
  theme, and a climbing second half with a snare fill in the fight theme.
- The version number now shows in the corner of the screen and on the title card.
- Fixes:
  - The "Hold [G] to call the Graven" hint never showed on foot. It was only drawn inside the mech HUD.
  - The summon could throw an error on the frame the hold bar filled.
- Dev:
  - `-hn-callin` jumps straight to the call-in scene and auto-advances it.
  - `-hn-shot-every <seconds>` sets the screenshot interval.
  - The `-hn-auto` route now walks into the ambush, fights it and picks the lock.
- Playtested the whole street half with a scripted run. Every conversation, all five clues, Gil's lie and confession,
  the deduction and the summon all play through with no errors and no unreachable spots.
- Conversations use a looser two-shot. Vane no longer fills a third of the frame, and the camera stays on the
  street side so awning posts don't block the person he's talking to.
- The harbor reveal now shows the Tidewarden rising out of the water behind Vane on the pier. Before, the camera
  sat inside Vane's legs and looked up at an empty sky.
- Toast boxes size themselves to their text, so the opening controls hint no longer wraps and gets cut off.
- New smoke-test switch `-hn-auto`: a scripted player walks the investigation, logs every line of dialogue and
  flags anywhere it gets stuck. Test runs keep going when the window loses focus.


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
