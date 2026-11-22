using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace HalcyonNoir
{
    public static class Game
    {
        public const string Version = "v0.0.03";
        public static bool Paused;
    }

    // Put this on any object to make a scene with another name boot the game.
    public class BootMarker : MonoBehaviour { }

    public static class Bootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            SceneManager.sceneLoaded -= OnLoaded;
            SceneManager.sceneLoaded += OnLoaded;
            TryStart(SceneManager.GetActiveScene());
        }

        static void OnLoaded(Scene s, LoadSceneMode m) { if (m == LoadSceneMode.Single) TryStart(s); }

        static void TryStart(Scene s)
        {
            if (Object.FindAnyObjectByType<GameDirector>() != null) return;
            if (s.name != "HalcyonNoir" && Object.FindAnyObjectByType<BootMarker>() == null) return;
            var go = new GameObject("Director");
            go.AddComponent<GameDirector>();
            if (DevArgs.ShotDir != null) go.AddComponent<DevShots>();
        }
    }

    // Command-line switches for automated smoke tests of a built player:
    //   -hn-fight            skip the story and start the boss fight (Sharp outcome)
    //   -hn-shots <dir>      save a screenshot every few seconds into <dir>
    //   -hn-quit <seconds>   quit after this many seconds
    public static class DevArgs
    {
        static string[] args;
        static string[] Args => args ??= System.Environment.GetCommandLineArgs();
        static int Index(string k) => System.Array.IndexOf(Args, k);
        static string Value(string k) { int i = Index(k); return i >= 0 && i + 1 < Args.Length ? Args[i + 1] : null; }
        public static bool SkipToFight => Index("-hn-fight") >= 0;
        public static string ShotDir => Value("-hn-shots");
        public static float QuitAfter => float.TryParse(Value("-hn-quit"), System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var f) ? f : 0;
    }

    public class DevShots : MonoBehaviour
    {
        IEnumerator Start()
        {
            System.IO.Directory.CreateDirectory(DevArgs.ShotDir);
            float quit = DevArgs.QuitAfter;
            int n = 0;
            while (true)
            {
                yield return new WaitForSecondsRealtime(3f);
                string path = System.IO.Path.Combine(DevArgs.ShotDir, $"shot_{n++:000}.png");
                ScreenCapture.CaptureScreenshot(path);
                Debug.Log($"[DevShots] {Time.realtimeSinceStartup:0.0}s fps~{1f / Mathf.Max(0.0001f, Time.smoothDeltaTime):0} -> {path}");
                if (quit > 0 && Time.realtimeSinceStartup > quit) { yield return null; Application.Quit(); }
            }
        }
    }

    // Keeps the camera behind the Graven, framing it and the enemy together.
    public class MechCamera : MonoBehaviour
    {
        public Transform A, B;
        float yawOff;
        Vector3 vel;

        void LateUpdate()
        {
            if (A == null || B == null) return;
            float dt = Time.unscaledDeltaTime;
            if (!Game.Paused) yawOff = Mathf.Clamp(yawOff + In.Look.x * 0.5f, -40, 40);
            yawOff = Mathf.Lerp(yawOff, 0, dt * 0.4f);
            var d = B.position - A.position; d.y = 0;
            var dir = d.sqrMagnitude > 1 ? d.normalized : A.forward;
            dir = Quaternion.Euler(0, yawOff, 0) * dir;
            var right = Vector3.Cross(Vector3.up, dir);
            // over-the-shoulder: the Graven sits left of center so the enemy stays readable past it
            var want = A.position - dir * 46f + Vector3.up * 21f + right * 17f;
            transform.position = Vector3.SmoothDamp(transform.position, want, ref vel, 0.25f, Mathf.Infinity, dt);
            var look = Vector3.Lerp(A.position + Vector3.up * 12, B.position + Vector3.up * 8, 0.55f);
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(look - transform.position), 1 - Mathf.Exp(-dt * 6));
            if (Fx.I != null) transform.position += transform.rotation * Fx.I.ShakeOffset;
        }
    }

    public class GameDirector : MonoBehaviour
    {
        UI ui;
        City city;
        Camera cam;
        OrbitCamera orbit;
        MechCamera mechCam;
        PlayerMotor player;
        GravenController graven;
        BossController boss;

        enum Phase { Story, Explore, Fight }
        Phase phase = Phase.Story;
        bool busy;              // a conversation or cutscene is running
        bool restartRequested;
        int outcome;            // 2 Sharp, 1 Shaken, 0 Lost
        int attempts;
        float fightStart;

        // case flags
        bool metMara, askedLight, askedPeople, askedWhy, haveTicket, sawGouges, sawGate, gilLied, gilConfessed;
        bool ostExtra;

        void Awake()
        {
            Game.Paused = false;
            Time.timeScale = 1;
            Application.targetFrameRate = 120;
            Mats.Init();

            // clear template leftovers so our own camera and moon are in charge
#pragma warning disable CS0618 // sort-mode overload is deprecated in 6.x but required on 6000.0
            foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None))
                if (l.type == LightType.Directional) Destroy(l.gameObject);
#pragma warning restore CS0618
            cam = Camera.main;
            if (cam == null)
            {
                cam = new GameObject("Main Camera").AddComponent<Camera>();
                cam.tag = "MainCamera";
                cam.gameObject.AddComponent<AudioListener>();
            }
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 1500f; cam.fieldOfView = 55;
            City.SetupAtmosphere(cam);

            gameObject.AddComponent<Sound>();
            gameObject.AddComponent<Fx>();
            ui = gameObject.AddComponent<UI>();

            city = new City();
            city.BuildStreet();
            city.BuildArena();
            City.MakeRain(cam.transform);

            player = PlayerMotor.Make(city.Root, city.PlayerSpawn, 90);
            orbit = cam.gameObject.AddComponent<OrbitCamera>();
            orbit.Target = player.transform;
            orbit.Yaw = 90;
            player.Cam = orbit;
            mechCam = cam.gameObject.AddComponent<MechCamera>();
            mechCam.enabled = false;

            ui.OnResume = () => SetPaused(false);
            ui.OnRestartFight = () => { restartRequested = true; SetPaused(false); };
            ui.OnQuit = Quit;

            ui.Black = 1;
            StartCoroutine(Run());
        }

        void Quit()
        {
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }

        void SetPaused(bool p)
        {
            Game.Paused = p;
            ui.PauseOpen = p;
            ui.CanRestartFight = p && phase == Phase.Fight && !busy;
            if (p) Sound.I?.MusicVolume(0.15f); else Sound.I?.MusicVolume(phase == Phase.Fight ? 0.5f : 0.4f);
            UpdateCursor();
        }

        void UpdateCursor()
        {
            bool free = Game.Paused || (ui.Choices != null && ui.Choices.Count > 0);
            Cursor.lockState = free ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = free;
        }

        void Update()
        {
            if (In.Pause) SetPaused(!Game.Paused);
            if (In.ToggleShading)
            {
                Mats.ToggleToon();
                ui.Toast(Mats.ToonOn ? "Toon shading on" : "Plain shading (F9 to switch back)");
            }
            UpdateCursor();
            orbit.Control = !Game.Paused && !busy;
            player.CanMove = !Game.Paused && !busy && phase == Phase.Explore;

            if (phase == Phase.Explore && !Game.Paused)
            {
                if (In.Notebook && !busy) ui.ShowNotebook = !ui.ShowNotebook;
                if (ui.ShowNotebook) { ui.Prompt = null; return; }
                if (!busy) Investigate();
            }
            else ui.Prompt = null;
        }

        // ---------------- helpers ----------------
        IEnumerator Wait(float s)
        {
            float t = 0;
            while (t < s) { if (!Game.Paused) t += Time.unscaledDeltaTime; yield return null; }
        }

        IEnumerator Fade(float to, float dur)
        {
            float from = ui.Black, t = 0;
            while (t < dur) { t += Time.unscaledDeltaTime; ui.Black = Mathf.Lerp(from, to, t / dur); yield return null; }
            ui.Black = to;
        }

        IEnumerator Letterbox(float to, float dur = 0.6f)
        {
            float from = ui.Letterbox, t = 0;
            while (t < dur) { t += Time.unscaledDeltaTime; ui.Letterbox = Mathf.SmoothStep(from, to, t / dur); yield return null; }
            ui.Letterbox = to;
        }

        IEnumerator Say(string speaker, string text)
        {
            ui.SetLine(speaker, text);
            if (!string.IsNullOrEmpty(speaker)) Sound.I?.Play("blip", 0.15f, speaker == "Vane" ? 0.8f : 1.1f);
            yield return null;
            while (true)
            {
                if (!Game.Paused && (In.Confirm || (DevArgs.SkipToFight && !ui.Typing && (ui.Choices == null || ui.Choices.Count == 0) && Time.frameCount % 150 == 0)))
                {
                    if (ui.Typing) ui.FinishTyping();
                    else break;
                }
                yield return null;
            }
            ui.ClearLine();
        }

        IEnumerator Narrate(params string[] lines) { foreach (var l in lines) yield return Say("", l); }

        int lastChoice;
        IEnumerator Choose(string speaker, string prompt, List<string> options)
        {
            ui.SetLine(speaker, prompt);
            ui.Choices = options;
            ui.Picked = -1;
            yield return null;
            while (true)
            {
                if (!Game.Paused)
                {
                    if (ui.Typing && In.Confirm) ui.FinishTyping();
                    int n = In.NumberPressed;
                    if (!ui.Typing && n >= 1 && n <= options.Count) { lastChoice = n - 1; break; }
                    if (ui.Picked >= 0) { lastChoice = ui.Picked; break; }
                }
                yield return null;
            }
            Sound.I?.Play("blip", 0.3f, 1.3f);
            ui.Choices = null;
            ui.ClearLine();
        }

        IEnumerator Card(string title, string sub, float hold)
        {
            ui.CardTitle = title; ui.CardSub = sub;
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / 0.8f) { ui.CardAlpha = t; yield return null; }
            ui.CardAlpha = 1;
            yield return Wait(hold);
            for (float t = 1; t > 0; t -= Time.unscaledDeltaTime / 0.8f) { ui.CardAlpha = t; yield return null; }
            ui.CardAlpha = 0;
        }

        void Shot(Vector3 pos, Vector3 look) { orbit.Cinematic = true; orbit.CinePos = pos; orbit.CineLook = look; }
        void EndShot() { orbit.Cinematic = false; }

        // An over-the-shoulder shot for a conversation with someone.
        void TalkShot(Figure who)
        {
            player.FaceTowards(who.transform.position);
            var d = who.transform.position - player.transform.position; d.y = 0;
            var face = Quaternion.LookRotation(-d.normalized);
            who.transform.rotation = face;
            var dir = d.normalized;
            var right = Vector3.Cross(Vector3.up, dir);
            Shot(player.transform.position - dir * 1.6f + right * 0.8f + Vector3.up * 1.75f, who.transform.position + Vector3.up * 1.6f);
        }

        void Clue(string title, string body)
        {
            ui.NotebookEntries.Add((title, body));
            Sound.I?.Play("clue", 0.6f);
            ui.Toast("Notebook: " + title + "   [Tab]");
            UpdateFooter();
        }

        int ClueCount => (askedLight ? 1 : 0) + (haveTicket ? 1 : 0) + (sawGouges ? 1 : 0) + (sawGate ? 1 : 0) + (gilConfessed ? 1 : 0);
        bool CanDeduce => metMara && (gilLied || gilConfessed);

        void UpdateFooter()
        {
            ui.NotebookFooter = $"Clues found: {ClueCount} of 5." + (CanDeduce ? "   You can make your deduction at the end of the pier. You only get one chance." : "");
        }

        void SetObjective()
        {
            if (!metMara) ui.Objective = "Meet the client outside the Blue Lantern.";
            else if (!CanDeduce) ui.Objective = "Find out where Teodor Quill went. Ask around the block.";
            else if (ClueCount < 5) ui.Objective = "When you're sure, stand at the end of the pier and think it through.\n<size=20>One chance. You may want to look around more first.</size>";
            else ui.Objective = "You have everything. Stand at the end of the pier and think it through.";
            var g = Find("gouges");
            if (g != null) g.Label = sawGouges && CanDeduce ? "Think it through  (no going back)" : "Examine the pier";
            if (g != null && g.Marker != null) g.Marker.SetActive(!sawGouges || CanDeduce);
            var gate = Find("gate");
            if (gate != null && gate.Marker != null) gate.Marker.SetActive(!sawGate);
        }

        Interactable Find(string id) { foreach (var i in city.Interactables) if (i.Id == id) return i; return null; }

        void Investigate()
        {
            Interactable best = null; float bestD = 999;
            var p = player.transform.position;
            foreach (var it in city.Interactables)
            {
                if (!it.Enabled) continue;
                var d = it.transform.position - p; d.y = 0;
                float m = d.magnitude;
                if (m < it.Radius && m < bestD) { best = it; bestD = m; }
            }
            ui.Prompt = best != null ? "[E]  " + best.Label : null;
            if (best != null && In.Interact) StartCoroutine(Interact(best.Id));
        }

        IEnumerator Interact(string id)
        {
            busy = true;
            ui.Prompt = null;
            ui.ShowNotebook = false;
            yield return Letterbox(1, 0.4f);
            switch (id)
            {
                case "mara": yield return TalkMara(); break;
                case "ostrowski": yield return TalkOstrowski(); break;
                case "gil": yield return TalkGil(); break;
                case "gate": yield return ExamineGate(); break;
                case "gouges":
                    if (sawGouges && CanDeduce) { yield return Deduction(); yield break; }
                    yield return ExamineGouges();
                    break;
            }
            EndShot();
            yield return Letterbox(0, 0.4f);
            SetObjective();
            busy = false;
        }

        // ---------------- the episode ----------------
        IEnumerator Run()
        {
            Sound.I?.Ambience("rain", 0.55f);
            busy = true;
            if (DevArgs.SkipToFight)
            {
                outcome = 2; ui.Sharp = true;
                yield return StartFight();
                yield break;
            }
            Sound.I?.PlayMusic("noir", 0.4f);
            yield return Wait(0.8f);
            yield return Narrate(
                "Halcyon. Forty years ago, the whole city woke up on the same morning and couldn't remember a thing.",
                "Nobody knows who built the towers. Nobody knows why it always rains. Most people have stopped asking.",
                "I find things for a living. Rings. Ledgers. Now and then, people.",
                "That night it was a woman in red, and the brother she couldn't find.");
            ui.Letterbox = 1;
            Shot(city.PlayerSpawn + new Vector3(-6, 6, -5), city.PlayerSpawn + new Vector3(12, 3, 4));
            cam.transform.position = orbit.CinePos;
            StartCoroutine(Fade(0, 2.5f));
            yield return Card("HALCYON NOIR", "Episode 1  —  Low Tide", 2.5f);
            EndShot();
            yield return Letterbox(0, 0.8f);
            phase = Phase.Explore;
            busy = false;
            SetObjective();
            UpdateFooter();
            ui.Toast("WASD move · Mouse look · Shift run · E interact · Tab notebook · Esc pause", new Color(0.85f, 0.85f, 0.85f));
            // the rest of the investigation is driven by Update/Interact until the deduction
        }

        IEnumerator TalkMara()
        {
            var mara = city.People["mara"];
            TalkShot(mara);
            if (!metMara)
            {
                yield return Say("Mara", "You're Vane. You're late.");
                yield return Say("Vane", "The rain was early.");
                yield return Say("Mara", "My brother. Teodor. Three nights now. He's never been gone three nights.");
                yield return Say("Vane", "People go missing in this city all the time. Most of them want to.");
                yield return Say("Mara", "Not Teo. A week ago he came home soaked to the knees and said he remembered something. From before.");
                yield return Narrate("Nobody remembers anything from before. Saying you do is the quickest way to get a visit from the Trust.");
                metMara = true;
                ui.NotebookEntries.Add(("The client", "Mara Quill, singer at the Blue Lantern. Her brother Teodor has been missing three nights. A week ago he said he remembered something from before the Blank."));
                Sound.I?.Play("clue", 0.4f);
            }
            while (true)
            {
                var opts = new List<string>(); var keys = new List<string>();
                if (!askedLight) { opts.Add("What did he remember?"); keys.Add("light"); }
                if (!askedPeople) { opts.Add("Who did he talk to?"); keys.Add("people"); }
                if (!askedWhy) { opts.Add("Why come to me and not the police?"); keys.Add("why"); }
                opts.Add(askedLight && askedPeople ? "I'll find him." : "That's enough for now."); keys.Add("bye");
                yield return Choose("Mara", metMara && askedLight && askedPeople && askedWhy ? "Please. Find him." : "Ask what you need to ask.", opts);
                string k = keys[lastChoice];
                if (k == "light")
                {
                    askedLight = true;
                    yield return Say("Mara", "A light. Out on the water, turning, the way a lighthouse turns. He said it was waiting for him.");
                    yield return Say("Mara", "He drew this. Then he found a photograph that matched it. He wouldn't tell me where.");
                    yield return Narrate("A lighthouse on a rocky point. Halcyon has no lighthouse. No rocky point, either.",
                                         "On the back, in pencil, in a hand that was trying not to shake: \"It's still lit.\"");
                    Clue("The photograph", "A lighthouse on a rocky point. Halcyon has no lighthouse. On the back: \"It's still lit.\" Teo said a light on the water was waiting for him.");
                }
                else if (k == "people")
                {
                    askedPeople = true;
                    yield return Say("Mara", "Ostrowski, behind the bar. Teo drank here when he had money, and borrowed when he didn't.");
                    yield return Say("Mara", "And the night watchman down at the harbor. Gil. Teo walked the piers every night since he started remembering.");
                    ui.NotebookEntries.Add(("Leads", "Ostrowski, the bartender at the Blue Lantern.\nGil, the harbor watchman. Teo walked the piers every night."));
                    UpdateFooter();
                }
                else if (k == "why")
                {
                    askedWhy = true;
                    yield return Say("Mara", "I went to the police. They asked me whether he'd been talking about Before.");
                    yield return Say("Mara", "I said no. They wrote something down anyway. Then they stopped returning my calls.");
                    yield return Say("Vane", "Then we'd better find him before they remember to.");
                }
                else
                {
                    yield return Say("Mara", askedLight && askedPeople ? "Find him before they do, Mr. Vane." : "I'll be here. I'm always here.");
                    break;
                }
            }
        }

        IEnumerator TalkOstrowski()
        {
            var ost = city.People["ostrowski"];
            TalkShot(ost);
            if (!metMara)
            {
                yield return Say("Ostrowski", "If you're here for the singer, she's by the door. She's been watching the street all night.");
                yield break;
            }
            if (!haveTicket)
            {
                yield return Say("Ostrowski", "Mara's detective. She said you'd come.");
                yield return Say("Vane", "Teodor Quill.");
                yield return Say("Ostrowski", "Good kid. Bad with money.");
                yield return Narrate("He took a long drag and let the smoke decide how much to tell me.");
                yield return Say("Ostrowski", "Four days back he pawned something with me. A key. Brass, heavy, old. Stamped with a wave.");
                yield return Say("Vane", "You run a pawn shop now?");
                yield return Say("Ostrowski", "I run a bar. People pay how they pay.");
                yield return Say("Ostrowski", "The night he disappeared he came back with every coin he had and bought it back. Hands shaking. Wouldn't say what it opened.");
                yield return Narrate("The ticket was still in the drawer. \"One key, brass, wave mark.\" Teo's signature was barely a signature.");
                haveTicket = true;
                Clue("The pawn ticket", "Teo pawned an old brass key stamped with a wave, then bought it back the night he vanished. Hands shaking. Wouldn't say what it opened.");
            }
            var opts = new List<string> { "Did he ever talk about the water?", "Thanks." };
            if (ostExtra) opts.RemoveAt(0);
            yield return Choose("Ostrowski", "Anything else? I've got glasses to dry.", opts);
            if (!ostExtra && lastChoice == 0)
            {
                ostExtra = true;
                yield return Say("Ostrowski", "He asked me once if I ever dreamed about the sea.");
                yield return Say("Ostrowski", "I told him nobody in Halcyon dreams about anything. He looked at me like I'd lied to him.");
            }
        }

        IEnumerator TalkGil()
        {
            var gil = city.People["gil"];
            TalkShot(gil);
            if (gilConfessed)
            {
                yield return Say("Gil", "I told you what I saw. Now leave me out of it.");
                yield break;
            }
            if (!gilLied)
            {
                yield return Say("Gil", "Pier's closed. Go home.");
                yield return Say("Vane", "I'm looking for Teodor Quill.");
                yield return Say("Gil", "Never heard of him.");
                yield return Narrate("He'd heard of him. He looked at the water when he said it.");
                yield return Say("Gil", "...Fine. The kid. He got on a fishing boat three nights ago. Heading up the coast. Happy?");
                gilLied = true;
                ui.NotebookEntries.Add(("Gil's story", "The watchman says Teo left on a fishing boat three nights ago. He looked at the water when he said it. He's hiding something."));
                Sound.I?.Play("clue", 0.4f);
                UpdateFooter();
            }
            while (true)
            {
                var opts = new List<string>(); var keys = new List<string>();
                opts.Add("A fishing boat. In this weather."); keys.Add("press");
                if (sawGouges) { opts.Add("Then what left those marks on the pier?"); keys.Add("gouges"); }
                if (sawGate && haveTicket) { opts.Add("Somebody opened the tide gate. With a key."); keys.Add("gate"); }
                opts.Add("Thanks for your time."); keys.Add("bye");
                yield return Choose("Gil", "What else do you want?", opts);
                string k = keys[lastChoice];
                if (k == "press")
                {
                    yield return Say("Gil", "That's what I said. Boats go out. Boats come back. Sometimes they don't.");
                    yield return Narrate("He wasn't going to give me any more on that. Not without something to put in front of him.");
                }
                else if (k == "gate")
                {
                    yield return Say("Gil", "That gate's been rusted shut since the Blank. Everybody knows that.");
                    yield return Narrate("He said it to the gate, not to me. Close. Not close enough.");
                }
                else if (k == "gouges")
                {
                    yield return Narrate("For a while the only sound was the rain on his hat.");
                    yield return Say("Gil", "...You saw those.");
                    yield return Say("Gil", "He had a key. He opened the tide gate. Forty years that thing's been shut, and he just opened it.");
                    yield return Say("Gil", "The water lit up. Green and gold, like a lamp under the waves. And he walked in. Didn't swim. Walked. Down the steps like he was going home.");
                    yield return Say("Gil", "Next morning there were those marks, and the gate was shut again. I didn't call the Trust. I didn't call anybody.");
                    yield return Say("Vane", "Why lie to me?");
                    yield return Say("Gil", "Because people who see things like that end up in the Tower. I'd like to keep my job. And my head.");
                    gilConfessed = true;
                    Clue("Gil's confession", "Teo opened the tide gate with a key. The water lit up green and gold, and he walked into it, down the steps \"like he was going home.\" The next morning: the marks, and the gate shut again.");
                    break;
                }
                else break;
            }
        }

        IEnumerator ExamineGouges()
        {
            var g = Find("gouges").transform.position;
            Shot(g + new Vector3(-3.5f, 2.6f, 2.2f), g + new Vector3(1, 0, 0));
            yield return Wait(0.6f);
            yield return Narrate(
                "Four grooves in the planks, deep as my arm, running straight to the edge.",
                "The wood was scorched black along each one. Something heavy had come out of the water here. Or gone back into it.",
                "Whatever made them was bigger than a truck. And it walked on more legs than it needed.");
            if (!sawGouges)
            {
                sawGouges = true;
                Clue("Gouges on the pier", "Four scorched grooves, deep as my arm, running down into the water. Something huge came out here, or went back in.");
            }
        }

        IEnumerator ExamineGate()
        {
            var g = Find("gate").transform.position;
            Shot(g + new Vector3(2.5f, 2.2f, 3f), g + new Vector3(0, 1.4f, -1.5f));
            yield return Wait(0.6f);
            yield return Narrate(
                "The tide gate. Iron, taller than a house, rusted shut since the Blank. Everybody in the harbor says so.",
                "But the lock had been scraped clean. Fresh metal, bright as a new coin.");
            if (haveTicket) yield return Narrate("Above the keyhole, a mark stamped into the iron. A wave. The same wave as on Teo's key.");
            else yield return Narrate("Above the keyhole, a mark stamped into the iron. A wave.");
            if (!sawGate)
            {
                sawGate = true;
                Clue("The tide gate", "Rusted shut for forty years, but the lock has been scraped clean, recently. The keyhole is stamped with a wave." + (haveTicket ? " Same as Teo's key." : ""));
            }
        }

        IEnumerator Deduction()
        {
            // deduction is one-shot; deductionState tracks it
            ui.Objective = null;
            var g = Find("gouges");
            g.Enabled = false;
            if (g.Marker != null) g.Marker.SetActive(false);
            var p = player.transform.position;
            player.FaceTowards(p + Vector3.right * 10);
            Shot(p + new Vector3(-4, 2.4f, 3), city.HarborGlowPos + Vector3.up * 4);
            Sound.I?.MusicVolume(0.2f);
            yield return Narrate("I stood at the end of the pier and let the rain do the talking.",
                                 "I'd get one chance to be right. The harbor doesn't do second chances.");

            yield return Choose("", "Where did Teodor go?", new List<string> {
                "He left the city on a fishing boat, like Gil said.",
                "The Trust took him, and the watchman is covering for them.",
                "He opened the tide gate with the key and walked into the water." });
            bool q1 = lastChoice == 2;
            yield return Choose("", "What was the light in the water?", new List<string> {
                "A smuggler's lantern, signaling a boat.",
                "Something from before the Blank. And it's awake.",
                "Nothing. A tired man seeing things in the rain." });
            bool q2 = lastChoice == 1;
            outcome = (q1 ? 1 : 0) + (q2 ? 1 : 0);
            ui.Sharp = outcome == 2;

            if (outcome == 2)
                yield return Narrate("The key. The gate. The light. It wasn't a boat and it wasn't the Trust.",
                                     "Teo went down to meet something that had been waiting forty years. And whatever it was, its heart would be where the light was.");
            else if (outcome == 1)
                yield return Narrate("Some of it fit. Some of it didn't. I had the shape of the thing, but not its face.");
            else
                yield return Narrate("I told myself a story that made sense, and almost believed it.", "The harbor had other plans.");

            // the light answers
            Sound.I?.MusicVolume(0f);
            Sound.I?.Play("rumble", 1f, 0.7f);
            Fx.I?.Shake(0.6f, 3f);
            float t = 0;
            var glowMat = city.HarborGlow.GetComponent<Renderer>().sharedMaterial;
            while (t < 2.5f)
            {
                t += Time.unscaledDeltaTime;
                float k = t / 2.5f;
                city.HarborLight.intensity = Mathf.Lerp(0.3f, 9f, k);
                city.HarborLight.range = Mathf.Lerp(40, 120, k);
                Mats.SetGlowColor(glowMat, new Color(0.55f, 0.9f, 0.45f) * Mathf.Lerp(1f, 6f, k));
                yield return null;
            }
            Sound.I?.Play("siren", 0.5f);
            yield return Narrate("Then the harbor lit up from underneath. Green and gold, the color Gil was too scared to say twice.");
            var gil = city.People["gil"];
            Shot(gil.transform.position + new Vector3(-2.5f, 1.8f, -2), gil.transform.position + Vector3.up * 1.5f);
            gil.transform.rotation = Quaternion.LookRotation(Vector3.right);
            yield return Say("Gil", "No. No, no, no. Not again.");
            Shot(p + new Vector3(-3, 1.5f, 0), city.HarborGlowPos + Vector3.up * 30);
            Sound.I?.Play("roar", 0.7f, 0.6f);
            Fx.I?.Shake(1.2f, 2.5f);
            yield return Narrate("Something was standing up out there. Something the size of a building, with a lantern where its heart should be.");
            yield return Say("Vane", "Graven. Wake up.");
            yield return Narrate("I've never asked why it answers to me. Some questions you don't ask when the answer is a hundred feet tall.");

            // summon
            float hold = 0;
            while (hold < 1)
            {
                if (!Game.Paused)
                {
                    if (In.SummonHeld) hold += Time.unscaledDeltaTime / 1.4f;
                    else hold = Mathf.Max(0, hold - Time.unscaledDeltaTime);
                }
                int bars = Mathf.RoundToInt(hold * 12);
                ui.HintLine = "Hold  [G]  to call the Graven     " + new string('|', bars) + new string('.', 12 - bars);
                if (Random.value < hold * 0.2f) Fx.I?.Shake(0.3f + hold, 0.3f);
                yield return null;
            }
            ui.HintLine = null;
            Sound.I?.Play("bigstep", 1f, 0.6f);
            Sound.I?.Play("steam", 1f, 0.7f);
            Fx.I?.Shake(3f, 1f);
            Fx.I?.Flash(new Color(1f, 0.7f, 0.3f, 0.6f), 0.5f);
            yield return Fade(1, 0.8f);
            yield return Wait(0.6f);
            yield return StartFight();
        }

        IEnumerator StartFight()
        {
            phase = Phase.Fight;
            player.gameObject.SetActive(false);
            ui.Objective = null;
            float hpMult = outcome == 2 ? 1f : outcome == 1 ? 0.9f : 0.8f;

            graven = GravenController.Make(city.GravenSpawn, Quaternion.LookRotation(Vector3.right));
            boss = BossController.Make(city.BossSpawn + Vector3.down * 26, Quaternion.LookRotation(Vector3.left));
            graven.Boss = boss;
            graven.Sharp = outcome == 2;
            graven.Controllable = false;
            graven.ResetForFight(hpMult);
            boss.Target = graven;
            boss.SetSharp(outcome == 2);
            boss.ResetForFight();
            graven.OnDeath = () => { };
            boss.OnPhaseChange = () => StartCoroutine(PhaseLine(boss.Phase));
            ui.Graven = graven; ui.Boss = boss;

            // the Tidewarden rises out of the harbor
            busy = true;
            orbit.enabled = true;
            mechCam.enabled = false;
            Shot(City.Arena + new Vector3(-70, 10, -40), City.Arena + new Vector3(40, 14, 0));
            cam.transform.position = orbit.CinePos;
            Sound.I?.PlayMusic("fight", 0.5f);
            StartCoroutine(Fade(0, 1.2f));
            yield return Letterbox(1, 0.1f);
            Vector3 from = boss.transform.position, to = City.Arena + new Vector3(58, 0, 0);
            float t = 0;
            Sound.I?.Play("rumble", 1f, 0.6f);
            while (t < 4.5f)
            {
                t += Time.unscaledDeltaTime;
                float k = Mathf.SmoothStep(0, 1, t / 4.5f);
                boss.transform.position = Vector3.Lerp(from, to, k);
                if (Random.value < 0.3f) Fx.I?.Splash(boss.transform.position + new Vector3(Random.Range(-12, 12), 0, Random.Range(-10, 10)), 12, 4);
                Fx.I?.Shake(0.5f, 0.2f);
                if (t > 1.6f) orbit.CineLook = boss.transform.position + Vector3.up * 10;
                yield return null;
            }
            // it knows the Graven
            Shot(graven.transform.position + new Vector3(-14, 14, -22), boss.CorePos);
            yield return Wait(0.8f);
            yield return Narrate("It stopped. Its lantern dimmed and brightened, slow, like it was trying to place a face.",
                                 "For a moment it just looked at the Graven, the way a dog looks at someone who left a long time ago.",
                                 "Then it remembered what it was for.");
            Shot(City.Arena + new Vector3(-70, 10, -40), boss.transform.position + Vector3.up * 10);
            Sound.I?.Play("roar", 1f, 0.6f);
            Fx.I?.Shake(2f, 1.2f);
            yield return Card("THE TIDEWARDEN", "A Relic.  It has been guarding the tide gate for forty years.", 1.6f);
            yield return Letterbox(0, 0.5f);
            EndShot();
            orbit.enabled = false;
            mechCam.A = graven.transform; mechCam.B = boss.transform;
            mechCam.enabled = true;
            ui.MechHud = true;
            busy = false;
            yield return Fight();
        }

        IEnumerator PhaseLine(int p)
        {
            if (p == 2) ui.Toast("Its lantern burns brighter. It's faster now.", new Color(0.5f, 0.9f, 0.95f));
            if (p == 3) ui.Toast("LOW TIDE — the harbor drains toward it. Watch for the wave.", new Color(1f, 0.4f, 0.3f));
            yield break;
        }

        void ResetFight()
        {
            attempts++;
            float hpMult = outcome == 2 ? 1f : outcome == 1 ? 0.9f : 0.8f;
            var cc = graven.GetComponent<CharacterController>();
            cc.enabled = false;
            graven.transform.SetPositionAndRotation(city.GravenSpawn, Quaternion.LookRotation(Vector3.right));
            cc.enabled = true;
            graven.ResetForFight(hpMult);
            boss.transform.SetPositionAndRotation(City.Arena + new Vector3(40, 0, 0), Quaternion.LookRotation(Vector3.left));
            boss.ResetForFight();
            Fx.I.BaseTimeScale = 1;
            Sound.I?.PlayMusic("fight", 0.5f);
        }

        IEnumerator Fight()
        {
            while (true)
            {
                fightStart = Time.time;
                boss.Active = true;
                graven.Controllable = true;
                ui.HintLine = "Amber warnings: guard [Shift] or dodge [Space].  Red: dodge only.  Break its posture, then hit the core.";
                bool hintCleared = false;
                bool lost = false;
                while (true)
                {
                    if (!hintCleared && Time.time - fightStart > 14) { ui.HintLine = null; hintCleared = true; }
                    if (restartRequested) { restartRequested = false; ResetFight(); fightStart = Time.time; hintCleared = true; ui.HintLine = null; }
                    if (graven.Dead) { lost = true; break; }
                    if (!Game.Paused && boss.CanFinish && In.Finisher) break;
                    yield return null;
                }
                ui.HintLine = null;
                if (!lost) { yield return Finisher(); yield break; }

                // defeat
                busy = true;
                boss.Active = false;
                graven.Controllable = false;
                Fx.I.BaseTimeScale = 0.3f;
                Sound.I?.MusicVolume(0.1f);
                yield return Wait(1.5f);
                Fx.I.BaseTimeScale = 1;
                ui.MechHud = false;
                yield return Fade(0.7f, 0.8f);
                yield return Narrate("The Graven went down in the shallows, and the Tidewarden went back to waiting.");
                yield return Choose("", "It isn't over until I say so.", new List<string> { "Get up. Try again.", "Quit" });
                if (lastChoice == 1) { Quit(); yield break; }
                ResetFight();
                yield return Fade(0, 0.6f);
                ui.MechHud = true;
                busy = false;
            }
        }

        IEnumerator Finisher()
        {
            busy = true;
            boss.Active = false;
            graven.Controllable = false;
            ui.MechHud = false;
            graven.BeginFinisher();
            mechCam.enabled = false;
            orbit.enabled = true;
            var gp = graven.transform.position;
            var side = Vector3.Cross(Vector3.up, (boss.transform.position - gp).normalized);
            Shot(gp + side * 30 + Vector3.up * 8 + (boss.transform.position - gp) * 0.5f, Vector3.Lerp(gp, boss.transform.position, 0.5f) + Vector3.up * 10);
            cam.transform.position = orbit.CinePos;
            yield return Letterbox(1, 0.3f);
            Sound.I?.Play("charge", 1f, 0.5f);
            Sound.I?.MusicVolume(0f);
            Fx.I?.Steam(graven.FistPos(false), 40, 3);
            yield return Wait(0.9f);
            graven.FinisherPunch();
            Sound.I?.Play("whoosh", 1f, 0.4f);
            yield return Wait(0.18f);
            boss.Die();
            Fx.I?.Flash(new Color(1f, 0.95f, 0.85f, 0.9f), 0.6f);
            Fx.I?.Shake(4f, 1.5f);
            Fx.I?.Sparks(boss.CorePos, new Color(0.6f, 1f, 1f), 150, 6);
            Fx.I?.Debris(boss.CorePos, 60, 8);
            Fx.I?.Steam(boss.CorePos, 60, 8);
            Sound.I?.Play("impact", 1f, 0.5f);
            Sound.I?.Play("clang", 1f, 0.4f);
            Fx.I.BaseTimeScale = 0.15f;
            yield return Wait(1.2f);
            Fx.I.BaseTimeScale = 1;
            Sound.I?.Play("roar", 0.8f, 0.4f);
            yield return Wait(2f);
            graven.EndFinisher();
            yield return Fade(1, 1.5f);
            yield return Epilogue();
        }

        IEnumerator Epilogue()
        {
            ui.Graven = null; ui.Boss = null;
            Sound.I?.PlayMusic("noir", 0.35f);
            Sound.I?.Ambience("rain", 0.4f);
            yield return Wait(0.8f);
            yield return Narrate(
                "When it was over, the harbor went quiet. The Tidewarden lay in the shallows like a wreck that had always been there.",
                "Inside its core, where the light had been, I found a lens. Brass and glass. The kind that belongs at the top of a lighthouse.",
                "When I touched it, it spoke.");
            yield return Say("Teodor", "Mara... it's still lit. There's another city under the water. I'm going to see it.");
            Sound.I?.Play("rumble", 0.3f, 1.6f);
            yield return Narrate("The lens crackled. Then another voice came out of it. Older. Flat as a ledger.");
            yield return Say("Unknown voice", "...Warden to Graven. The gate is open. Come home.");
            yield return Narrate("Nobody had ever said that name but me.",
                                 "Later, back in the cockpit, I found it. The same wave mark, stamped into the brass above the controls.",
                                 "It was worn smooth, like someone had touched it for luck. Many times. Not me.");

            // back on the street
            phase = Phase.Story;
            graven.gameObject.SetActive(false);
            boss.gameObject.SetActive(false);
            player.gameObject.SetActive(true);
            var mara = city.People["mara"];
            var cc = player.Cc; cc.enabled = false;
            player.transform.position = mara.transform.position + new Vector3(0, 0, -1.8f);
            cc.enabled = true;
            city.HarborLight.intensity = 0.3f;
            ui.Letterbox = 1;
            TalkShot(mara);
            cam.transform.position = orbit.CinePos;
            yield return Fade(0, 1.5f);
            yield return Say("Mara", "That's his voice.");
            yield return Say("Vane", "He's alive. Somewhere down there.");
            yield return Say("Mara", "Then you're not done.");
            yield return Say("Vane", "No. I don't think anybody is.");
            yield return Narrate("Forty years this city has been forgetting. That night, for the first time, something remembered back.");
            yield return Fade(1, 2f);
            string rank = outcome == 2 ? "Sharp" : outcome == 1 ? "Shaken" : "Lost";
            yield return Card("END OF EPISODE 1", $"Next:  The Lighthouse That Wasn't\n\n<size=24>Deduction: {rank}    Retries: {attempts}    {Game.Version}</size>", 4f);
            ui.CardTitle = "HALCYON NOIR"; ui.CardSub = "Press any key to play again"; ui.CardAlpha = 1;
            while (!In.AnyKey) yield return null;
            Game.Paused = false;
            Time.timeScale = 1;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex >= 0 ? SceneManager.GetActiveScene().name : "HalcyonNoir");
        }

        void OnDestroy()
        {
            Game.Paused = false;
            Time.timeScale = 1;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
    }
}
