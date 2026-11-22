using System.Collections;
using UnityEngine;

namespace HalcyonNoir
{
    // The fight happens where the call-in left off: in the harbor off the end of the pier, with the
    // Tidewarden already there. When the link comes up, the tide goes out all at once and leaves the
    // harbor bed to fight on, the pier and Harbor Street right behind.
    public partial class GameDirector
    {
        Vector3? gravenStood;      // where the Graven stood when it took Vane aboard

        void SetUpFighters(float hpMult)
        {
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
        }

        // Low tide: the water drops away from the harbor bed. 0 = full harbor, 1 = drained.
        void DrainHarbor(float k)
        {
            float y = Mathf.Lerp(-2.2f, -3.7f, k);
            if (city.HarborWater != null) { var p = city.HarborWater.position; p.y = y; city.HarborWater.position = p; }
            if (city.WaterGlints != null) { var p = city.WaterGlints.localPosition; p.y = y + 2.2f; city.WaterGlints.localPosition = p; }
        }

        IEnumerator HarborFightOpening(float hpMult)
        {
            SetUpFighters(hpMult);
            busy = true;
            orbit.enabled = true;
            mechCam.enabled = false;
            Sound.I?.PlayMusic("fight", 0.5f, true);
            ui.Letterbox = 1;

            // from the broken end of the pier: the Graven in the shallows, the Tidewarden facing it
            var gp = graven.transform.position;
            var bp = boss.transform.position;
            var mid = Vector3.Lerp(gp, bp, 0.5f);
            var across = Vector3.Cross(Vector3.up, Flat(bp - gp).normalized);
            Shot(new Vector3(56f, 4.5f, -18f), mid + Vector3.up * 9f);
            cam.transform.position = orbit.CinePos;
            yield return Fade(0, 1.0f);

            // the tide goes out
            Sound.I?.Play("rumble", 1f, 0.45f);
            Sound.I?.Play("steam", 0.6f, 0.4f);
            orbit.CineSpeed = 0.6f;
            orbit.CinePos = new Vector3(52f, 7f, -24f);
            float dur = 3.2f;
            for (float t = 0; t < dur; t += Time.unscaledDeltaTime)
            {
                DrainHarbor(Mathf.SmoothStep(0, 1, t / dur));
                if (Random.value < 0.4f) Fx.I?.Splash(new Vector3(Random.Range(70f, 170f), -3.2f, Random.Range(-60f, 60f)), 8, 6);
                Fx.I?.Shake(0.3f, 0.2f);
                yield return null;
            }
            DrainHarbor(1);
            yield return Narrate("Then the tide went out. All of it, all at once, like something under the harbor had taken a breath and was holding it.");
            orbit.CineSpeed = 2.5f;

            // squared up, close: the two of them across the mud
            Shot(gp + across * 32f + Vector3.up * 9f - Flat(bp - gp).normalized * 6f, mid + Vector3.up * 10f);
            Sound.I?.Play("roar", 1f, 0.6f);
            Fx.I?.Shake(2f, 1.2f);
            Fx.I?.Steam(boss.CorePos, 30, 6);
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
    }
}
