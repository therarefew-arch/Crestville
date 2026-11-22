using System.Collections;
using UnityEngine;

namespace HalcyonNoir
{
    // Calling the Graven, and getting in. The player holds G while Vane raises the link band; the Graven
    // comes up out of the harbor beside the pier, kneels, puts its hand down for him, lifts him to its
    // chest and takes him in through the hatch. Inside, the link wakes the cockpit up one line at a time.
    // The point is to show that the man and the machine are joined, and how small he is beside it.
    public partial class GameDirector
    {
        const float GravenStreetScale = 1.45f;   // about 38 m standing: twenty times Vane's height
        Cockpit cockpit;

        static Vector3 Flat(Vector3 v) { v.y = 0; return v; }

        IEnumerator CallGraven(Vector3 p)
        {
            var f = player.Figure;
            var pierHand = new Vector3(60f, 0.05f, 2.3f);          // where the hand comes down: the pier's north edge, near the end
            var g0 = new Vector3(70f, -3f, 19f);                    // roughly where it stands in the water
            var toG = Flat(g0 - p).normalized;
            var side = Vector3.Cross(Vector3.up, toG);

            // ----- 1. the call -----
            player.FaceTowards(p + toG * 10);
            Shot(p + toG * 2.6f - side * 1.3f + Vector3.up * 0.6f, p + Vector3.up * 2.1f);
            float hold = 0;
            while (hold < 1)
            {
                if (!Game.Paused)
                {
                    if (In.SummonHeld) hold += Time.unscaledDeltaTime / 1.4f;
                    else hold = Mathf.Max(0, hold - Time.unscaledDeltaTime);
                }
                hold = Mathf.Min(hold, 1f);
                int bars = Mathf.RoundToInt(hold * 12);
                ui.HintLine = "Hold  [G]  to call the Graven     " + new string('|', bars) + new string('.', 12 - bars);
                f.ArmLPose = Vector3.Lerp(new Vector3(-30, 0, 8), new Vector3(-168, 0, 6), Mathf.SmoothStep(0, 1, hold));
                f.ForeLBend = Mathf.Lerp(60, 5, hold);
                f.LinkGlow = hold;
                if (Random.value < hold * 0.2f) Fx.I?.Shake(0.15f + hold * 0.4f, 0.3f);
                yield return null;
            }
            ui.HintLine = null;
            f.LinkGlow = 1;
            Sound.I?.Play("charge", 0.9f, 0.8f);
            Sound.I?.Play("siren", 0.25f, 0.6f);
            Fx.I?.Flash(new Color(1f, 0.65f, 0.25f, 0.5f), 0.6f);
            Fx.I?.Shake(0.6f, 0.8f);
            yield return Wait(0.8f);

            // ----- 2. it rises -----
            var gv = GravenController.Make(g0, Quaternion.LookRotation(Flat(pierHand - g0)));
            gv.Scripted = true;
            gv.GetComponent<CharacterController>().enabled = false;
            gv.transform.localScale = Vector3.one * GravenStreetScale;
            // work out where to stand so that the kneeling hand lands on the pier
            gv.ScriptPose(1, 1, 0, 0);
            var delta = pierHand - gv.PalmTop;
            delta.y = Mathf.Clamp(delta.y, -5f, 3f);
            var gFinal = g0 + delta;
            gv.ScriptPose(0, 0, 0, 0);
            gv.SetVisor(0);
            gv.transform.position = gFinal + Vector3.down * 75f;
            var standHead = gFinal + Vector3.up * 34f;
            Debug.Log($"[CallIn] vane={p} graven={gFinal} palmAtReach={pierHand} shift={delta}");

            Sound.I?.Play("rumble", 1f, 0.5f);
            // wide, from the promenade: the pier, Vane a speck at the end of it, the machine coming up past the towers
            Shot(new Vector3(31f, 3.5f, -21f), gFinal + Vector3.up * 13f);
            orbit.CineSpeed = 1.5f;
            bool risen = false;
            StartCoroutine(RiseGraven(gv, gFinal, 6.5f, () => risen = true));
            yield return Narrate("It came up out of the harbor the way it always does. Slowly. Like it had been waiting just under the surface for me to ask.");
            while (!risen) yield return null;

            // ----- 3. it wakes: the poster shot, Vane small in the bottom of frame -----
            toG = Flat(gFinal - p).normalized; side = Vector3.Cross(Vector3.up, toG);
            player.FaceTowards(gFinal);
            f.ArmLPose = new Vector3(-10, 0, 8); f.ForeLBend = -1;
            f.LinkGlow = 0.5f;
            orbit.CineSpeed = 2.5f;
            // low behind Vane with a wide lens: him at the bottom of frame, the Graven filling the rest
            cam.fieldOfView = 70;
            var posterCam = p - toG * 6f - side * 0.9f + Vector3.up * 0.5f;   // inside the railings, on the deck
            Shot(posterCam, posterCam + (toG * Mathf.Cos(33 * Mathf.Deg2Rad) + Vector3.up * Mathf.Sin(33 * Mathf.Deg2Rad)) * 10f);
            yield return Wait(1.2f);
            for (float t = 0; t < 1.2f; t += Time.unscaledDeltaTime)
            {
                gv.SetVisor(Mathf.PerlinNoise(t * 14f, 0.2f) > 0.45f ? 1.5f + t * 2 : 0);
                yield return null;
            }
            gv.SetVisor(5f);
            Sound.I?.Play("clang", 0.9f, 0.45f);
            Sound.I?.Play("steam", 0.8f, 0.6f);
            Fx.I?.Steam(gv.ExhaustPos(-1), 25, 2.5f);
            Fx.I?.Steam(gv.ExhaustPos(1), 25, 2.5f);
            Fx.I?.Shake(0.4f, 0.6f);
            yield return Narrate("Two eyes' worth of light in a single slit. It looked down at me the way it always does. Like it knew me better than I did.");

            // ----- 4. it kneels and puts its hand down -----
            cam.fieldOfView = 55;
            Shot(pierHand - toG * 22f + side * 14f + Vector3.up * 6f, Vector3.Lerp(pierHand, gFinal + Vector3.up * 14f, 0.5f));
            Sound.I?.Play("bigstep", 1f, 0.55f);
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / 3.2f)
            {
                float k = Mathf.SmoothStep(0, 1, t);
                gv.ScriptPose(k, Mathf.SmoothStep(0, 1, Mathf.Clamp01(t * 1.4f - 0.3f)), 0, 0);
                if (Random.value < 0.15f) Fx.I?.Splash(new Vector3(gFinal.x + Random.Range(-8f, 8f), -2f, gFinal.z + Random.Range(-6f, 6f)), 10, 3);
                yield return null;
            }
            gv.ScriptPose(1, 1, 0, 0);
            Sound.I?.Play("bigstep", 0.8f, 0.7f);
            Fx.I?.Splash(gv.PalmTop + Vector3.down * 2, 30, 3);
            Fx.I?.Shake(0.5f, 0.5f);

            // ----- 5. Vane walks out and steps up onto the hand -----
            player.Scripted = true;
            player.Cc.enabled = false;
            var palm = gv.PalmTop;
            var approach = palm + Flat(p - palm).normalized * 1.1f; approach.y = 0;
            Shot(approach - side * 5.5f + Vector3.up * 1.6f - toG * 2.5f, palm + Vector3.up * 1f);
            yield return WalkVane(approach, 2.6f);
            yield return HopVane(palm, 0.55f, 1.0f);

            // ----- 6. the hand lifts him to the chest; the hatch drops open -----
            orbit.CineSpeed = 4f;
            bool hatchSound = false;
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / 3.6f)
            {
                float k = Mathf.SmoothStep(0, 1, t);
                float hatch = Mathf.SmoothStep(0, 1, Mathf.Clamp01((t - 0.45f) / 0.45f));
                if (hatch > 0.01f && !hatchSound) { hatchSound = true; Sound.I?.Play("steam", 0.9f, 0.8f); Sound.I?.Play("clang", 0.6f, 0.7f); }
                gv.ScriptPose(Mathf.Lerp(1, 0.45f, k), 1, k, hatch);
                palm = gv.PalmTop;
                player.transform.position = palm;
                player.FaceTowards(gFinal);
                var camFrom = pierHand - toG * 16f + side * 9f + Vector3.up * (5f + 13f * k);
                orbit.CinePos = camFrom; orbit.CineLook = palm + Vector3.up * 1.2f + toG * 2f * k;
                if (Random.value < 0.08f) Fx.I?.Steam(gv.ExhaustPos(Random.value < 0.5f ? -1 : 1), 6, 2f);
                yield return null;
            }

            // ----- 7. into the hatch -----
            yield return HopVane(gv.HatchStep, 0.55f, 0.6f);
            Shot(pierHand - toG * 12f + side * 8f + Vector3.up * 12f, gv.CockpitDoor);
            yield return WalkVane(gv.CockpitDoor, 1.6f, true);
            player.gameObject.SetActive(false);
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / 1.1f)
            {
                gv.ScriptPose(0.45f * (1 - t), 1 - t, 1 - t, 1 - Mathf.SmoothStep(0, 1, t));
                yield return null;
            }
            gv.ScriptPose(0, 0, 0, 0);
            Sound.I?.Play("clang", 1f, 0.5f);
            Sound.I?.Play("bigstep", 1f, 0.5f);
            Fx.I?.Shake(1.2f, 0.8f);
            gv.SetVisor(8f);
            Fx.I?.Steam(gv.ExhaustPos(-1), 40, 3f);
            Fx.I?.Steam(gv.ExhaustPos(1), 40, 3f);
            orbit.CineSpeed = 2.5f;
            Shot(new Vector3(32f, 3f, -20f), gFinal + Vector3.up * 18f);
            yield return Narrate("The hatch sealed behind me, and the rain went quiet.");

            // ----- 8. the cockpit wakes up -----
            yield return Fade(1, 0.6f);
            Destroy(gv.gameObject);
            yield return CockpitLink();
            player.Scripted = false;
            player.Cc.enabled = true;
        }

        IEnumerator RiseGraven(GravenController gv, Vector3 to, float dur, System.Action done)
        {
            var from = gv.transform.position;
            float nextStep = 0.6f;
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / dur)
            {
                gv.transform.position = Vector3.Lerp(from, to, Mathf.SmoothStep(0, 1, t));
                if (Random.value < 0.35f) Fx.I?.Splash(new Vector3(to.x + Random.Range(-9f, 9f), -2f, to.z + Random.Range(-7f, 7f)), 14, 4);
                if (Random.value < 0.1f) Fx.I?.Steam(new Vector3(to.x + Random.Range(-6f, 6f), -1f, to.z + Random.Range(-5f, 5f)), 8, 3);
                Fx.I?.Shake(0.25f, 0.15f);
                if (t > nextStep / dur) { nextStep += 1.4f; Sound.I?.Play("bigstep", 0.5f, 0.5f); }
                yield return null;
            }
            gv.transform.position = to;
            Sound.I?.Play("bigstep", 1f, 0.45f);
            Fx.I?.Shake(0.8f, 0.6f);
            done();
        }

        IEnumerator WalkVane(Vector3 to, float speed, bool shrinkIn = false)
        {
            var from = player.transform.position;
            float dist = Vector3.Distance(Flat(from), Flat(to));
            float dur = Mathf.Max(0.3f, dist / speed);
            player.FaceTowards(to);
            player.Figure.Speed01 = speed / 5f;
            float step = 0;
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / dur)
            {
                player.transform.position = Vector3.Lerp(from, to, t);
                player.Figure.Speed01 = speed / 5f;
                step -= Time.unscaledDeltaTime;
                if (step <= 0) { step = 0.42f; Sound.I?.Play("step", 0.2f, Random.Range(0.9f, 1.1f)); }
                yield return null;
            }
            player.transform.position = to;
            player.Figure.Speed01 = 0;
        }

        IEnumerator HopVane(Vector3 to, float dur, float height)
        {
            var from = player.transform.position;
            player.FaceTowards(to);
            player.Figure.BodyPose = new Vector3(14, 0, 0);
            Sound.I?.Play("step", 0.35f, 0.8f);
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / dur)
            {
                player.transform.position = Vector3.Lerp(from, to, t) + Vector3.up * Mathf.Sin(t * Mathf.PI) * height;
                yield return null;
            }
            player.transform.position = to;
            player.Figure.BodyPose = null;
            Sound.I?.Play("step", 0.45f, 0.7f);
        }

        IEnumerator CockpitLink()
        {
            if (cockpit == null) cockpit = new Cockpit();
            var o = Cockpit.Origin;
            cockpit.Root.gameObject.SetActive(true);
            if (rain != null) rain.gameObject.SetActive(false);
            Sound.I?.Ambience("rain", 0.12f);
            foreach (var m in cockpit.Channels) Cockpit.SetGlow(m, 0);
            foreach (var m in cockpit.Gauges) Cockpit.SetGlow(m, 0);
            Cockpit.SetGlow(cockpit.Window, 0.05f);
            cockpit.Key.intensity = 0; cockpit.Fill.intensity = 0.25f;

            // Vane in the seat, his left hand hovering over the socket
            player.gameObject.SetActive(true);
            var f = player.Figure;
            f.Seated = true;
            player.transform.SetPositionAndRotation(o + new Vector3(0, 0.61f - 1.02f, -0.22f), Quaternion.identity);
            f.ArmLPose = new Vector3(-50, 0, 4); f.ForeLBend = 70;
            f.ArmRPose = new Vector3(-55, 0, -4); f.ForeRBend = 60;
            f.BodyPose = null;
            f.LinkGlow = 0.4f;

            Shot(o + new Vector3(1.35f, 1.45f, 0.95f), o + new Vector3(0, 1.35f, -0.25f));
            cam.transform.position = orbit.CinePos;
            cam.transform.rotation = Quaternion.LookRotation(orbit.CineLook - orbit.CinePos);
            yield return Fade(0, 1.0f);
            yield return Narrate("Inside it was dark, and warm. The seat was warm. It always is. Like somebody had only just got up from it.");

            // the band goes into the socket
            Shot(o + new Vector3(-1.35f, 1.35f, 0.75f), o + new Vector3(-0.4f, 0.85f, -0.05f));
            yield return Wait(0.8f);
            f.ArmLPose = new Vector3(-12, 0, 4);
            yield return Wait(0.5f);
            cockpit.Socket.position = f.LinkBand.transform.position + Vector3.down * 0.035f;
            Sound.I?.Play("clang", 0.5f, 1.4f);
            Sound.I?.Play("charge", 0.8f, 0.9f);
            f.LinkGlow = 1;
            Fx.I?.Flash(new Color(1f, 0.65f, 0.25f, 0.3f), 0.3f);
            yield return Wait(0.3f);

            // the light runs out from the socket, along the floor, up the walls, into the visor
            Shot(o + new Vector3(0.6f, 2.1f, -2.3f), o + new Vector3(0, 1.3f, 1.4f));
            for (int i = 0; i < cockpit.Channels.Count; i++)
            {
                Cockpit.SetGlow(cockpit.Channels[i], 3f);
                if (i % 4 == 0) Sound.I?.Play("blip", 0.12f, 0.6f + i * 0.03f);
                yield return Wait(0.045f);
            }
            for (int i = 0; i < cockpit.Gauges.Count; i++)
            {
                Cockpit.SetGlow(cockpit.Gauges[i], 2.2f);
                if (i % 3 == 0) yield return Wait(0.03f);
            }
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / 0.8f)
            {
                Cockpit.SetGlow(cockpit.Window, Mathf.Lerp(0.05f, 3f, t));
                cockpit.Key.intensity = Mathf.Lerp(0, 2.5f, t);
                cockpit.Fill.intensity = Mathf.Lerp(0.25f, 1.1f, t);
                yield return null;
            }
            Sound.I?.Play("bigstep", 0.7f, 0.6f);
            Fx.I?.Shake(0.3f, 0.4f);
            f.LinkGlow = 0.7f;

            int sync = Mathf.RoundToInt(LinkSync * 100);
            ui.LinkText = $"<b>LINK ESTABLISHED</b>\n<size=22>E. VANE  —  THE GRAVEN</size>\n<size=22>SYNC  {sync}%{(Extras > 0 ? $"   ·   {Extras} lead{(Extras > 1 ? "s" : "")} off the record" : "")}</size>";
            for (float t = 0; t < 1; t += Time.unscaledDeltaTime / 0.5f) { ui.LinkAlpha = t; yield return null; }
            ui.LinkAlpha = 1;
            yield return Narrate("The visor came up amber, and the harbor came up with it.");
            yield return Wait(0.6f);
            for (float t = 1; t > 0; t -= Time.unscaledDeltaTime / 0.5f) { ui.LinkAlpha = t; yield return null; }
            ui.LinkAlpha = 0;

            yield return Fade(1, 0.8f);
            cockpit.Root.gameObject.SetActive(false);
            if (rain != null) rain.gameObject.SetActive(true);
            Sound.I?.Ambience("rain", 0.55f);
            ResetVanePose();
        }
    }
}
