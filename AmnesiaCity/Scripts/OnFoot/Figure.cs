using UnityEngine;

namespace AmnesiaCity
{
    // A stylized person built from simple shapes, with a procedural walk and idle sway.
    public class Figure : MonoBehaviour
    {
        public Transform Body, Head, LegL, LegR, ArmL, ArmR;
        public float WalkPhase;
        public float Speed01;     // 0 idle .. 1 running
        public bool Smoking;
        Light cigarette;

        public struct Look
        {
            public Color coat, shirt, skin, hair, hat, trousers;
            public bool hasHat, longCoat, dress;
            public float height;
        }

        public static Figure Make(Transform parent, Vector3 pos, float yaw, Look look, string name)
        {
            var root = new GameObject(name).transform;
            root.SetParent(parent, false);
            root.localPosition = pos;
            root.localEulerAngles = new Vector3(0, yaw, 0);
            var f = root.gameObject.AddComponent<Figure>();
            float h = look.height <= 0 ? 1f : look.height;
            var body = Build.Pivot(root, "Body", Vector3.zero);
            body.localScale = Vector3.one * h;
            f.Body = body;

            var coat = Mats.Toon(look.coat, null, 0.035f);
            var trousers = Mats.Toon(look.trousers, null, 0.035f);
            var skin = Mats.Toon(look.skin, null, 0.03f);
            var hair = Mats.Toon(look.hair, null, 0.03f);
            var shirt = Mats.Toon(look.shirt);

            // legs swing from the hips
            f.LegL = Build.Pivot(body, "LegL", new Vector3(-0.12f, 0.92f, 0));
            f.LegR = Build.Pivot(body, "LegR", new Vector3(0.12f, 0.92f, 0));
            foreach (var leg in new[] { f.LegL, f.LegR })
            {
                Build.Part(leg, PrimitiveType.Capsule, new Vector3(0, -0.46f, 0), new Vector3(0.17f, 0.46f, 0.17f), look.dress ? skin : trousers);
                Build.Part(leg, PrimitiveType.Cube, new Vector3(0, -0.9f, 0.05f), new Vector3(0.16f, 0.08f, 0.28f), Mats.Toon(new Color(0.08f, 0.07f, 0.07f)));
            }
            // torso and coat
            Build.Part(body, PrimitiveType.Capsule, new Vector3(0, 1.28f, 0), new Vector3(0.46f, 0.42f, 0.3f), coat);
            if (look.longCoat || look.dress)
                Build.Part(body, PrimitiveType.Cylinder, new Vector3(0, 0.82f, 0), new Vector3(0.5f, 0.3f, 0.36f), coat);
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.46f, 0.13f), new Vector3(0.12f, 0.24f, 0.05f), shirt);
            // arms
            f.ArmL = Build.Pivot(body, "ArmL", new Vector3(-0.29f, 1.56f, 0));
            f.ArmR = Build.Pivot(body, "ArmR", new Vector3(0.29f, 1.56f, 0));
            foreach (var arm in new[] { f.ArmL, f.ArmR })
            {
                Build.Part(arm, PrimitiveType.Capsule, new Vector3(0, -0.34f, 0), new Vector3(0.13f, 0.36f, 0.13f), coat);
                Build.Part(arm, PrimitiveType.Sphere, new Vector3(0, -0.7f, 0), new Vector3(0.1f, 0.11f, 0.1f), skin);
            }
            // head
            f.Head = Build.Pivot(body, "Head", new Vector3(0, 1.72f, 0));
            Build.Part(f.Head, PrimitiveType.Cylinder, new Vector3(0, -0.04f, 0), new Vector3(0.1f, 0.05f, 0.1f), skin);
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.12f, 0), new Vector3(0.22f, 0.26f, 0.23f), skin);
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.18f, -0.02f), new Vector3(0.235f, 0.2f, 0.24f), hair);
            if (look.hasHat)
            {
                var hat = Mats.Toon(look.hat, null, 0.02f);
                Build.Part(f.Head, PrimitiveType.Cylinder, new Vector3(0, 0.25f, 0), new Vector3(0.4f, 0.012f, 0.4f), hat);
                Build.Part(f.Head, PrimitiveType.Cylinder, new Vector3(0, 0.33f, 0), new Vector3(0.24f, 0.08f, 0.24f), hat);
                Build.Part(f.Head, PrimitiveType.Cylinder, new Vector3(0, 0.29f, 0), new Vector3(0.245f, 0.018f, 0.245f), Mats.Toon(new Color(0.5f, 0.1f, 0.1f)));
            }
            return f;
        }

        public void LightCigarette()
        {
            Smoking = true;
            var tip = Build.Part(ArmR, PrimitiveType.Sphere, new Vector3(0.03f, -0.74f, 0.08f), Vector3.one * 0.03f, Mats.Glow(new Color(1f, 0.45f, 0.15f), 3f));
            cigarette = Build.PointLight(tip.transform, Vector3.zero, new Color(1f, 0.5f, 0.2f), 1.5f, 0.6f);
        }

        void Update()
        {
            float t = Time.time;
            if (Speed01 > 0.01f)
            {
                WalkPhase += Time.deltaTime * Mathf.Lerp(6f, 10f, Speed01);
                float swing = Mathf.Sin(WalkPhase) * Mathf.Lerp(25f, 40f, Speed01);
                LegL.localEulerAngles = new Vector3(swing, 0, 0);
                LegR.localEulerAngles = new Vector3(-swing, 0, 0);
                ArmL.localEulerAngles = new Vector3(-swing * 0.7f, 0, 3);
                ArmR.localEulerAngles = new Vector3(swing * 0.7f, 0, -3);
                Body.localPosition = new Vector3(0, Mathf.Abs(Mathf.Sin(WalkPhase)) * 0.04f, 0);
            }
            else
            {
                LegL.localRotation = Quaternion.Slerp(LegL.localRotation, Quaternion.identity, Time.deltaTime * 8);
                LegR.localRotation = Quaternion.Slerp(LegR.localRotation, Quaternion.identity, Time.deltaTime * 8);
                float breathe = Mathf.Sin(t * 1.4f + GetInstanceID()) * 2f;
                ArmL.localEulerAngles = new Vector3(breathe, 0, 4);
                ArmR.localEulerAngles = Smoking ? new Vector3(-95f + Mathf.Sin(t * 0.4f) * 25f, 20, -10) : new Vector3(-breathe, 0, -4);
                Body.localPosition = Vector3.Lerp(Body.localPosition, Vector3.zero, Time.deltaTime * 6);
                if (cigarette != null) cigarette.intensity = 0.4f + Mathf.PerlinNoise(t * 2, 0) * 0.6f;
            }
        }
    }
}
