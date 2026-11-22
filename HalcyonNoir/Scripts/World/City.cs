using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // Something the player can walk up to and press E on.
    public class Interactable : MonoBehaviour
    {
        public string Id;
        public string Label;
        public float Radius = 2.2f;
        public bool Enabled = true;
        public GameObject Marker;
    }

    // Builds Halcyon out of shapes: the investigation block and the harbor district arena.
    public partial class City
    {
        public Transform Root;
        public Vector3 PlayerSpawn = new Vector3(-48, 0, 0);
        public Vector3 HarborGlowPos = new Vector3(110, -2, -10);
        public Light HarborLight;
        public GameObject HarborGlow;
        public Transform RelicPreview;
        public Transform HarborWater, WaterGlints, PierEnd;
        public readonly List<Interactable> Interactables = new List<Interactable>();
        public readonly Dictionary<string, Figure> People = new Dictionary<string, Figure>();

        // The fight takes place in the harbor itself, right off the end of the pier, on the harbor bed the
        // tide leaves behind when the Tidewarden comes up. Its floor is 2.3 m below the street.
        public static readonly Vector3 Arena = new Vector3(118, -2.3f, 4);
        public const float LandEdgeX = -50f;   // relative to Arena: the machines stay off the pier and out of the street
        public Vector3 GravenSpawn => Arena + new Vector3(-45, 0, 0);
        public Vector3 BossSpawn => Arena + new Vector3(70, 0, 0);
        public const float ArenaRadius = 86f;
        public const float WaterEdgeX = 52f; // relative to Arena

        static readonly System.Random rng = new System.Random(1947);
        static float R(float a, float b) => a + (float)rng.NextDouble() * (b - a);

        Texture2D[] windowTex;
        Material asphalt, sidewalk, stoneMat, trim, metal, wood, water, lampMat;

        public City()
        {
            Root = new GameObject("Halcyon").transform;
            asphalt = Mats.Toon(new Color(0.11f, 0.11f, 0.14f), null, 0, 3);
            sidewalk = Mats.Toon(new Color(0.24f, 0.23f, 0.26f), null, 0, 3);
            stoneMat = Mats.Toon(new Color(0.32f, 0.3f, 0.33f));
            trim = Mats.Toon(new Color(0.55f, 0.48f, 0.34f));
            metal = Mats.Toon(new Color(0.22f, 0.24f, 0.27f), null, 0.04f);
            wood = Mats.Toon(new Color(0.3f, 0.22f, 0.16f));
            water = Mats.Unlit(new Color(0.03f, 0.06f, 0.09f));
            lampMat = Mats.Glow(new Color(1f, 0.72f, 0.38f), 2.5f);
            windowTex = new[] { WindowTexture(0.35f, 11), WindowTexture(0.18f, 23), WindowTexture(0.5f, 37) };
        }

        public static void SetupAtmosphere(Camera cam)
        {
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogColor = new Color(0.07f, 0.08f, 0.13f);
            RenderSettings.fogDensity = 0.018f;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.14f, 0.15f, 0.22f);
            RenderSettings.skybox = null;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = RenderSettings.fogColor;

            var moon = new GameObject("Moon").AddComponent<Light>();
            moon.type = LightType.Directional;
            moon.color = new Color(0.62f, 0.7f, 0.95f);
            moon.intensity = 0.55f;
            moon.shadows = LightShadows.Soft;
            moon.shadowStrength = 0.8f;
            moon.transform.rotation = Quaternion.Euler(38, -35, 0);
            RenderSettings.sun = moon;
        }

        // A 4x4 grid of windows. Red channel = window, green = lit.
        static Texture2D WindowTexture(float litChance, int seed)
        {
            var r = new System.Random(seed);
            const int S = 128, C = 32;
            var tex = new Texture2D(S, S, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Repeat };
            var px = new Color32[S * S];
            for (int cy = 0; cy < 4; cy++)
                for (int cx = 0; cx < 4; cx++)
                {
                    bool lit = r.NextDouble() < litChance;
                    byte g = lit ? (byte)(180 + r.Next(75)) : (byte)0;
                    for (int y = 0; y < C; y++)
                        for (int x = 0; x < C; x++)
                        {
                            bool win = x >= 8 && x < 24 && y >= 5 && y < 27;
                            bool mullion = x == 16;
                            px[(cy * C + y) * S + cx * C + x] = new Color32(win && !mullion ? (byte)255 : (byte)0, win && !mullion ? g : (byte)0, 0, 255);
                        }
                }
            tex.SetPixels32(px);
            tex.Apply();
            return tex;
        }

        // ---------- shared pieces ----------
        GameObject Box(Vector3 pos, Vector3 size, Material m, bool collider = true, Transform parent = null)
        {
            return Build.Part(parent ?? Root, PrimitiveType.Cube, pos, size, m, null, collider);
        }

        // An art deco tower: a base, stepped setbacks, vertical piers and a lit window facade.
        void Tower(Vector3 frontCenter, float width, float depth, float height, bool facesNegZ, float scale = 1f, Transform parent = null)
        {
            parent = parent ?? Root;
            float dir = facesNegZ ? 1f : -1f; // the building extends away from the street
            var center = frontCenter + new Vector3(0, 0, dir * depth / 2);
            var hue = R(0, 1);
            var wall = Color.Lerp(new Color(0.14f, 0.13f, 0.17f), new Color(0.2f, 0.17f, 0.15f), hue);
            var body = Mats.Toon(wall);
            Build.Part(parent, PrimitiveType.Cube, center + Vector3.up * height / 2, new Vector3(width, height, depth), body, null, true);
            // facade windows
            var tex = windowTex[rng.Next(windowTex.Length)];
            var facade = Mats.Windows(tex, new Vector2(width / (3.2f * scale) / 4f, (height - 4 * scale) / (3.6f * scale) / 4f), wall, new Color(1f, 0.74f, 0.42f));
            var q = Build.Part(parent, PrimitiveType.Quad, frontCenter + new Vector3(0, height / 2 + 2 * scale, -dir * 0.03f), new Vector3(width - 1.2f * scale, height - 4 * scale, 1), facade,
                new Vector3(0, facesNegZ ? 0 : 180, 0));
            q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            // ground floor band and cornice
            Build.Part(parent, PrimitiveType.Cube, frontCenter + new Vector3(0, 1.6f * scale, -dir * 0.25f), new Vector3(width + 0.4f, 3.2f * scale, 0.5f), Mats.Toon(wall * 0.7f));
            Build.Part(parent, PrimitiveType.Cube, frontCenter + new Vector3(0, height, -dir * 0.3f), new Vector3(width + 0.8f, 0.8f * scale, 0.8f), trim);
            // vertical piers
            int piers = Mathf.Max(2, Mathf.RoundToInt(width / (6f * scale)));
            for (int i = 0; i <= piers; i++)
            {
                float x = -width / 2 + width * i / piers;
                Build.Part(parent, PrimitiveType.Cube, frontCenter + new Vector3(x, height / 2, -dir * 0.35f), new Vector3(0.6f * scale, height, 0.7f), Mats.Toon(wall * 1.25f));
            }
            // setbacks: smaller tiers stepping up, maybe a spire
            float y = height, w = width, d = depth;
            int tiers = rng.Next(1, 4);
            for (int t = 0; t < tiers; t++)
            {
                w *= R(0.55f, 0.8f); d *= R(0.55f, 0.8f);
                float th = R(4, 10) * scale;
                Build.Part(parent, PrimitiveType.Cube, center + new Vector3(0, y + th / 2, 0), new Vector3(w, th, d), body);
                Build.Part(parent, PrimitiveType.Cube, center + new Vector3(0, y + th, 0), new Vector3(w + 0.6f, 0.5f * scale, d + 0.6f), trim);
                y += th;
            }
            if (rng.NextDouble() < 0.35)
            {
                Build.Part(parent, PrimitiveType.Cylinder, center + new Vector3(0, y + 6 * scale, 0), new Vector3(0.5f, 6f, 0.5f) * scale, metal);
                Build.Part(parent, PrimitiveType.Sphere, center + new Vector3(0, y + 12.2f * scale, 0), Vector3.one * 0.5f * scale, Mats.Glow(new Color(1f, 0.2f, 0.15f), 3f));
            }
        }

        void Lamp(Vector3 pos, Transform parent = null, float scale = 1f)
        {
            parent = parent ?? Root;
            Build.Part(parent, PrimitiveType.Cylinder, pos + Vector3.up * 2.4f * scale, new Vector3(0.12f, 2.4f, 0.12f) * scale, metal, null, true);
            Build.Part(parent, PrimitiveType.Cube, pos + Vector3.up * 4.8f * scale, new Vector3(0.5f, 0.12f, 0.5f) * scale, metal);
            Build.Part(parent, PrimitiveType.Sphere, pos + Vector3.up * 4.55f * scale, new Vector3(0.38f, 0.42f, 0.38f) * scale, lampMat);
            Build.PointLight(parent, pos + Vector3.up * 4.3f * scale, new Color(1f, 0.66f, 0.35f), 13f * scale, 2.2f);
            var pool = Build.Part(parent, PrimitiveType.Quad, pos + Vector3.up * 0.03f, new Vector3(7, 7, 1) * scale, Mats.Glow(new Color(1f, 0.6f, 0.3f), 0.18f, true), new Vector3(90, 0, 0));
            pool.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        Interactable AddInteract(string id, string label, Vector3 pos, float radius, bool marker)
        {
            var go = new GameObject("Interact_" + id);
            go.transform.SetParent(Root, false);
            go.transform.position = pos;
            var it = go.AddComponent<Interactable>();
            it.Id = id; it.Label = label; it.Radius = radius;
            if (marker)
            {
                it.Marker = Build.Part(go.transform, PrimitiveType.Quad, new Vector3(0, 0.05f, 0), new Vector3(1.6f, 1.6f, 1), Mats.Glow(new Color(0.9f, 0.75f, 0.45f), 0.6f, true), new Vector3(90, 0, 0));
            }
            Interactables.Add(it);
            return it;
        }

        // ---------- the investigation block ----------
        public void BuildStreet()
        {
            // street, sidewalks and the harbor promenade
            Box(new Vector3(-15, -0.5f, 0), new Vector3(110, 1, 12), asphalt);
            Box(new Vector3(-15, -0.35f, 8.5f), new Vector3(110, 1, 5), sidewalk);
            Box(new Vector3(-15, -0.35f, -8.5f), new Vector3(110, 1, 5), sidewalk);
            Box(new Vector3(34, -0.4f, 0), new Vector3(12, 1, 80), stoneMat);
            // lane markings
            for (float x = -64; x < 26; x += 6) Box(new Vector3(x, 0.01f, 0), new Vector3(2.5f, 0.02f, 0.18f), Mats.Toon(new Color(0.55f, 0.5f, 0.35f)), false);

            // north and south rows of towers
            float xs = -70;
            while (xs < 26)
            {
                float w = R(10, 17);
                if (xs + w > 28) w = 28 - xs;
                if (w > 5)
                {
                    bool isBar = xs <= -18 && xs + w >= -18;
                    float th = isBar ? 16 : R(34, 96);
                    Tower(new Vector3(xs + w / 2, 0, 11f), w, 18, th, true);
                    streetFronts.Add((xs, w, th, true, isBar));
                }
                xs += w + R(0.2f, 1.2f);
            }
            xs = -70;
            while (xs < 26)
            {
                float w = R(10, 17);
                if (xs + w > 28) w = 28 - xs;
                if (w > 5) { float th = R(34, 96); Tower(new Vector3(xs + w / 2, 0, -11f), w, 18, th, false); streetFronts.Add((xs, w, th, false, false)); }
                xs += w + R(0.2f, 1.2f);
            }
            // distant skyline across the harbor
            for (int i = 0; i < 26; i++)
            {
                float x = R(-200, 200), z = R(120, 260);
                Tower(new Vector3(x, 0, z), R(14, 30), 20, R(90, 260), true, 2f);
            }

            // street lamps
            for (float x = -60; x <= 24; x += 14) { Lamp(new Vector3(x, 0, 7.4f)); Lamp(new Vector3(x + 7, 0, -7.4f)); }
            Lamp(new Vector3(30, 0, 14)); Lamp(new Vector3(30, 0, -14)); Lamp(new Vector3(38, 0, 26)); Lamp(new Vector3(38, 0, -26));

            BuildBar();
            BuildHarbor();
            BuildBounds();
            BuildPeople();
            DressStreet();
        }

        void BuildBar()
        {
            // The Blue Lantern: awning, door, neon
            var doorX = -18f;
            Box(new Vector3(doorX, 1.3f, 10.7f), new Vector3(2, 2.6f, 0.3f), Mats.Toon(new Color(0.25f, 0.12f, 0.1f)), false);
            Box(new Vector3(doorX, 1.3f, 10.55f), new Vector3(1.4f, 2.2f, 0.1f), Mats.Glow(new Color(1f, 0.6f, 0.3f), 0.5f), false);
            Box(new Vector3(doorX - 2.5f, 3.4f, 9f), new Vector3(9, 0.2f, 3.2f), Mats.Toon(new Color(0.12f, 0.16f, 0.32f)), false);
            for (int i = -1; i <= 1; i += 2) Box(new Vector3(doorX - 2.5f + i * 4.3f, 1.7f, 7.6f), new Vector3(0.1f, 3.4f, 0.1f), metal, false);
            var neonGo = new GameObject("Neon");
            neonGo.transform.SetParent(Root, false);
            neonGo.transform.position = new Vector3(doorX - 2.5f, 5.2f, 10.4f);
            neonGo.transform.rotation = Quaternion.Euler(0, 0, 0);
            var tm = neonGo.AddComponent<TextMesh>();
            tm.text = "BLUE LANTERN";
            tm.font = UI.LoadFont(64);
            tm.fontSize = 64;
            tm.characterSize = 0.09f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.color = new Color(0.45f, 0.75f, 1f);
            neonGo.GetComponent<MeshRenderer>().sharedMaterial = tm.font.material;
            Build.Part(Root, PrimitiveType.Quad, new Vector3(doorX - 2.5f, 5.2f, 10.45f), new Vector3(9, 2.2f, 1), Mats.Glow(new Color(0.2f, 0.45f, 1f), 0.35f, true));
            Build.PointLight(Root, new Vector3(doorX - 2.5f, 5f, 9.4f), new Color(0.35f, 0.6f, 1f), 10f, 2.5f);
        }

        void BuildHarbor()
        {
            // sea wall and water
            Box(new Vector3(40.5f, -1.15f, -22f), new Vector3(1, 2.7f, 38), stoneMat);
            Box(new Vector3(40.5f, -1.15f, 22f), new Vector3(1, 2.7f, 38), stoneMat);
            Box(new Vector3(40.5f, 0.6f, -22f), new Vector3(1.2f, 0.8f, 38), stoneMat);
            Box(new Vector3(40.5f, 0.6f, 22f), new Vector3(1.2f, 0.8f, 38), stoneMat);
            var w = Build.Part(Root, PrimitiveType.Plane, new Vector3(230, -2.2f, 0), new Vector3(40, 1, 44), water);
            w.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            HarborWater = w.transform;
            // light glints on the water
            WaterGlints = Build.Pivot(Root, "Glints", Vector3.zero);
            for (int i = 0; i < 40; i++)
                Build.Part(WaterGlints, PrimitiveType.Quad, new Vector3(R(44, 160), -2.15f, R(-60, 60)), new Vector3(R(0.6f, 2.5f), 0.12f, 1), Mats.Glow(new Color(1f, 0.7f, 0.4f), 0.25f), new Vector3(90, R(-10, 10), 0));
            // the pier
            // the pier. The last few meters are their own piece: the Tidewarden takes them off.
            PierEnd = Build.Pivot(Root, "PierEnd", Vector3.zero);   // parts in world positions; break it with RotateAround
            Box(new Vector3(50.75f, -0.25f, 0), new Vector3(21.5f, 0.5f, 6), wood);
            Box(new Vector3(62.85f, -0.25f, 0), new Vector3(2.7f, 0.5f, 6), wood, true, PierEnd);
            for (float x = 41; x <= 64; x += 3)
                for (int s = -1; s <= 1; s += 2)
                    Box(new Vector3(x, -1.2f, s * 2.8f), new Vector3(0.4f, 2.4f, 0.4f), wood, false, x > 61.5f ? PierEnd : null);
            for (int s = -1; s <= 1; s += 2) Box(new Vector3(50.75f, 0.6f, s * 3f), new Vector3(21.5f, 0.1f, 0.1f), metal, true);
            for (int s = -1; s <= 1; s += 2) Box(new Vector3(62.85f, 0.6f, s * 3f), new Vector3(2.7f, 0.1f, 0.1f), metal, true, PierEnd);
            Box(new Vector3(64.2f, 0.4f, 0), new Vector3(0.3f, 1, 6), metal, true, PierEnd);
            Lamp(new Vector3(58, 0, 2.4f));
            // gouges on the pier: four dark scorched grooves
            for (int i = 0; i < 4; i++)
                Box(new Vector3(56 + i * 0.1f, 0.01f, -1.6f + i * 0.9f), new Vector3(7f, 0.03f, 0.28f), Mats.Toon(new Color(0.05f, 0.03f, 0.03f), new Color(0.15f, 0.06f, 0.02f)), false);

            // the old tide gate in the sea wall, below the promenade
            var gate = Build.Part(Root, PrimitiveType.Cylinder, new Vector3(40.0f, -0.4f, -16f), new Vector3(3.2f, 0.25f, 3.2f), Mats.Toon(new Color(0.3f, 0.2f, 0.14f), null, 0.03f), new Vector3(0, 0, 90));
            Build.Part(Root, PrimitiveType.Cylinder, new Vector3(39.75f, -0.4f, -16f), new Vector3(0.6f, 0.08f, 0.6f), Mats.Toon(new Color(0.75f, 0.6f, 0.3f)), new Vector3(0, 0, 90));
            Build.Part(Root, PrimitiveType.Cube, new Vector3(38.8f, 0.4f, -16f), new Vector3(0.2f, 0.9f, 3.6f), metal, null, true);

            // Gil's booth
            Box(new Vector3(34, 1.3f, 13), new Vector3(3, 2.6f, 3), Mats.Toon(new Color(0.18f, 0.25f, 0.24f)));
            Box(new Vector3(34, 2.75f, 13), new Vector3(3.6f, 0.3f, 3.6f), metal);
            Box(new Vector3(32.45f, 1.6f, 13), new Vector3(0.1f, 0.9f, 2f), Mats.Glow(new Color(1f, 0.75f, 0.4f), 0.6f), false);
            Build.PointLight(Root, new Vector3(32, 2.2f, 13), new Color(1f, 0.7f, 0.4f), 6, 1.6f);

            // the faint green-gold glow far out in the water (grows during the reveal)
            HarborGlow = Build.Part(Root, PrimitiveType.Quad, HarborGlowPos + Vector3.up * 0.1f, new Vector3(30, 30, 1), Mats.GlowInstance(new Color(0.55f, 0.9f, 0.45f), 0.15f, true), new Vector3(90, 0, 0));
            HarborLight = Build.PointLight(Root, HarborGlowPos + Vector3.up * 2, new Color(0.6f, 1f, 0.55f), 40, 0.3f);

            // interaction points
            AddInteract("gouges", "Examine the pier", new Vector3(54, 0, -0.3f), 3.2f, true);
            AddInteract("gate", "Examine the tide gate", new Vector3(38.2f, 0, -16f), 2.8f, true);
        }

        void BuildBounds()
        {
            var inv = new[] {
                (new Vector3(-66, 3, 0), new Vector3(1, 8, 40)),
                (new Vector3(41, 3, -21), new Vector3(1, 8, 36)),
                (new Vector3(41, 3, 21), new Vector3(1, 8, 36)),
                (new Vector3(34, 3, 40.5f), new Vector3(14, 8, 1)),
                (new Vector3(34, 3, -40.5f), new Vector3(14, 8, 1)),
                (new Vector3(28.5f, 3, 25.5f), new Vector3(1, 8, 30)),
                (new Vector3(28.5f, 3, -25.5f), new Vector3(1, 8, 30)),
            };
            foreach (var (p, s) in inv)
            {
                var go = new GameObject("Bound");
                go.transform.SetParent(Root, false);
                go.transform.position = p;
                var c = go.AddComponent<BoxCollider>();
                c.size = s;
            }
        }

        void BuildPeople()
        {
            var mara = Figure.Make(Root, new Vector3(-23f, 0, 8.6f), 180, new Figure.Look {
                coat = new Color(0.62f, 0.12f, 0.14f), shirt = new Color(0.9f, 0.85f, 0.8f), skin = new Color(0.86f, 0.7f, 0.6f),
                hair = new Color(0.12f, 0.08f, 0.07f), trousers = new Color(0.1f, 0.1f, 0.1f), dress = true, height = 0.96f }, "Mara");
            var ost = Figure.Make(Root, new Vector3(-12.5f, 0, 9.1f), 200, new Figure.Look {
                coat = new Color(0.82f, 0.8f, 0.74f), shirt = new Color(0.1f, 0.1f, 0.12f), skin = new Color(0.78f, 0.6f, 0.5f),
                hair = new Color(0.5f, 0.48f, 0.46f), trousers = new Color(0.12f, 0.12f, 0.14f), height = 1.04f }, "Ostrowski");
            ost.LightCigarette();
            var gil = Figure.Make(Root, new Vector3(33.2f, 0, 10.6f), 250, new Figure.Look {
                coat = new Color(0.2f, 0.26f, 0.32f), shirt = new Color(0.6f, 0.6f, 0.55f), skin = new Color(0.72f, 0.56f, 0.46f),
                hair = new Color(0.3f, 0.25f, 0.2f), trousers = new Color(0.15f, 0.15f, 0.18f), hat = new Color(0.12f, 0.15f, 0.2f), hasHat = true, longCoat = true, height = 1.0f }, "Gil");
            People["mara"] = mara; People["ostrowski"] = ost; People["gil"] = gil;
            AddInteract("mara", "Talk to the woman in red", mara.transform.position, 2.4f, false);
            AddInteract("ostrowski", "Talk to the bartender", ost.transform.position, 2.4f, false);
            AddInteract("gil", "Talk to the watchman", gil.transform.position, 2.4f, false);
        }

        // A dockside gantry crane, about 2.5x the Graven's height, with its boom out over the water.
        void GantryCrane(Vector3 b)
        {
            var paint = Mats.Toon(new Color(0.38f, 0.2f, 0.12f), null, 0.1f);
            const float H = 46;
            for (int sx = -1; sx <= 1; sx += 2)
                for (int sz = -1; sz <= 1; sz += 2)
                    Box(b + new Vector3(sx * 5, H / 2, sz * 6), new Vector3(1.6f, H, 1.6f), paint, true);
            // portal beams and cross bracing
            for (int sz = -1; sz <= 1; sz += 2)
            {
                Box(b + new Vector3(0, 10, sz * 6), new Vector3(11.6f, 1.2f, 1.2f), paint, false);
                Box(b + new Vector3(0, H, sz * 6), new Vector3(11.6f, 1.6f, 1.6f), paint, false);
                var brace = Box(b + new Vector3(0, 28, sz * 6), new Vector3(0.7f, 25f, 0.7f), paint, false);
                brace.transform.rotation = Quaternion.Euler(0, 0, 22);
            }
            for (int sx = -1; sx <= 1; sx += 2) Box(b + new Vector3(sx * 5, H, 0), new Vector3(1.6f, 1.6f, 13.6f), paint, false);
            // machinery house, boom over the water and the counterweight arm behind
            Box(b + new Vector3(-1, H + 4, 0), new Vector3(12, 6.5f, 10), paint, false);
            Box(b + new Vector3(30, H + 2, 0), new Vector3(52, 2, 3), paint, false);
            Box(b + new Vector3(-16, H + 2, 0), new Vector3(20, 2, 3), paint, false);
            Box(b + new Vector3(-24, H - 1, 0), new Vector3(5, 5, 5), metal, false);
            // operator cab and a hanging hook
            Box(b + new Vector3(8, H - 2, 2.6f), new Vector3(3.2f, 3, 2.4f), metal, false);
            Build.Part(Root, PrimitiveType.Cube, b + new Vector3(8.5f, H - 1.6f, 3.85f), new Vector3(2.4f, 1.2f, 0.1f), Mats.Glow(new Color(1f, 0.72f, 0.4f), 1.4f));
            Box(b + new Vector3(44, H - 14, 0), new Vector3(0.25f, 28, 0.25f), metal, false);
            Box(b + new Vector3(44, H - 28.5f, 0), new Vector3(2.4f, 1.2f, 2.4f), metal, false);
            // warning beacon on the boom tip
            Build.Part(Root, PrimitiveType.Sphere, b + new Vector3(55.5f, H + 3.4f, 0), Vector3.one * 0.9f, Mats.Glow(new Color(1f, 0.2f, 0.15f), 3f));
        }

        // Rain that follows the camera.
        public static ParticleSystem MakeRain(Transform cam)
        {
            var go = new GameObject("Rain");
            go.transform.SetParent(cam, false);
            go.transform.localPosition = new Vector3(0, 12, 8);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.loop = true;
            main.startLifetime = 1.3f;
            main.startSpeed = 0;
            main.startSize = new ParticleSystem.MinMaxCurve(0.025f, 0.05f);
            main.startColor = new Color(0.6f, 0.7f, 0.9f, 0.5f);
            main.maxParticles = 6000;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            var em = ps.emission;
            em.rateOverTime = 2600;
            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(50, 1, 50);
            var vel = ps.velocityOverLifetime;
            vel.enabled = true;
            vel.space = ParticleSystemSimulationSpace.World;
            vel.x = new ParticleSystem.MinMaxCurve(-2f, -1f);
            vel.y = new ParticleSystem.MinMaxCurve(-30f, -24f);
            vel.z = new ParticleSystem.MinMaxCurve(0.5f, 1f);
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.renderMode = ParticleSystemRenderMode.Stretch;
            r.velocityScale = 0.05f;
            r.lengthScale = 2f;
            r.sharedMaterial = Mats.Glow(new Color(0.55f, 0.65f, 0.85f), 0.5f);
            ps.Play();
            return ps;
        }
    }
}
