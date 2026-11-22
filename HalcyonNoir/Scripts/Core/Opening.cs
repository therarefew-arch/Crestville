using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // The opening drive, Wren, and Vane's cigarettes.
    //
    // The game opens on the causeway into Halcyon at night: Vane driving, Wren (his assistant, an android
    // who rides in the passenger seat and keeps his files) giving him the rundown on the job. The car comes
    // into Harbor Street and parks, Vane gets out into the rain, and the investigation starts. Wren stays
    // with the car; she'll go over the case again if he asks.
    //
    // Vane smokes. He lights up when a case gets its hooks in him, and the further along the trail he gets,
    // the more he smokes: the trail meter fills with every clue and lead, he lights up on his own more
    // often, and the smoke hangs heavier. [C] lights one up or takes a drag, and lets him think the case
    // over for a moment.
    public partial class GameDirector
    {
        Car vaneCar;
        Figure wren;
        Smoker smoke;
        float idleTime;

        // 0..1: Mara, the five clues and the two leads off the record
        float Trail => Mathf.Clamp01(((metMara ? 1 : 0) + ClueCount + Extras) / 8f);

        Figure SpeakerFigure(string name)
        {
            switch (name)
            {
                case "Vane": return player != null && player.gameObject.activeInHierarchy ? player.Figure : null;
                case "Mara": return city.People["mara"];
                case "Ostrowski": return city.People["ostrowski"];
                case "Gil": return city.People["gil"];
                case "Wren": return wren;
                case "Trust man": return Brawl.All.Count > 0 && Brawl.All[0] != null ? Brawl.All[0].Figure : null;
            }
            return null;
        }

        // ---------------- smoking, every frame on foot ----------------
        void UpdateOnFoot()
        {
            if (smoke == null) return;
            float dt = Time.deltaTime;
            smoke.Thickness = 1f + Trail * 1.6f;
            ui.Trail = phase == Phase.Explore && !ui.ShowNotebook ? Trail : -1;

            // people look at Vane when he's close, and he looks at them
            var head = player.Figure.Head.position;
            Figure nearest = null; float nd = 5f;
            foreach (var kv in city.People)
            {
                var fig = kv.Value;
                float d = Vector3.Distance(fig.transform.position, player.transform.position);
                fig.LookTarget = d < 7f ? head : (Vector3?)null;
                if (d < nd) { nd = d; nearest = fig; }
            }
            if (wren != null) wren.LookTarget = Vector3.Distance(wren.transform.position, player.transform.position) < 9f ? head : (Vector3?)null;
            foreach (var t in Brawl.All) if (t != null && t.Figure != null) t.Figure.LookTarget = head;
            if (!busy) player.Figure.LookTarget = nearest != null ? nearest.Head.position : (Vector3?)null;

            if (phase != Phase.Explore || Game.Paused) return;
            if (!busy && In.Smoke && !smoke.Busy) { smoke.Drag(); ThinkItOver(); idleTime = 0; }
            // standing still, deep in a case, he reaches for one on his own
            if (!busy && player.Figure.Speed01 < 0.01f) idleTime += dt; else idleTime = 0;
            if (idleTime > Mathf.Lerp(45f, 12f, Trail) && !smoke.Busy)
            {
                idleTime = 0;
                if (smoke.Lit || Trail > 0.2f) smoke.Drag();
            }
            if (smoke.Lit && smoke.Burn >= 1 && !smoke.Busy) smoke.Flick();
        }

        // A drag after something lands, while the conversation keeps going.
        IEnumerator DragSoon(float delay)
        {
            yield return Wait(delay);
            if (smoke != null && player.gameObject.activeInHierarchy) smoke.Drag();
        }

        void ThinkItOver()
        {
            ui.Toast(NextLeadThought(), new Color(0.75f, 0.75f, 0.78f));
        }

        string NextLeadThought()
        {
            if (!metMara) return "The client's waiting outside the Blue Lantern. A woman in red. Don't keep her waiting.";
            if (!askedPeople) return "Mara knows who Teo talked to. Ask her.";
            if (!haveTicket) return "Ostrowski, behind the bar. Bartenders hear everything twice.";
            if (!gilLied) return "Gil, the night watchman at the harbor. Teo walked those piers every night.";
            if (!sawGouges) return "Something happened at the end of the pier. Take a closer look.";
            if (!sawGate) return "The old tide gate in the sea wall. Nobody's opened it in forty years. Supposedly.";
            if (!gilConfessed) return "Gil lied to me. The marks on the pier, the gate. Put them in front of him.";
            if (!gateOpened) return "That lock on the tide gate's been opened once. It could be opened again.";
            if (!ambushDone) return "The Trust knows I'm asking. Let them come.";
            return "I have enough. The end of the pier. One chance to get it right.";
        }

        // ---------------- Wren ----------------
        Figure MakeWren(Transform parent)
        {
            var f = Figure.Make(parent, Vector3.zero, 0, new Figure.Look
            {
                coat = new Color(0.24f, 0.25f, 0.28f), shirt = new Color(0.88f, 0.87f, 0.84f), skin = new Color(0.78f, 0.78f, 0.82f),
                hair = new Color(0.05f, 0.05f, 0.07f), trousers = new Color(0.12f, 0.12f, 0.14f), height = 0.95f, longCoat = true
            }, "Wren");
            var h = f.Head;
            var hair = Mats.Toon(new Color(0.05f, 0.05f, 0.07f), null, 0.03f);
            var glow = Mats.Glow(new Color(0.45f, 0.85f, 1f), 3f);
            // a sleek bob, and the only tells: eyes with a little too much light in them, a lamp at the temple
            for (int s = -1; s <= 1; s += 2)
            {
                Build.Part(h, PrimitiveType.Sphere, new Vector3(s * 0.095f, 0.08f, -0.01f), new Vector3(0.07f, 0.17f, 0.2f), hair);
                Build.Part(h, PrimitiveType.Cube, new Vector3(s * 0.045f, 0.14f, 0.112f), new Vector3(0.04f, 0.012f, 0.01f), glow);
                Build.Part(h, PrimitiveType.Cube, new Vector3(s * 0.112f, 0.1f, 0.03f), new Vector3(0.004f, 0.12f, 0.004f), Mats.Toon(new Color(0.55f, 0.56f, 0.6f)));
            }
            Build.Part(h, PrimitiveType.Sphere, new Vector3(0.112f, 0.17f, 0.02f), Vector3.one * 0.018f, glow);
            Build.Part(h, PrimitiveType.Sphere, new Vector3(0, 0.22f, 0.07f), new Vector3(0.2f, 0.07f, 0.12f), hair, new Vector3(-20, 0, 0));   // fringe
            Build.Part(h, PrimitiveType.Cube, new Vector3(0, 0.06f, 0.11f), new Vector3(0.035f, 0.006f, 0.01f), Mats.Toon(new Color(0.45f, 0.12f, 0.14f)));

            var scarf = Mats.Toon(new Color(0.85f, 0.84f, 0.8f));
            Build.Part(f.Body, PrimitiveType.Cylinder, new Vector3(0, 1.58f, 0.01f), new Vector3(0.24f, 0.05f, 0.24f), scarf);
            return f;
        }

        IEnumerator TalkWren()
        {
            WrenShot();
            yield return Say("Wren", WrenLine());
            if (!metMara) yield break;
            yield return Choose("Wren", "Anything else?", new List<string> { "Read me the notebook.", "Keep the engine warm." });
            if (lastChoice == 0)
            {
                yield return Say("Wren", $"{ClueCount} clues of five. {(Extras > 0 ? $"{Extras} off the record. " : "")}{(CanDeduce ? "You could call it now. I wouldn't, yet." : "Not enough to call it.")}");
                yield return Say("Vane", "You're a comfort, Wren.");
                yield return Say("Wren", "I'm a filing cabinet with opinions.");
            }
            else yield return Say("Wren", "It is always warm. That's not the point of the expression.");
        }

        string WrenLine()
        {
            if (!metMara) return "Your client is outside the Blue Lantern, up the street on the left. Red dress. She's been checking her watch.";
            if (!askedPeople) return "She'll know who her brother talked to. Clients always know more than they say on the phone.";
            if (!haveTicket) return "The bartender, Ostrowski, has a ledger he doesn't keep on paper. Ask him about Teo's money.";
            if (!gilLied) return "There's a watchman at the harbor end. Gil. He's on the Trust's payroll, if that helps. It usually doesn't.";
            if (!sawGouges || !sawGate) return "The harbor sensors put the light near the end of the pier. And there's a tide gate in the sea wall nobody has opened since the Blank.";
            if (!gilConfessed) return "The watchman's heart rate went up eleven beats when you said Teo's name. He's lying. Give him a reason to stop.";
            return "Your band has been warm since the harbor lit up. Whatever you're going to do, the Graven's listening.";
        }

        // ---------------- the drive in ----------------
        IEnumerator OpeningDrive()
        {
            var D = City.DriveOrigin;
            float oldFog = RenderSettings.fogDensity;
            RenderSettings.fogDensity = 0.0075f;
            vaneCar = Car.Make(city.Root, D + new Vector3(-60, 0, -2.6f), 90, new Color(0.025f, 0.025f, 0.03f), true, "Vane's car");
            Build.PointLight(vaneCar.transform, new Vector3(0, 1.05f, 0.15f), new Color(1f, 0.7f, 0.4f), 1.8f, 1.1f);   // the dash lights their faces

            // Vane at the wheel, Wren beside him
            player.Scripted = true;
            player.Cc.enabled = false;
            player.transform.SetParent(vaneCar.transform, false);
            player.transform.localPosition = new Vector3(-0.42f, -0.48f, -0.42f);
            player.transform.localRotation = Quaternion.identity;
            var f = player.Figure;
            f.Seated = true;
            HandsOnWheel(f);
            wren = MakeWren(vaneCar.transform);
            wren.transform.localPosition = new Vector3(0.42f, -0.33f, -0.42f);
            wren.Seated = true;
            wren.Idle = Figure.Stance.Plain;

            bool driving = true;
            float speed = 17f;
            StartCoroutine(DriveLoop(() => driving, () => speed));
            Sound.I?.Engine(0.32f, 1f);
            Sound.I?.PlayMusic("noir", 0.32f);

            // 1. outside: the car comes at us down the causeway, the city a smear of light behind the rain
            orbit.CineAnchor = vaneCar.transform;
            Shot(new Vector3(-5.5f, 1.6f, 15f), new Vector3(0, 0.9f, 2f));
            cam.fieldOfView = 50;
            ui.Letterbox = 1;
            yield return Fade(0, 2.5f);
            yield return Narrate(
                "Halcyon. Forty years ago, the whole city woke up on the same morning and couldn't remember a thing.",
                "Nobody knows who built the towers. Nobody knows why it always rains. Most people have stopped asking.",
                "I find things for a living. Rings. Ledgers. Now and then, people.");

            // 2. inside: through the windshield, the two of them in the dash light
            Shot(new Vector3(0.05f, 1.28f, 1.7f), new Vector3(0, 1.18f, -0.45f));
            cam.fieldOfView = 45;
            yield return Wait(0.6f);
            yield return Say("Wren", "You're driving with your eyes closed again.");
            yield return Say("Vane", "I'm resting them. The road's straight.");
            yield return Say("Wren", "For another four hundred meters. Do you want the rundown, or would you rather hear it from the client?");
            yield return Say("Vane", "Go ahead.");
            Shot(new Vector3(-0.25f, 1.22f, 0.55f), new Vector3(0.42f, 1.28f, -0.42f));
            yield return Say("Wren", "Mara Quill. She sings at the Blue Lantern, on Harbor Street. She called at nine-forty.");
            yield return Say("Wren", "Her brother Teodor has been missing for three nights. She went to the police first. They asked her whether he'd been talking about Before.");
            yield return Say("Vane", "Had he?");
            yield return Say("Wren", "She hung up before I could ask. Her voice went up a third when I said the word.");

            // 3. he lights up, one hand on the wheel
            Shot(new Vector3(0.35f, 1.25f, 0.5f), new Vector3(-0.42f, 1.3f, -0.42f));
            smoke.InMouth = true;
            yield return Wait(0.3f);
            yield return smoke.LightUpCo();
            HandsOnWheel(f);
            yield return Say("Wren", "You told me you'd cut down.");
            yield return Say("Vane", "I said I'd think about it. I thought about it.");
            Shot(new Vector3(0.05f, 1.28f, 1.7f), new Vector3(0, 1.18f, -0.45f));
            yield return Say("Wren", "The harbor belongs to the Trust. Two people went missing there this year. Both cases were closed inside a day, with the Tower's stamp on them.");
            yield return Say("Vane", "Closed how?");
            yield return Say("Wren", "\"Left the city of their own accord.\" Both times. Word for word.");
            yield return Say("Vane", "Nobody leaves Halcyon.");
            yield return Say("Wren", "That's what I told the file. It didn't answer.");
            StartCoroutine(DragSoon(0.2f));
            yield return Say("Wren", "One more thing. The harbor's tide sensors logged a light under the water four nights running. Green and gold. Then nothing.");
            Shot(new Vector3(-0.25f, 1.22f, 0.55f), new Vector3(0.42f, 1.28f, -0.42f));
            yield return Say("Wren", "And your band's been warm since we crossed the city line. It does that near the water.");
            f.LinkGlow = 0.35f;
            yield return Say("Vane", "I know.");
            yield return Narrate("I looked at the band on my wrist. Brass, with a seam of amber light in it. I've had it as long as I've had a name.",
                                 "Somewhere out under that water was the other half of it. Forty meters of iron that answered when I called.");
            f.LinkGlow = 0;

            // 4. into town
            Shot(new Vector3(6f, 9f, -18f), new Vector3(0, 1f, 30f));
            yield return Wait(2.2f);
            yield return Fade(1, 0.9f);
            driving = false;
            RenderSettings.fogDensity = oldFog;
            orbit.CineAnchor = null;
            cam.fieldOfView = 55;

            // the car comes up Harbor Street and pulls in to the curb
            var startPos = new Vector3(-150f, 0, -2.6f);
            vaneCar.transform.SetPositionAndRotation(startPos, Quaternion.Euler(0, 90, 0));
            city.DriveSkyline.gameObject.SetActive(false);
            city.DriveRoot.gameObject.SetActive(false);
            Shot(new Vector3(-36f, 1.4f, 4.5f), new Vector3(-70f, 1.5f, -3f));
            cam.transform.position = orbit.CinePos;
            StartCoroutine(Fade(0, 1.5f));
            StartCoroutine(Card("HALCYON NOIR", $"Episode 1  —  Low Tide\n<size=20>{Game.Version}</size>", 2.6f));
            float dist = Vector3.Distance(startPos, city.CarStop);
            for (float t = 0; t < 1; t += Time.deltaTime / 7.5f)
            {
                float k = 1 - (1 - t) * (1 - t);     // ease out: it rolls in and settles
                var p = Vector3.Lerp(startPos, city.CarStop, k);
                p.z = Mathf.Lerp(-2.6f, city.CarStop.z, Mathf.SmoothStep(0, 1, Mathf.Clamp01((t - 0.55f) / 0.45f)));
                float yaw = 90 + Mathf.Sin(Mathf.Clamp01((t - 0.55f) / 0.45f) * Mathf.PI) * -7f;
                vaneCar.transform.SetPositionAndRotation(p, Quaternion.Euler(0, yaw, 0));
                vaneCar.Speed = dist / 7.5f * 2 * (1 - t);
                orbit.CineLook = Vector3.Lerp(orbit.CineLook, p + Vector3.up * 1.1f, Time.deltaTime * 3f);
                Sound.I?.Engine(0.32f, Mathf.Lerp(1.1f, 0.85f, t));
                yield return null;
            }
            vaneCar.Speed = 0;
            yield return Wait(0.8f);
            Sound.I?.Engine(0);
            foreach (var l in vaneCar.Headlights) if (l != null) l.intensity = 2.5f;

            // he gets out into the rain
            Shot(city.CarStop + new Vector3(3.2f, 1.5f, 4.2f), city.CarStop + new Vector3(-0.5f, 1.2f, 1.2f));
            Sound.I?.Play("door", 0.8f, 1f);
            for (float t = 0; t < 1; t += Time.deltaTime / 0.5f) { vaneCar.SetDoor(t); yield return null; }
            player.transform.SetParent(city.Root, true);
            f.Seated = false;
            f.ArmLPose = f.ArmRPose = null; f.ForeLBend = f.ForeRBend = -1;
            player.transform.SetPositionAndRotation(vaneCar.DriverDoorStep, Quaternion.Euler(0, 0, 0));
            yield return WalkVane(vaneCar.DriverDoorStep + new Vector3(0.6f, 0, 1.1f), 1.6f);
            Sound.I?.Play("door", 1f, 0.9f);
            for (float t = 1; t > 0; t -= Time.deltaTime / 0.25f) { vaneCar.SetDoor(t); yield return null; }
            vaneCar.SetDoor(0);
            player.FaceTowards(player.transform.position + new Vector3(1, 0, 0.6f));
            // the low shot: him, the coat, the cigarette, the towers going up into the rain
            var vp = player.transform.position;
            Shot(vp + new Vector3(2.6f, 0.45f, -1.2f), vp + new Vector3(0, 2.6f, 0.3f));
            smoke.InMouth = false;
            yield return Wait(0.6f);
            smoke.Drag();
            yield return Wait(1.6f);
            WrenShot();
            yield return Say("Wren", "I'll be here. Try to come back with the same number of teeth.");
            yield return Say("Vane", "I always come back.");
            yield return Say("Wren", "That isn't what I asked.");
            EndShot();
            yield return Letterbox(0, 0.8f);

            // Wren waits in the car; she can be talked to
            var it = new GameObject("Interact_wren").AddComponent<Interactable>();
            it.transform.SetParent(city.Root, false);
            it.transform.position = vaneCar.transform.TransformPoint(new Vector3(-1.2f, 0, -0.4f));
            it.Id = "wren"; it.Label = "Talk to Wren"; it.Radius = 2.4f;
            city.Interactables.Add(it);
            player.Scripted = false;
            player.Cc.enabled = true;
        }

        // Through the driver's window: Wren in the passenger seat, Vane leaning on the roof in the corner of frame.
        void WrenShot()
        {
            var c = vaneCar.transform;
            player.FaceTowards(wren.transform.position);
            Shot(c.TransformPoint(new Vector3(-0.9f, 1.4f, 1.9f)), c.TransformPoint(new Vector3(0.42f, 1.25f, -0.42f)));
        }

        void HandsOnWheel(Figure f)
        {
            f.ArmLPose = new Vector3(-58, 0, 12); f.ForeLBend = 38;
            f.ArmRPose = new Vector3(-58, 0, -12); f.ForeRBend = 38;
        }

        // Keeps the car moving down the endless causeway, a stretch at a time.
        IEnumerator DriveLoop(System.Func<bool> on, System.Func<float> speed)
        {
            var D = City.DriveOrigin;
            float sway = 0;
            while (on())
            {
                float dt = Time.deltaTime;
                var p = vaneCar.transform.position + Vector3.right * speed() * dt;
                if (p.x - D.x > City.DrivePeriod / 2) p.x -= City.DrivePeriod;
                sway += dt;
                p.z = D.z - 2.6f + Mathf.Sin(sway * 0.35f) * 0.25f;
                vaneCar.transform.position = p;
                vaneCar.transform.rotation = Quaternion.Euler(Mathf.Sin(sway * 7.1f) * 0.25f, 90 + Mathf.Cos(sway * 0.35f) * 0.6f, Mathf.Sin(sway * 5.3f) * 0.3f);
                vaneCar.Speed = speed();
                city.DriveSkyline.position = new Vector3(p.x, D.y, D.z);
                yield return null;
            }
        }
    }
}
