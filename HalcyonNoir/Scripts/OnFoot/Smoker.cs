using System.Collections;
using UnityEngine;

namespace HalcyonNoir
{
    // A cigarette for a Figure: lighting up with a lighter cupped in both hands, slow drags that make the
    // ember flare and light the face, smoke let out in a long plume, a thin wisp curling off the tip, and
    // the butt flicked away at the end. The cigarette is placed every frame between the hand and the lips,
    // so it can sit in the hand, come up for a drag, or hang from the mouth while the hands are busy
    // (driving, picking a lock, the controls of the Graven).
    public class Smoker : MonoBehaviour
    {
        Figure f;
        Transform cig, ember;
        Material emberMat;
        Light emberLight, flameLight;
        GameObject flame;
        Transform lid, fire, fireCore;
        float cupK, cupTarget, lidOpen, fireOn, fireLean;   // light-up state, driven by LightUpCo and applied in LateUpdate
        bool lighterOut;

        public bool Lit { get; private set; }
        public bool Busy { get; private set; }
        public bool InMouth;            // hold it in the lips, hands free
        public float Thickness = 1f;    // heavier smoke the deeper Vane is into the case
        public float Burn { get; private set; }   // 0 fresh .. 1 down to the filter
        public float BurnTime = 150f;

        float mouthK, glow, wispT;
        static readonly Vector3 DragArm = new Vector3(-75, -30, -30);
        static readonly Vector3 CupArmL = new Vector3(-72, 32, 34);

        public static Smoker Add(Figure f)
        {
            var s = f.gameObject.AddComponent<Smoker>();
            s.f = f;
            s.Make();
            return s;
        }

        void Make()
        {
            cig = new GameObject("Cigarette").transform;
            cig.SetParent(transform, false);
            var paper = Mats.Toon(new Color(0.92f, 0.9f, 0.85f));
            var filter = Mats.Toon(new Color(0.75f, 0.55f, 0.32f));
            Build.Part(cig, PrimitiveType.Cylinder, new Vector3(0, 0, 0.042f), new Vector3(0.011f, 0.03f, 0.011f), paper, new Vector3(90, 0, 0));
            Build.Part(cig, PrimitiveType.Cylinder, new Vector3(0, 0, 0.006f), new Vector3(0.0115f, 0.008f, 0.0115f), filter, new Vector3(90, 0, 0));
            emberMat = Mats.GlowInstance(new Color(1f, 0.38f, 0.1f), 1.2f);
            ember = Build.Part(cig, PrimitiveType.Sphere, new Vector3(0, 0, 0.074f), Vector3.one * 0.0135f, emberMat).transform;
            emberLight = Build.PointLight(cig, new Vector3(0, 0, 0.09f), new Color(1f, 0.45f, 0.15f), 1.4f, 0);
            cig.gameObject.SetActive(false);

            // a brass lighter with a lid that flips back
            flame = new GameObject("Lighter");
            flame.transform.SetParent(transform, false);
            var brass = Mats.Toon(new Color(0.72f, 0.58f, 0.32f), null, 0.02f);
            Build.Part(flame.transform, PrimitiveType.Cube, new Vector3(0, -0.028f, 0), new Vector3(0.034f, 0.05f, 0.016f), brass);
            Build.Part(flame.transform, PrimitiveType.Cube, new Vector3(0, -0.001f, 0), new Vector3(0.022f, 0.008f, 0.012f), Mats.Toon(new Color(0.5f, 0.5f, 0.52f)));   // chimney
            lid = Build.Pivot(flame.transform, "Lid", new Vector3(0, 0.002f, -0.008f));
            Build.Part(lid, PrimitiveType.Cube, new Vector3(0, 0.008f, 0.008f), new Vector3(0.034f, 0.016f, 0.016f), brass);
            fire = Build.Part(flame.transform, PrimitiveType.Sphere, new Vector3(0, 0.02f, 0), new Vector3(0.016f, 0.04f, 0.016f), Mats.Glow(new Color(1f, 0.72f, 0.3f), 5f)).transform;
            fireCore = Build.Part(fire, PrimitiveType.Sphere, new Vector3(0, -0.15f, 0), new Vector3(0.55f, 0.5f, 0.55f), Mats.Glow(new Color(0.55f, 0.7f, 1f), 3f)).transform;  // blue at the root
            fire.gameObject.SetActive(false);
            flameLight = Build.PointLight(flame.transform, new Vector3(0, 0.03f, 0.06f), new Color(1f, 0.66f, 0.3f), 1.6f, 0);
            flame.SetActive(false);
        }

        Transform Hand => f.ForeR != null ? f.ForeR : f.ArmR;
        Vector3 HandLocal => f.ForeR != null ? new Vector3(0.0f, -0.42f, 0.05f) : new Vector3(0.03f, -0.76f, 0.06f);
        public Vector3 Mouth => f.Head.TransformPoint(new Vector3(0, 0.07f, f.ForeR != null ? 0.11f : 0.12f));
        public Vector3 Tip => ember.position;
        Vector3 Forward => f.Head.forward;

        // ---------------- actions ----------------
        public void LightUp() { if (!Busy && !Lit) StartCoroutine(LightUpCo()); }
        public void Drag() { if (!Busy) StartCoroutine(Lit ? DragCo() : LightUpCo()); }
        public void Flick() { if (!Busy && Lit) StartCoroutine(FlickCo()); }
        public void PutOut() { StopAllCoroutines(); Busy = false; Lit = false; cig.gameObject.SetActive(false); flame.SetActive(false); lighterOut = false; cupTarget = cupK = 0; f.HeadPose = null; if (f.ArmLPose == CupArmL) { f.ArmLPose = null; f.ForeLBend = -1; } ReleaseArms(); }

        // Lighting up, taken slow: the cigarette goes to the lips and the chin comes down, both hands come up
        // and cup around the lighter, the lid flips back, the first strike only throws sparks, the second
        // one catches and lights his face from below. He draws until the tip takes, the lid snaps shut, the
        // hands come down, and the head comes up to let the first smoke out.
        public IEnumerator LightUpCo()
        {
            if (Lit) { yield return DragCo(); yield break; }
            Busy = true;
            Burn = 0;
            cig.gameObject.SetActive(true);
            emberMat.SetFloat("_Intensity", 0);
            bool wasInMouth = InMouth;
            var heldL = f.ArmLPose; float heldLBend = f.ForeLBend;
            InMouth = true;

            // the cigarette to the lips
            f.ArmRPose = DragArm; f.ForeRBend = 100;
            yield return Wait(0.4f);

            // head down, hands up and cupped
            f.HeadPose = new Vector3(18, -6, 5);
            f.ArmLPose = CupArmL; f.ForeLBend = 110;
            f.ArmRPose = new Vector3(-72, -30, -34); f.ForeRBend = 110;
            lighterOut = true; flame.SetActive(true); fire.gameObject.SetActive(false); fireOn = 0; lidOpen = 0;
            cupTarget = 1;
            yield return Wait(0.45f);

            // the lid flips back
            Sound.I?.Play("lighter", 0.22f, 1.7f);
            for (float t = 0; t < 0.12f; t += Time.deltaTime) { lidOpen = t / 0.12f; yield return null; }
            lidOpen = 1;
            yield return Wait(0.2f);

            // first strike: sparks, nothing else
            Sound.I?.Play("lighter", 0.3f, 1.25f);
            fire.gameObject.SetActive(true); fireOn = 0.35f;     // a spark, no more
            yield return Wait(0.06f);
            fire.gameObject.SetActive(false); fireOn = 0;
            yield return Wait(0.45f);

            // second strike catches
            Sound.I?.Play("lighter", 0.55f, Random.Range(0.95f, 1.05f));
            fire.gameObject.SetActive(true);
            for (float t = 0; t < 1.5f; t += Time.deltaTime)
            {
                fireOn = Mathf.Clamp01(t / 0.08f);
                // he draws: the flame bends up into the tip and the paper catches
                fireLean = Mathf.Clamp01((t - 0.35f) / 0.3f) * (0.7f + 0.3f * Mathf.Sin(t * 9f));
                glow = Mathf.Clamp01((t - 0.55f) / 0.5f);
                if (t > 0.8f && !Lit) { Lit = true; Fx.I?.Smoke(Tip, Vector3.up * 0.1f, 2, 0.4f); }
                yield return null;
            }
            Lit = true;

            // the lid snaps shut on the flame
            fire.gameObject.SetActive(false); fireOn = 0; fireLean = 0;
            Sound.I?.Play("lighter", 0.35f, 0.75f);
            for (float t = 0; t < 0.08f; t += Time.deltaTime) { lidOpen = 1 - t / 0.08f; yield return null; }
            lidOpen = 0;
            yield return Wait(0.25f);

            // hands down, head up, and the first smoke goes up and away
            cupTarget = 0;
            glow = 0;
            f.ArmLPose = heldL; f.ForeLBend = heldLBend;
            InMouth = wasInMouth;
            if (!InMouth) { f.ArmRPose = new Vector3(-30, -10, -12); f.ForeRBend = 70; }
            else { f.ArmRPose = null; f.ForeRBend = -1; }
            f.HeadPose = new Vector3(-12, 14, -3);
            yield return Wait(0.3f);
            lighterOut = false; flame.SetActive(false);
            Exhale(1.5f, 0.55f);
            yield return Wait(1.1f);
            f.HeadPose = null;
            yield return Wait(0.2f);
            if (!InMouth) ReleaseArms();
            Busy = false;
        }

        // Where the flame sits: just under the tip of the cigarette, in the hands.
        Vector3 FlamePoint => TipAtLips - Vector3.up * 0.042f;
        Vector3 TipAtLips => Mouth + LipsRot * new Vector3(0, 0, 0.082f);
        Quaternion LipsRot => Quaternion.LookRotation(Forward + Vector3.down * (InMouth ? 0.45f : 0.2f) + f.Head.right * 0.15f);

        // Two-bone reach: turn the upper arm and forearm so the glove lands on the target, elbow toward the pole.
        static readonly Vector3 GloveLocal = new Vector3(0, -0.37f, 0.01f);
        void Reach(Transform arm, Transform fore, Vector3 target, Vector3 pole, float w)
        {
            if (w <= 0.001f) return;
            var S = arm.position;
            float a = Vector3.Distance(fore.position, S);
            float b = Vector3.Distance(fore.TransformPoint(GloveLocal), fore.position);
            var d = target - S;
            float dist = Mathf.Clamp(d.magnitude, Mathf.Abs(a - b) + 0.01f, a + b - 0.005f);
            var dir = d.normalized;
            float cosA = Mathf.Clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1);
            var bendDir = Vector3.ProjectOnPlane(pole, dir).normalized;
            var E = S + dir * (a * cosA) + bendDir * (a * Mathf.Sqrt(1 - cosA * cosA));
            var T = S + dir * dist;
            var upperDown = (E - S).normalized;
            var armRot = Quaternion.LookRotation(Vector3.ProjectOnPlane(T - E, upperDown).normalized, -upperDown);
            var foreDown = (T - E).normalized;
            var foreRot = Quaternion.LookRotation(Vector3.ProjectOnPlane(f.Body.forward + Vector3.up * 0.4f, foreDown).normalized, -foreDown);
            arm.rotation = Quaternion.Slerp(arm.rotation, armRot, w);
            fore.rotation = Quaternion.Slerp(fore.rotation, foreRot, w);
        }

        // A slow drag: the hand comes up, the ember flares, the hand drops, and the smoke comes out.
        public IEnumerator DragCo()
        {
            if (!Lit) { yield return LightUpCo(); yield break; }
            Busy = true;
            bool hand = !InMouth;
            if (hand) { f.ArmRPose = DragArm; f.ForeRBend = 100; }
            yield return Wait(hand ? 0.45f : 0.1f);
            for (float t = 0; t < 0.9f; t += Time.deltaTime) { glow = Mathf.Sin(Mathf.PI * Mathf.Clamp01(t / 0.9f)); yield return null; }
            glow = 0;
            if (hand) { f.ArmRPose = new Vector3(-30, -10, -12); f.ForeRBend = 70; }
            yield return Wait(0.55f);
            Exhale(1f);
            yield return Wait(0.5f);
            if (hand) ReleaseArms();
            Busy = false;
        }

        // Finished with it: a flick of the fingers, and the ember goes tumbling off into the rain.
        public IEnumerator FlickCo()
        {
            Busy = true;
            InMouth = false;
            f.ArmRPose = new Vector3(-55, 10, -25); f.ForeRBend = 80;
            yield return Wait(0.3f);
            f.ArmRPose = new Vector3(-20, 30, -35); f.ForeRBend = 20;
            yield return Wait(0.08f);
            var from = Tip;
            var vel = (Forward + Vector3.up * 0.6f).normalized * 4f + transform.right * 1.5f;
            cig.gameObject.SetActive(false);
            Lit = false;
            StartCoroutine(Butt(from, vel));
            yield return Wait(0.35f);
            ReleaseArms();
            Busy = false;
        }

        IEnumerator Butt(Vector3 p, Vector3 v)
        {
            var b = Build.Part(null, PrimitiveType.Sphere, p, Vector3.one * 0.03f, emberMat).transform;
            b.SetParent(null, true);
            float floor = transform.position.y - 0.5f;
            for (float t = 0; t < 1.6f && b.position.y > floor; t += Time.deltaTime)
            {
                v += Physics.gravity * Time.deltaTime;
                b.position += v * Time.deltaTime;
                if (Random.value < 0.4f) Fx.I?.Embers(b.position, 1, 0.01f);
                yield return null;
            }
            Fx.I?.Embers(b.position, 6, 0.1f);
            Destroy(b.gameObject);
        }

        public void Exhale(float amount, float lift = 0)
        {
            Sound.I?.Play("exhale", 0.3f * amount, Random.Range(0.9f, 1.05f));
            StartCoroutine(ExhaleCo(amount, lift));
        }

        IEnumerator ExhaleCo(float amount, float lift)
        {
            float dur = 1.1f * amount;
            for (float t = 0; t < dur; t += Time.deltaTime)
            {
                float k = Mathf.Sin(Mathf.PI * t / dur);
                var dir = (Forward + Vector3.down * 0.25f + Vector3.up * lift).normalized;
                if (Random.value < 0.8f) Fx.I?.Smoke(Mouth + Forward * 0.04f, dir * (0.55f + 0.3f * k) + Vector3.up * 0.05f, Mathf.CeilToInt(2 * Thickness * k), 0.8f + 0.5f * Thickness);
                yield return null;
            }
        }

        void ReleaseArms()
        {
            f.ArmRPose = null; f.ForeRBend = -1;
        }

        IEnumerator Wait(float s) { for (float t = 0; t < s; t += Time.deltaTime) yield return null; }

        // ---------------- every frame ----------------
        void LateUpdate()
        {
            if (f == null || !cig.gameObject.activeSelf) return;
            float dt = Time.deltaTime;

            // both hands cupped around the lighter at the tip
            cupK = Mathf.MoveTowards(cupK, cupTarget, dt * (cupTarget > cupK ? 2.8f : 2.2f));
            if (f.ForeR != null && f.ForeL != null && cupK > 0.001f)
            {
                float w = Mathf.SmoothStep(0, 1, cupK);
                var F = FlamePoint;
                var r = f.Head.right; var fw = Vector3.ProjectOnPlane(Forward, Vector3.up).normalized;
                Reach(f.ArmR, f.ForeR, F + r * 0.03f - Vector3.up * 0.05f - fw * 0.01f, r * 0.9f + Vector3.down - fw * 0.3f, w);
                Reach(f.ArmL, f.ForeL, F - r * 0.045f + fw * 0.035f - Vector3.up * 0.005f, -r * 0.9f + Vector3.down - fw * 0.3f, w);
            }
            if (lighterOut)
            {
                var fw = Vector3.ProjectOnPlane(Forward, Vector3.up).normalized;
                flame.transform.position = FlamePoint;
                flame.transform.rotation = Quaternion.LookRotation(fw);
                lid.localRotation = Quaternion.Euler(-115 * lidOpen, 0, 0);
                if (fireOn > 0)
                {
                    float n = Mathf.PerlinNoise(Time.time * 18f, 0.3f);
                    fire.localScale = new Vector3(0.016f, 0.034f + 0.014f * n + 0.012f * fireLean, 0.016f) * fireOn;
                    // drawing pulls the flame up and in toward the tip
                    fire.localPosition = new Vector3(0, 0.02f + 0.006f * fireLean, 0.004f * fireLean);
                    fire.localRotation = Quaternion.Euler(-12 * fireLean + (n - 0.5f) * 10f, 0, (Mathf.PerlinNoise(0.7f, Time.time * 11f) - 0.5f) * 14f);
                    flameLight.intensity = (0.55f + n * 0.35f + fireLean * 0.2f) * fireOn;
                    flameLight.range = 0.75f;
                }
                else flameLight.intensity = Mathf.MoveTowards(flameLight.intensity, 0, dt * 30f);
            }

            bool atLips = InMouth || f.ArmRPose == DragArm;
            mouthK = Mathf.MoveTowards(mouthK, atLips ? 1 : 0, dt * (atLips ? 3.2f : 4f));
            var hand = Hand;
            var holdPos = hand.TransformPoint(HandLocal);
            var holdRot = Quaternion.LookRotation(Vector3.Lerp(transform.forward, -hand.up, 0.35f) + Vector3.down * 0.2f);
            var lipsRot = LipsRot;
            float k = Mathf.SmoothStep(0, 1, mouthK);
            cig.position = Vector3.Lerp(holdPos, Mouth, k);
            cig.rotation = Quaternion.Slerp(holdRot, lipsRot, k);

            if (Lit)
            {
                Burn += dt / BurnTime * (1 + glow * 3);
                float flicker = Mathf.PerlinNoise(Time.time * 3f, transform.position.x) * 0.5f;
                emberMat.SetFloat("_Intensity", 1.2f + flicker + glow * 5f);
                emberLight.intensity = 0.12f + flicker * 0.12f + glow * 0.55f;
                emberLight.range = 0.6f + glow * 0.35f;
                // a thin wisp off the tip, thicker on a long night
                wispT -= dt;
                if (wispT <= 0)
                {
                    wispT = Random.Range(0.08f, 0.16f) / Mathf.Max(0.5f, Thickness);
                    Fx.I?.Smoke(Tip, new Vector3(0, 0.14f, 0), 1, 0.35f + 0.15f * Thickness);
                }
            }
            else emberLight.intensity = 0;
        }
    }
}
