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

            flame = new GameObject("Lighter");
            flame.transform.SetParent(transform, false);
            Build.Part(flame.transform, PrimitiveType.Cube, new Vector3(0, -0.03f, 0), new Vector3(0.035f, 0.05f, 0.018f), Mats.Toon(new Color(0.7f, 0.7f, 0.72f)));
            Build.Part(flame.transform, PrimitiveType.Sphere, new Vector3(0, 0.018f, 0), new Vector3(0.014f, 0.032f, 0.014f), Mats.Glow(new Color(1f, 0.75f, 0.35f), 4f));
            flameLight = Build.PointLight(flame.transform, new Vector3(0, 0.03f, 0.02f), new Color(1f, 0.7f, 0.35f), 2.6f, 0);
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
        public void PutOut() { StopAllCoroutines(); Busy = false; Lit = false; cig.gameObject.SetActive(false); flame.SetActive(false); ReleaseArms(); }

        // Strike the lighter and light up: the cigarette goes to the lips, both hands cup the flame,
        // the tip catches, a first drag, and the smoke comes out slow.
        public IEnumerator LightUpCo()
        {
            if (Lit) { yield return DragCo(); yield break; }
            Busy = true;
            Burn = 0;
            cig.gameObject.SetActive(true);
            emberMat.SetFloat("_Intensity", 0);
            bool armsFree = !f.Seated || f.ArmLPose == null;
            bool wasInMouth = InMouth;
            InMouth = true;
            f.ArmRPose = DragArm; f.ForeRBend = 100;
            yield return Wait(0.35f);
            f.ArmLPose = CupArmL; f.ForeLBend = 100;
            yield return Wait(0.3f);
            flame.SetActive(true);
            Sound.I?.Play("lighter", 0.55f, Random.Range(0.95f, 1.05f));
            for (float t = 0; t < 0.9f; t += Time.deltaTime)
            {
                flame.transform.position = Mouth + Forward * 0.1f + Vector3.down * 0.035f;
                flame.transform.rotation = Quaternion.LookRotation(Forward);
                flameLight.intensity = 1.6f + Mathf.PerlinNoise(t * 20, 0) * 1.4f;
                glow = Mathf.Clamp01((t - 0.35f) / 0.4f);
                yield return null;
            }
            flame.SetActive(false);
            Lit = true;
            f.ArmLPose = null; f.ForeLBend = -1;
            yield return Wait(0.55f);
            glow = 0;
            InMouth = wasInMouth;
            if (!InMouth) { f.ArmRPose = new Vector3(-30, -10, -12); f.ForeRBend = 70; }
            yield return Wait(0.5f);
            Exhale(1.3f);
            yield return Wait(0.4f);
            ReleaseArms();
            Busy = false;
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

        public void Exhale(float amount)
        {
            Sound.I?.Play("exhale", 0.3f * amount, Random.Range(0.9f, 1.05f));
            StartCoroutine(ExhaleCo(amount));
        }

        IEnumerator ExhaleCo(float amount)
        {
            float dur = 1.1f * amount;
            for (float t = 0; t < dur; t += Time.deltaTime)
            {
                float k = Mathf.Sin(Mathf.PI * t / dur);
                var dir = (Forward + Vector3.down * 0.25f).normalized;
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
            bool atLips = InMouth || f.ArmRPose == DragArm;
            mouthK = Mathf.MoveTowards(mouthK, atLips ? 1 : 0, dt * (atLips ? 3.2f : 4f));
            var hand = Hand;
            var holdPos = hand.TransformPoint(HandLocal);
            var holdRot = Quaternion.LookRotation(Vector3.Lerp(transform.forward, -hand.up, 0.35f) + Vector3.down * 0.2f);
            var lipsRot = Quaternion.LookRotation(Forward + Vector3.down * (InMouth ? 0.45f : 0.2f) + f.Head.right * 0.15f);
            float k = Mathf.SmoothStep(0, 1, mouthK);
            cig.position = Vector3.Lerp(holdPos, Mouth, k);
            cig.rotation = Quaternion.Slerp(holdRot, lipsRot, k);

            if (Lit)
            {
                Burn += dt / BurnTime * (1 + glow * 3);
                float flicker = Mathf.PerlinNoise(Time.time * 3f, transform.position.x) * 0.5f;
                emberMat.SetFloat("_Intensity", 1.2f + flicker + glow * 5f);
                emberLight.intensity = 0.25f + flicker * 0.3f + glow * 2.2f;
                emberLight.range = 1.2f + glow * 1.2f;
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
