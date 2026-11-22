using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // Things to do on foot besides talking: the Trust's men jump Vane on the street once he's been
    // asking at the harbor, and the tide gate's lock can be picked. Each one, done well, turns up a lead
    // "off the record". Each lead strengthens the link with the Graven (+8% hull in the fight).
    public partial class GameDirector
    {
        bool ambushDone, trustCard, gateOpened, teoSketch;
        int Extras => (trustCard ? 1 : 0) + (teoSketch ? 1 : 0);
        float LinkSync => 1f + 0.08f * Extras;

        void ResetVanePose()
        {
            var f = player.Figure;
            f.ArmLPose = f.ArmRPose = f.BodyPose = null;
            f.ForeLBend = f.ForeRBend = -1;
            f.Seated = false;
            f.LinkGlow = 0;
            f.Speed01 = 0;
            player.transform.localScale = Vector3.one;
            player.EndCombat();
        }

        // ---------------- the ambush ----------------
        // Once Gil has lied to him, the Trust knows Vane's been asking. The next time he walks back up
        // the street from the harbor, they're waiting.
        bool ShouldAmbush() => !ambushDone && gilLied && player.transform.position.x < 22f && player.transform.position.x > -40f;

        IEnumerator Ambush()
        {
            ambushDone = true;
            busy = true;
            ui.Prompt = null;
            ui.ShowNotebook = false;
            var p = player.transform.position;
            float zSide = p.z >= 0 ? -1 : 1;  // they come from across the street
            Brawl.All.Clear();
            var leader = Thug.Make(city.Root, new Vector3(p.x - 5.5f, 0, Mathf.Clamp(p.z + zSide * 1.5f, -6, 6)), 90, "Trust man", 1.08f);
            var a = Thug.Make(city.Root, new Vector3(p.x - 4f, 0, Mathf.Clamp(p.z - zSide * 2.5f, -6, 6)), 90, "Trust man", 1.0f);
            var b = Thug.Make(city.Root, new Vector3(p.x + 5f, 0, Mathf.Clamp(p.z + zSide * 2f, -6, 6)), -90, "Trust man", 1.03f);
            var gang = new List<Thug> { leader, a, b };
            foreach (var t in gang) { t.Target = player; t.Active = false; Brawl.All.Add(t); }
            leader.Damage = 16; leader.Hp = leader.MaxHp = 75; leader.WindupTime = 0.7f;
            b.WindupTime = 0.5f;

            yield return Letterbox(1, 0.4f);
            Sound.I?.MusicVolume(0.15f);
            TalkShot(leader.Figure);
            yield return Wait(0.5f);
            yield return Say("Trust man", "Mr. Vane. Nice night for a walk.");
            yield return Say("Vane", "It's raining.");
            yield return Say("Trust man", "It's always raining. The Trust would like you to stop asking about the harbor.");
            yield return Say("Vane", "The Trust can write me a letter.");
            yield return Say("Trust man", "This is the letter.");
            EndShot();
            yield return Letterbox(0, 0.4f);

            // fight
            Sound.I?.PlayMusic("fight", 0.32f);
            phase = Phase.Brawl;
            float oldDist = orbit.Distance;
            orbit.Distance = 5.6f;
            player.BeginCombat();
            ui.Brawler = player; ui.BrawlFoes = gang;
            Thug.ResetTokens();
            foreach (var t in gang) t.Active = true;
            ui.Objective = null;
            ui.Toast("Three of them. Watch for the glint on a fist — that's the swing coming.", new Color(0.85f, 0.85f, 0.85f));
            busy = false;
            bool won = false;
            while (true)
            {
                if (player.Down) break;
                bool all = true;
                foreach (var t in gang) if (!t.IsDown) all = false;
                if (all) { won = true; break; }
                yield return null;
            }
            busy = true;
            foreach (var t in gang) t.Active = false;
            yield return Wait(won ? 0.9f : 1.4f);
            ui.Brawler = null; ui.BrawlFoes = null;
            orbit.Distance = oldDist;
            Sound.I?.PlayMusic("noir", 0.4f);
            yield return Letterbox(1, 0.4f);

            if (won)
            {
                Shot(leader.transform.position + new Vector3(-2.2f, 1.6f, 1.8f), leader.transform.position + Vector3.up * 0.4f);
                player.EndCombat();
                yield return Narrate("They'd be back. Men like that always are. But not tonight.",
                                     "The big one had a card in his breast pocket. Trust stock, pressed, with the Tower's seal in the corner.",
                                     "HARBOR GATE. OBSERVE ONLY. Q. — DO NOT DETAIN.");
                yield return Narrate("They knew. They knew Teo was going to open that gate, and they stood back and let him.");
                trustCard = true;
                Clue("The Trust's card", "From the coat of the man who jumped me: \"HARBOR GATE. OBSERVE ONLY. Q. — DO NOT DETAIN.\" Sealed by the Tower. The Trust knew what Teo was going to do, and let him.");
            }
            else
            {
                yield return Fade(1, 0.8f);
                player.EndCombat();
                yield return Narrate("I came to on the wet pavement with the taste of pennies in my mouth.",
                                     "They hadn't taken anything. They hadn't needed to. The message was the bruises.");
                ui.Toast("You lost the fight. Whatever they were carrying went with them.", new Color(0.85f, 0.85f, 0.85f));
            }
            // clear the street
            yield return Fade(1, 0.5f);
            foreach (var t in gang) if (t != null) Destroy(t.gameObject);
            Brawl.All.Clear();
            EndShot();
            yield return Fade(0, 0.6f);
            yield return Letterbox(0, 0.4f);
            phase = Phase.Explore;
            SetObjective();
            UpdateFooter();
            busy = false;
        }

        // ---------------- the lock on the tide gate ----------------
        IEnumerator OfferLockpick()
        {
            yield return Choose("", "The lock had been opened once already. It could be opened again.", new List<string> {
                "Work the lock.", "Leave it for now." });
            if (lastChoice != 0) yield break;
            bool ok = false;
            yield return Lockpick(r => ok = r);
            var g = Find("gate").transform.position;
            if (ok)
            {
                gateOpened = true;
                Sound.I?.Play("clang", 0.8f, 0.6f);
                Sound.I?.Play("steam", 0.5f, 0.8f);
                Fx.I?.Steam(g + new Vector3(1.4f, -0.2f, 0), 12, 0.6f);
                yield return Narrate("The last pin gave. Somewhere inside the iron, something heavy shifted, and settled.",
                                     "A service panel beside the lock swung open. Wedged behind a valve wheel, folded small and nearly dry: a page from a notebook. Teo's hand.",
                                     "A drawing. A tall iron figure standing in the harbor, one bright slit across its face where the eyes should be.",
                                     "Under it, three lines. \"It came out of the gate first. Before the Blank. It knows the way down.\"");
                yield return Narrate("I'd seen that slit of light before. I see it every time I look up.");
                teoSketch = true;
                Clue("Teo's sketch", "Hidden inside the tide gate: a page from Teo's notebook. A drawing of a tall iron figure with a slit of light for eyes. \"It came out of the gate first. Before the Blank. It knows the way down.\" It's the Graven.");
            }
            else
            {
                Sound.I?.Play("clang", 0.5f, 2.6f);
                yield return Narrate("The pick snapped in the lock with a sound like a knuckle.",
                                     "I had another one in my coat. My hands would need a minute first.");
            }
        }

        // Three pins. A needle sweeps the track, faster for each pin; press when it's inside the bright zone.
        // Three slips and the pick breaks.
        IEnumerator Lockpick(System.Action<bool> done)
        {
            ui.PickOpen = true;
            ui.PickPins = 3; ui.PickSet = 0; ui.PickStrikes = 0; ui.PickMaxStrikes = 3; ui.PickShake = 0;
            float[] speed = { 0.85f, 1.15f, 1.5f };
            float[] width = { 0.13f, 0.1f, 0.075f };
            float pos = 0, dir = 1;
            ui.PickZone = Random.Range(0.25f, 0.8f); ui.PickWidth = width[0];
            yield return null;
            bool result = false;
            while (true)
            {
                if (Game.Paused) { yield return null; continue; }
                float dt = Time.unscaledDeltaTime;
                pos += dir * speed[ui.PickSet] * dt;
                if (pos > 1) { pos = 1; dir = -1; }
                if (pos < 0) { pos = 0; dir = 1; }
                ui.PickNeedle = pos;
                ui.PickShake = Mathf.MoveTowards(ui.PickShake, 0, dt * 3);
                bool inZone = Mathf.Abs(pos - ui.PickZone) < ui.PickWidth / 2;
                bool press = In.Confirm || (DevArgs.Auto && inZone && Mathf.Abs(pos - ui.PickZone) < ui.PickWidth / 4);
                if (press)
                {
                    if (inZone)
                    {
                        ui.PickSet++;
                        Sound.I?.Play("clang", 0.35f, 1.6f + ui.PickSet * 0.2f);
                        if (ui.PickSet >= ui.PickPins) { result = true; break; }
                        ui.PickWidth = width[ui.PickSet];
                        ui.PickZone = Random.Range(0.15f, 0.85f);
                    }
                    else
                    {
                        ui.PickStrikes++;
                        ui.PickShake = 1;
                        Sound.I?.Play("thump", 0.35f, 2.8f);
                        if (ui.PickStrikes >= ui.PickMaxStrikes) break;
                    }
                }
                yield return null;
            }
            yield return Wait(0.4f);
            ui.PickOpen = false;
            done(result);
        }
    }
}
