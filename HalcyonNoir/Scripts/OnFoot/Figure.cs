using UnityEngine;

namespace HalcyonNoir
{
    // A stylized person built from simple shapes, with a procedural walk and idle sway.
    // Vane gets his own, more detailed build (MakeHero): elbows, a long coat whose tails swing,
    // a face, slicked hair and the link band on his left wrist.
    public class Figure : MonoBehaviour
    {
        public Transform Body, Head, LegL, LegR, ArmL, ArmR;
        public Transform ForeL, ForeR;          // elbows (hero only)
        public Transform[] CoatTails;           // hero only
        public float WalkPhase;
        public float Speed01;     // 0 idle .. 1 running
        public bool Smoking;
        Light cigarette;

        // the link band: the brass cuff Vane uses to call the Graven
        public Renderer LinkBand;
        public Light LinkLight;
        Material linkMat;
        public float LinkGlow;   // 0..1

        // scripted poses (cutscenes, the brawl). Null means "animate as usual".
        public Vector3? ArmLPose, ArmRPose, BodyPose;
        public float ForeLBend = -1, ForeRBend = -1;  // elbow bend in degrees; -1 means automatic
        public bool Seated;

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

        // Elias Vane. Tall and narrow-waisted, broad in the shoulders: a long black double-breasted
        // greatcoat with a stand-up collar and brass buttons, white shirt, black tie, black gloves,
        // slicked-back black hair. The amber link band sits on his left wrist.
        public static Figure MakeHero(Transform parent, Vector3 pos, float yaw, string name)
        {
            var root = new GameObject(name).transform;
            root.SetParent(parent, false);
            root.localPosition = pos;
            root.localEulerAngles = new Vector3(0, yaw, 0);
            var f = root.gameObject.AddComponent<Figure>();
            var body = Build.Pivot(root, "Body", Vector3.zero);
            body.localScale = Vector3.one * 1.04f;
            f.Body = body;

            var coat = Mats.Toon(new Color(0.07f, 0.07f, 0.09f), null, 0.03f);
            var coatEdge = Mats.Toon(new Color(0.12f, 0.12f, 0.15f), null, 0.02f);
            var trousers = Mats.Toon(new Color(0.06f, 0.06f, 0.08f), null, 0.03f);
            var shoes = Mats.Toon(new Color(0.03f, 0.03f, 0.035f), null, 0.02f);
            var skin = Mats.Toon(new Color(0.93f, 0.78f, 0.68f), null, 0.025f);
            var hair = Mats.Toon(new Color(0.04f, 0.045f, 0.07f), null, 0.025f);
            var shirt = Mats.Toon(new Color(0.92f, 0.91f, 0.88f));
            var tie = Mats.Toon(new Color(0.03f, 0.03f, 0.04f));
            var brass = Mats.Toon(new Color(0.78f, 0.62f, 0.32f));
            var glove = Mats.Toon(new Color(0.05f, 0.05f, 0.06f), null, 0.02f);
            var dark = Mats.Toon(new Color(0.02f, 0.02f, 0.03f));

            // ----- legs: long, straight, with pointed shoes -----
            f.LegL = Build.Pivot(body, "LegL", new Vector3(-0.11f, 0.98f, 0));
            f.LegR = Build.Pivot(body, "LegR", new Vector3(0.11f, 0.98f, 0));
            foreach (var leg in new[] { f.LegL, f.LegR })
            {
                Build.Part(leg, PrimitiveType.Capsule, new Vector3(0, -0.27f, 0), new Vector3(0.16f, 0.3f, 0.17f), trousers);
                Build.Part(leg, PrimitiveType.Capsule, new Vector3(0, -0.7f, 0), new Vector3(0.13f, 0.3f, 0.14f), trousers);
                Build.Part(leg, PrimitiveType.Cube, new Vector3(0, -0.95f, 0.06f), new Vector3(0.12f, 0.07f, 0.3f), shoes);
                Build.Part(leg, PrimitiveType.Cube, new Vector3(0, -0.955f, 0.2f), new Vector3(0.08f, 0.055f, 0.1f), shoes, new Vector3(0, 45, 0));
            }

            // ----- torso: V-shaped, broad shoulders, cinched waist -----
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.08f, 0), new Vector3(0.36f, 0.22f, 0.22f), coat);                 // waist
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.34f, 0), new Vector3(0.44f, 0.34f, 0.25f), coat);                 // ribs
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.55f, 0), new Vector3(0.56f, 0.2f, 0.27f), coat);                  // chest
            for (int s = -1; s <= 1; s += 2)
                Build.Part(body, PrimitiveType.Sphere, new Vector3(s * 0.27f, 1.6f, 0), new Vector3(0.2f, 0.17f, 0.25f), coat);    // shoulder pads
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.12f, 0.005f), new Vector3(0.375f, 0.05f, 0.23f), dark);            // belt line
            // shirt, tie and lapels
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.52f, 0.12f), new Vector3(0.15f, 0.22f, 0.04f), shirt, new Vector3(0, 0, 0));
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.48f, 0.142f), new Vector3(0.045f, 0.24f, 0.02f), tie);
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.605f, 0.145f), new Vector3(0.06f, 0.045f, 0.025f), tie);
            for (int s = -1; s <= 1; s += 2)
                Build.Part(body, PrimitiveType.Cube, new Vector3(s * 0.1f, 1.5f, 0.135f), new Vector3(0.07f, 0.3f, 0.02f), coatEdge, new Vector3(0, 0, s * -18));
            // double-breasted: two rows of brass buttons
            for (int s = -1; s <= 1; s += 2)
                for (int i = 0; i < 3; i++)
                    Build.Part(body, PrimitiveType.Sphere, new Vector3(s * 0.1f, 1.36f - i * 0.12f, 0.128f), Vector3.one * 0.035f, brass);
            // stand-up collar, open at the front
            for (int s = -1; s <= 1; s += 2)
                Build.Part(body, PrimitiveType.Cube, new Vector3(s * 0.1f, 1.72f, 0.02f), new Vector3(0.03f, 0.2f, 0.24f), coat, new Vector3(0, s * 18, s * -12));
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, 1.72f, -0.1f), new Vector3(0.24f, 0.2f, 0.03f), coat, new Vector3(-10, 0, 0));

            // ----- the long coat skirt: four panels that hang from the waist and swing -----
            var tails = new System.Collections.Generic.List<Transform>();
            (Vector3 pos, float yaw)[] panels = {
                (new Vector3(-0.1f, 1.04f, 0.1f), 0), (new Vector3(0.1f, 1.04f, 0.1f), 0),
                (new Vector3(-0.11f, 1.04f, -0.1f), 180), (new Vector3(0.11f, 1.04f, -0.1f), 180) };
            foreach (var (p, y) in panels)
            {
                var piv = Build.Pivot(body, "CoatTail", p);
                piv.localEulerAngles = new Vector3(0, y, 0);
                Build.Part(piv, PrimitiveType.Cube, new Vector3(p.x > 0 == (y == 0) ? 0.02f : -0.02f, -0.37f, 0), new Vector3(0.2f, 0.74f, 0.03f), coat, new Vector3(-4, 0, 0));
                Build.Part(piv, PrimitiveType.Cube, new Vector3(0, -0.74f, 0.005f), new Vector3(0.2f, 0.025f, 0.035f), coatEdge, new Vector3(-4, 0, 0));
                tails.Add(piv);
            }
            // side panels close the gaps at the hips
            for (int s = -1; s <= 1; s += 2)
            {
                var piv = Build.Pivot(body, "CoatTail", new Vector3(s * 0.19f, 1.04f, 0));
                piv.localEulerAngles = new Vector3(0, s * 90, 0);
                Build.Part(piv, PrimitiveType.Cube, new Vector3(0, -0.35f, 0), new Vector3(0.2f, 0.7f, 0.03f), coat, new Vector3(-6, 0, 0));
                tails.Add(piv);
            }
            f.CoatTails = tails.ToArray();

            // ----- arms with elbows -----
            f.ArmL = Build.Pivot(body, "ArmL", new Vector3(-0.31f, 1.58f, 0));
            f.ArmR = Build.Pivot(body, "ArmR", new Vector3(0.31f, 1.58f, 0));
            foreach (var arm in new[] { f.ArmL, f.ArmR })
            {
                bool left = arm == f.ArmL;
                Build.Part(arm, PrimitiveType.Capsule, new Vector3(0, -0.17f, 0), new Vector3(0.14f, 0.2f, 0.14f), coat);
                var fore = Build.Pivot(arm, "Fore", new Vector3(0, -0.33f, 0));
                Build.Part(fore, PrimitiveType.Capsule, new Vector3(0, -0.15f, 0), new Vector3(0.12f, 0.18f, 0.12f), coat);
                Build.Part(fore, PrimitiveType.Cylinder, new Vector3(0, -0.29f, 0), new Vector3(0.135f, 0.025f, 0.135f), coatEdge); // cuff
                Build.Part(fore, PrimitiveType.Cube, new Vector3(0, -0.37f, 0.01f), new Vector3(0.075f, 0.12f, 0.1f), glove);
                Build.Part(fore, PrimitiveType.Cube, new Vector3(0, -0.36f, 0.06f), new Vector3(0.03f, 0.08f, 0.04f), glove, new Vector3(20, 0, 0)); // thumb
                if (left)
                {
                    f.ForeL = fore;
                    // the link band: a brass cuff with an amber channel cut into it
                    Build.Part(fore, PrimitiveType.Cylinder, new Vector3(0, -0.255f, 0), new Vector3(0.15f, 0.03f, 0.15f), brass);
                    f.linkMat = Mats.GlowInstance(new Color(1f, 0.65f, 0.25f), 0.6f);
                    f.LinkBand = Build.Part(fore, PrimitiveType.Cylinder, new Vector3(0, -0.255f, 0), new Vector3(0.155f, 0.008f, 0.155f), f.linkMat).GetComponent<Renderer>();
                    f.LinkLight = Build.PointLight(fore, new Vector3(0, -0.26f, 0.08f), new Color(1f, 0.62f, 0.25f), 2.5f, 0f);
                }
                else f.ForeR = fore;
            }

            // ----- head: sharp jaw, narrow eyes, slicked-back hair -----
            f.Head = Build.Pivot(body, "Head", new Vector3(0, 1.76f, 0.01f));
            Build.Part(f.Head, PrimitiveType.Cylinder, new Vector3(0, -0.02f, 0), new Vector3(0.095f, 0.06f, 0.095f), skin);
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.14f, 0), new Vector3(0.19f, 0.23f, 0.21f), skin);        // cranium
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.06f, 0.025f), new Vector3(0.15f, 0.13f, 0.16f), skin);    // jaw
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.035f, 0.07f), new Vector3(0.07f, 0.06f, 0.06f), skin);    // chin
            Build.Part(f.Head, PrimitiveType.Cube, new Vector3(0, 0.12f, 0.105f), new Vector3(0.022f, 0.06f, 0.03f), skin);  // nose
            for (int s = -1; s <= 1; s += 2)
            {
                Build.Part(f.Head, PrimitiveType.Cube, new Vector3(s * 0.045f, 0.16f, 0.095f), new Vector3(0.05f, 0.014f, 0.01f), dark, new Vector3(0, 0, s * 6));   // eye
                Build.Part(f.Head, PrimitiveType.Cube, new Vector3(s * 0.047f, 0.19f, 0.097f), new Vector3(0.06f, 0.013f, 0.01f), hair, new Vector3(0, 0, s * 14));  // brow, angled down to the nose
                Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(s * 0.097f, 0.13f, 0f), new Vector3(0.03f, 0.055f, 0.04f), skin); // ear
            }
            Build.Part(f.Head, PrimitiveType.Cube, new Vector3(0, 0.07f, 0.1f), new Vector3(0.04f, 0.007f, 0.01f), dark); // mouth
            // hair: a cap that covers the crown and back, swept back from a sharp front
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.19f, -0.02f), new Vector3(0.205f, 0.2f, 0.225f), hair);
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.12f, -0.06f), new Vector3(0.19f, 0.2f, 0.16f), hair);
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.265f, 0.01f), new Vector3(0.2f, 0.1f, 0.24f), hair, new Vector3(-14, 0, 0));    // swept-back top
            Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(0, 0.245f, 0.085f), new Vector3(0.07f, 0.06f, 0.07f), hair);                         // widow's peak
            // two swept points at the back of the head
            for (int s = -1; s <= 1; s += 2)
                Build.Part(f.Head, PrimitiveType.Sphere, new Vector3(s * 0.05f, 0.13f, -0.13f), new Vector3(0.07f, 0.16f, 0.07f), hair, new Vector3(-30, 0, s * 10));

            return f;
        }

        public void LightCigarette()
        {
            Smoking = true;
            var tip = Build.Part(ArmR, PrimitiveType.Sphere, new Vector3(0.03f, -0.74f, 0.08f), Vector3.one * 0.03f, Mats.Glow(new Color(1f, 0.45f, 0.15f), 3f));
            cigarette = Build.PointLight(tip.transform, Vector3.zero, new Color(1f, 0.5f, 0.2f), 1.5f, 0.6f);
        }

        float tailSwing;
        float[] tailYaw;

        void Update()
        {
            float t = Time.time;
            float dt = Time.deltaTime;
            if (Seated)
            {
                LegL.localEulerAngles = new Vector3(-85, 0, 3);
                LegR.localEulerAngles = new Vector3(-85, 0, -3);
            }
            else if (Speed01 > 0.01f)
            {
                WalkPhase += dt * Mathf.Lerp(6f, 10f, Speed01);
                float swing = Mathf.Sin(WalkPhase) * Mathf.Lerp(25f, 40f, Speed01);
                LegL.localEulerAngles = new Vector3(swing, 0, 0);
                LegR.localEulerAngles = new Vector3(-swing, 0, 0);
                ArmL.localEulerAngles = new Vector3(-swing * 0.7f, 0, 3);
                ArmR.localEulerAngles = new Vector3(swing * 0.7f, 0, -3);
                Body.localPosition = new Vector3(0, Mathf.Abs(Mathf.Sin(WalkPhase)) * 0.04f, 0);
            }
            else
            {
                LegL.localRotation = Quaternion.Slerp(LegL.localRotation, Quaternion.identity, dt * 8);
                LegR.localRotation = Quaternion.Slerp(LegR.localRotation, Quaternion.identity, dt * 8);
                float breathe = Mathf.Sin(t * 1.4f + (GetHashCode() % 97)) * 2f;
                ArmL.localEulerAngles = new Vector3(breathe, 0, 4);
                ArmR.localEulerAngles = Smoking ? new Vector3(-95f + Mathf.Sin(t * 0.4f) * 25f, 20, -10) : new Vector3(-breathe, 0, -4);
                Body.localPosition = Vector3.Lerp(Body.localPosition, Vector3.zero, dt * 6);
                if (cigarette != null) cigarette.intensity = 0.4f + Mathf.PerlinNoise(t * 2, 0) * 0.6f;
            }

            // scripted poses blend over the procedural ones
            float k = 1 - Mathf.Exp(-dt * 18f);
            if (ArmLPose.HasValue) { armLHeld = Quaternion.Slerp(armLHeld, Quaternion.Euler(ArmLPose.Value), k); ArmL.localRotation = armLHeld; }
            else armLHeld = ArmL.localRotation;
            if (ArmRPose.HasValue) { armRHeld = Quaternion.Slerp(armRHeld, Quaternion.Euler(ArmRPose.Value), k); ArmR.localRotation = armRHeld; }
            else armRHeld = ArmR.localRotation;
            var bodyTarget = BodyPose.HasValue ? Quaternion.Euler(BodyPose.Value) : Quaternion.identity;
            Body.localRotation = Quaternion.Slerp(Body.localRotation, bodyTarget, 1 - Mathf.Exp(-dt * 12f));

            // elbows: a slight natural bend that follows the arm swing, or a scripted bend
            if (ForeL != null)
            {
                float autoL = -12f - Mathf.Max(0, -NormAngle(ArmL.localEulerAngles.x)) * 0.35f;
                float autoR = -12f - Mathf.Max(0, -NormAngle(ArmR.localEulerAngles.x)) * 0.35f;
                ForeL.localRotation = Quaternion.Slerp(ForeL.localRotation, Quaternion.Euler(ForeLBend >= 0 ? -ForeLBend : autoL, 0, 0), k);
                ForeR.localRotation = Quaternion.Slerp(ForeR.localRotation, Quaternion.Euler(ForeRBend >= 0 ? -ForeRBend : autoR, 0, 0), k);
            }

            // the coat tails trail behind when moving and sway in the wind
            if (CoatTails != null)
            {
                float want = Seated ? 0 : Speed01 * 22f + Mathf.Sin(WalkPhase * 2) * 4f * Speed01;
                tailSwing = Mathf.Lerp(tailSwing, want, 1 - Mathf.Exp(-dt * 6f));
                if (tailYaw == null)
                {
                    tailYaw = new float[CoatTails.Length];
                    for (int i = 0; i < CoatTails.Length; i++) tailYaw[i] = CoatTails[i].localEulerAngles.y;
                }
                for (int i = 0; i < CoatTails.Length; i++)
                {
                    var tr = CoatTails[i];
                    float baseYaw = tailYaw[i];
                    bool back = Mathf.Abs(Mathf.DeltaAngle(baseYaw, 180)) < 1f;
                    bool side = Mathf.Abs(Mathf.DeltaAngle(baseYaw, 90)) < 1f || Mathf.Abs(Mathf.DeltaAngle(baseYaw, -90)) < 1f;
                    float wind = Mathf.PerlinNoise(t * 0.9f + i * 3.1f, 0.5f) * 6f - 1f;
                    // front panels swing out with the legs, back panels lift as he moves
                    float legSwing = i < 2 ? Mathf.Sin(WalkPhase) * (i == 0 ? 1 : -1) * 14f * Speed01 : 0;
                    // (a negative x swings a panel's hem out along the pivot's +z: forward for the front panels,
                    // backward for the back panels, which are turned 180 degrees)
                    float x = back ? -(tailSwing + wind) : side ? -wind * 0.5f : -Mathf.Abs(legSwing) - wind * 0.3f;
                    if (Seated) x = back ? 0 : side ? 0 : -75;
                    tr.localEulerAngles = new Vector3(x, baseYaw, 0);
                }
            }

            // link band pulse
            if (linkMat != null)
            {
                float idle = 0.35f + 0.15f * Mathf.Sin(t * 1.3f);
                float v = Mathf.Max(idle, LinkGlow * (5f + Mathf.Sin(t * 30f) * 0.6f));
                if (linkMat.HasProperty("_Intensity")) linkMat.SetFloat("_Intensity", v);
                if (LinkLight != null) { LinkLight.intensity = LinkGlow * 6f; LinkLight.range = 2.5f + LinkGlow * 10f; }
            }
        }

        Quaternion armLHeld = Quaternion.identity, armRHeld = Quaternion.identity;
        static float NormAngle(float a) { a %= 360; return a > 180 ? a - 360 : a; }
    }
}
