using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // v0.0.06 additions to Halcyon: the street dressed for living in (shop windows, awnings, blade signs,
    // fire escapes, parked cars, steam out of the manholes), the road west out of town, the harbor bed the
    // fight is fought on, and the causeway the opening drive comes in along.
    public partial class City
    {
        readonly List<(float x0, float w, float h, bool north, bool bar)> streetFronts = new List<(float, float, float, bool, bool)>();
        public readonly List<Car> ParkedCars = new List<Car>();
        public Vector3 CarStop = new Vector3(-46f, 0, -4.3f);      // where Vane parks: the curb across from the Blue Lantern's block

        static readonly string[] SignWords = { "HOTEL", "PAWN", "DINER", "RADIO", "ROOMS", "TAILOR", "BOXING", "CAFE", "DRUGS", "LAUNDRY", "BILLIARDS", "LOANS" };
        static readonly Color[] NeonColors = { new Color(1f, 0.3f, 0.25f), new Color(0.35f, 0.9f, 0.85f), new Color(1f, 0.7f, 0.3f), new Color(0.9f, 0.35f, 0.8f), new Color(0.5f, 0.95f, 0.45f) };

        // ---------------- the street, lived in ----------------
        void DressStreet()
        {
            var metalDark = Mats.Toon(new Color(0.1f, 0.1f, 0.11f), null, 0.02f);
            var awningColors = new[] { new Color(0.35f, 0.08f, 0.08f), new Color(0.08f, 0.22f, 0.16f), new Color(0.1f, 0.12f, 0.28f), new Color(0.3f, 0.22f, 0.1f) };
            int signIdx = 0;
            foreach (var (x0, w, h, north, bar) in streetFronts)
            {
                if (bar) continue;
                float face = north ? 10.68f : -10.68f;    // just in front of the ground-floor band
                float s = north ? 1 : -1;                 // toward the building
                float cx = x0 + w / 2;
                // a lit shop window and a door
                var shopCol = Color.Lerp(new Color(1f, 0.7f, 0.4f), NeonColors[rng.Next(NeonColors.Length)], 0.25f);
                float winW = Mathf.Min(w * 0.45f, 6f);
                float winX = cx + R(-w * 0.15f, w * 0.15f);
                var win = Build.Part(Root, PrimitiveType.Quad, new Vector3(winX, 1.45f, face - s * 0.02f), new Vector3(winW, 1.7f, 1), Mats.Glow(shopCol, R(0.35f, 0.8f)),
                    new Vector3(0, north ? 0 : 180, 0));
                win.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                // mullions and a sill so it reads as glass in a frame
                for (int i = 0; i <= 3; i++) Box(new Vector3(winX - winW / 2 + winW * i / 3, 1.45f, face - s * 0.05f), new Vector3(0.06f, 1.75f, 0.05f), metalDark, false);
                Box(new Vector3(winX, 0.55f, face - s * 0.12f), new Vector3(winW + 0.2f, 0.12f, 0.25f), stoneMat, false);
                float doorX = winX + (winW / 2 + 1.0f) * (rng.NextDouble() < 0.5 ? 1 : -1);
                if (Mathf.Abs(doorX - cx) < w / 2 - 0.6f)
                {
                    Box(new Vector3(doorX, 1.15f, face - s * 0.03f), new Vector3(1.1f, 2.3f, 0.06f), Mats.Toon(new Color(0.12f, 0.08f, 0.06f)), false);
                    Box(new Vector3(doorX, 1.5f, face - s * 0.07f), new Vector3(0.6f, 0.7f, 0.02f), Mats.Glow(shopCol, 0.3f), false);
                }
                Build.PointLight(Root, new Vector3(winX, 1.6f, face - s * 1.2f), shopCol, 5f, 0.9f);
                // an awning over half of them
                if (rng.NextDouble() < 0.5)
                {
                    var aw = Mats.Toon(awningColors[rng.Next(awningColors.Length)]);
                    var a = Box(new Vector3(winX, 2.85f, face - s * 0.8f), new Vector3(winW + 0.8f, 0.06f, 1.7f), aw, false);
                    a.transform.rotation = Quaternion.Euler(north ? -16 : 16, 0, 0);
                    Box(new Vector3(winX, 2.42f, face - s * 1.62f), new Vector3(winW + 0.8f, 0.3f, 0.03f), aw, false);   // valance
                }
                // a vertical neon blade sign
                if (rng.NextDouble() < 0.5)
                    NeonSign(new Vector3(cx + R(-w * 0.3f, w * 0.3f), R(5.5f, 7.5f), face - s * 0.9f), SignWords[signIdx++ % SignWords.Length], NeonColors[rng.Next(NeonColors.Length)]);
                // a fire escape climbing the front
                if (h > 24 && rng.NextDouble() < 0.55)
                    FireEscape(new Vector3(cx + R(-w * 0.2f, w * 0.2f), 0, north ? 11f : -11f), north, Mathf.Min(h - 4, 30f), metalDark);
            }

            // parked cars, tired colors, lights off
            var paints = new[] { new Color(0.28f, 0.08f, 0.08f), new Color(0.2f, 0.24f, 0.18f), new Color(0.22f, 0.26f, 0.32f), new Color(0.6f, 0.56f, 0.46f), new Color(0.14f, 0.14f, 0.16f) };
            (float x, bool north)[] spots = { (-31f, false), (-7f, true), (6f, false), (17f, true), (-60f, true), (-2f, false) };
            for (int i = 0; i < spots.Length; i++)
            {
                var (x, n) = spots[i];
                var c = Car.Make(Root, new Vector3(x, 0, n ? 4.6f : -4.6f), n ? -90 : 90, paints[i % paints.Length], false, "ParkedCar");
                ParkedCars.Add(c);
            }

            // steam out of the manholes
            foreach (var p in new[] { new Vector3(-36, 0, 1.5f), new Vector3(-2, 0, -2), new Vector3(19, 0, 2.5f) })
            {
                Build.Part(Root, PrimitiveType.Cylinder, p + Vector3.up * 0.015f, new Vector3(0.9f, 0.01f, 0.9f), metalDark);
                var v = new GameObject("SteamVent").AddComponent<SteamVent>();
                v.transform.SetParent(Root, false);
                v.transform.position = p;
            }

            // puddles that catch the lamplight
            var puddle = Mats.Glow(new Color(0.35f, 0.45f, 0.65f), 0.09f, true);
            for (int i = 0; i < 18; i++)
            {
                var q = Build.Part(Root, PrimitiveType.Quad, new Vector3(R(-64, 26), 0.015f, R(-5.5f, 5.5f)), new Vector3(R(0.8f, 3.2f), R(0.6f, 1.8f), 1), puddle, new Vector3(90, R(0, 180), 0));
                q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }

            // sidewalk furniture: hydrants, cans, a mailbox, a phone booth with its light on
            var red = Mats.Toon(new Color(0.45f, 0.08f, 0.06f));
            foreach (var x in new[] { -52f, -9f, 21f }) { Box(new Vector3(x, 0.35f, -6.6f), new Vector3(0.28f, 0.7f, 0.28f), red, true); Box(new Vector3(x, 0.55f, -6.6f), new Vector3(0.45f, 0.1f, 0.12f), red, false); }
            var can = Mats.Toon(new Color(0.2f, 0.21f, 0.2f), null, 0.02f);
            foreach (var x in new[] { -40f, -15f, 12f }) Build.Part(Root, PrimitiveType.Cylinder, new Vector3(x, 0.45f, 9.9f), new Vector3(0.6f, 0.45f, 0.6f), can, null, true);
            Box(new Vector3(-27.5f, 0.6f, 6.7f), new Vector3(0.5f, 1.2f, 0.45f), Mats.Toon(new Color(0.1f, 0.14f, 0.3f)), true);
            Box(new Vector3(4f, 1.25f, 6.8f), new Vector3(1.0f, 2.5f, 1.0f), Mats.Toon(new Color(0.12f, 0.14f, 0.12f)), true);
            Box(new Vector3(4f, 1.4f, 6.28f), new Vector3(0.7f, 1.7f, 0.03f), Mats.Glow(new Color(1f, 0.85f, 0.55f), 0.6f), false);
            Build.PointLight(Root, new Vector3(4f, 2.1f, 6.3f), new Color(1f, 0.85f, 0.55f), 4f, 0.8f);

            BuildWestRoad();
        }

        void NeonSign(Vector3 pos, string word, Color c)
        {
            float hgt = word.Length * 0.62f + 0.4f;
            var frame = Mats.Toon(new Color(0.08f, 0.08f, 0.09f), null, 0.02f);
            Box(pos, new Vector3(0.22f, hgt, 0.9f), frame, false);
            Build.Part(Root, PrimitiveType.Cube, pos, new Vector3(0.24f, hgt - 0.12f, 0.78f), Mats.Glow(c, 0.18f));
            for (int side = -1; side <= 1; side += 2)
            {
                var go = new GameObject("NeonText");
                go.transform.SetParent(Root, false);
                go.transform.position = pos + new Vector3(side * 0.13f, 0, 0);
                go.transform.rotation = Quaternion.Euler(0, side > 0 ? -90 : 90, 0);
                var tm = go.AddComponent<TextMesh>();
                tm.text = string.Join("\n", word.ToCharArray());
                tm.font = UI.LoadFont(64);
                tm.fontSize = 64;
                tm.characterSize = 0.075f;
                tm.lineSpacing = 0.82f;
                tm.anchor = TextAnchor.MiddleCenter;
                tm.alignment = TextAlignment.Center;
                tm.color = Color.Lerp(c, Color.white, 0.35f);
                go.GetComponent<MeshRenderer>().sharedMaterial = tm.font.material;
            }
            Box(pos + new Vector3(0, hgt / 2 - 0.1f, pos.z > 0 ? 0.55f : -0.55f), new Vector3(0.08f, 0.08f, 0.5f), frame, false);   // bracket
            Build.PointLight(Root, pos + new Vector3(0, 0, pos.z > 0 ? -0.8f : 0.8f), c, 9f, 1.6f);
        }

        // Landings every floor, joined by steep stairs, with railings. Hung off the front of a tower.
        void FireEscape(Vector3 basePos, bool north, float top, Material m)
        {
            float s = north ? -1 : 1;     // out from the wall toward the street
            float wid = 3.2f, dep = 1.1f;
            for (float y = 4.4f; y < top; y += 3.6f)
            {
                var c = basePos + new Vector3(0, y, s * (dep / 2 + 0.05f));
                Box(c, new Vector3(wid, 0.06f, dep), m, false);
                Box(c + new Vector3(0, 0.9f, s * dep / 2), new Vector3(wid, 0.05f, 0.05f), m, false);
                Box(c + new Vector3(0, 0.45f, s * dep / 2), new Vector3(wid, 0.03f, 0.03f), m, false);
                for (int i = 0; i <= 4; i++) Box(c + new Vector3(-wid / 2 + wid * i / 4, 0.45f, s * dep / 2), new Vector3(0.04f, 0.9f, 0.04f), m, false);
                for (int sx = -1; sx <= 1; sx += 2) Box(c + new Vector3(sx * wid / 2, 0.9f, 0), new Vector3(0.05f, 0.05f, dep), m, false);
                // stairs up to the next landing, alternating direction
                if (y + 3.6f < top)
                {
                    bool flip = Mathf.RoundToInt((y - 4.4f) / 3.6f) % 2 == 1;
                    var st = Box(c + new Vector3(0, 1.8f, s * 0.1f), new Vector3(4.6f, 0.06f, 0.55f), m, false);
                    st.transform.rotation = Quaternion.Euler(0, 0, flip ? -50 : 50);
                }
            }
            // the drop ladder, pulled up
            Box(basePos + new Vector3(wid / 2 - 0.3f, 3.0f, s * (dep + 0.05f)), new Vector3(0.45f, 2.6f, 0.05f), m, false);
        }

        // The street keeps going west out of town; this is where Vane's car comes in from.
        void BuildWestRoad()
        {
            Box(new Vector3(-118, -0.5f, 0), new Vector3(96, 1, 12), asphalt);
            Box(new Vector3(-118, -0.35f, 8.5f), new Vector3(96, 1, 5), sidewalk);
            Box(new Vector3(-118, -0.35f, -8.5f), new Vector3(96, 1, 5), sidewalk);
            for (float x = -166; x < -70; x += 6) Box(new Vector3(x, 0.01f, 0), new Vector3(2.5f, 0.02f, 0.18f), Mats.Toon(new Color(0.55f, 0.5f, 0.35f)), false);
            for (float x = -158; x <= -74; x += 14) { Lamp(new Vector3(x, 0, 7.4f)); Lamp(new Vector3(x + 7, 0, -7.4f)); }
            for (int side = -1; side <= 1; side += 2)
            {
                float xs = -166;
                while (xs < -71)
                {
                    float w = Mathf.Min(R(10, 17), -71 - xs);
                    if (w > 5) Tower(new Vector3(xs + w / 2, 0, side * 11f), w, 18, R(30, 80), side > 0);
                    xs += w + R(0.2f, 1.2f);
                }
            }
        }

        // ---------------- the harbor bed: where the machines fight ----------------
        // Under a hand's depth of water until the Tidewarden comes up; then the tide goes out all at once
        // and leaves mud, rock, old pilings and a wreck, with the pier and the street right there.
        public void BuildArena()
        {
            var A = Arena;
            var mud = Mats.Toon(new Color(0.06f, 0.065f, 0.06f), null, 0, 3);
            Box(A + new Vector3(-20, -1, 0), new Vector3(150, 2, 190), mud);
            // wet patches and pools that catch the light
            var pool = Mats.Glow(new Color(0.28f, 0.38f, 0.5f), 0.1f, true);
            var slick = Mats.Toon(new Color(0.06f, 0.07f, 0.07f), null, 0, 3);
            for (int i = 0; i < 46; i++)
            {
                var p = A + new Vector3(R(-88, 50), 0.03f, R(-88, 88));
                var q = Build.Part(Root, PrimitiveType.Quad, p, new Vector3(R(3, 16), R(2, 9), 1), i % 3 == 0 ? pool : slick, new Vector3(90, R(0, 180), 0));
                q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            // rocks, half sunk
            var rock = Mats.Toon(new Color(0.17f, 0.17f, 0.18f), null, 0.03f);
            for (int i = 0; i < 34; i++)
            {
                var p = A + new Vector3(R(-85, 48), 0, R(-85, 85));
                float s = R(1.2f, 5f);
                Build.Part(Root, PrimitiveType.Sphere, p, new Vector3(s * R(0.8f, 1.6f), s * R(0.4f, 0.8f), s * R(0.8f, 1.4f)), rock, new Vector3(0, R(0, 180), R(-10, 10)));
            }
            // rows of rotten pilings from a wharf nobody remembers building
            var oldWood = Mats.Toon(new Color(0.16f, 0.12f, 0.09f), null, 0.03f);
            foreach (var (z0, x0, x1) in new[] { (-62f, -60f, 10f), (58f, -40f, 30f), (-20f, 15f, 45f) })
                for (float x = x0; x < x1; x += R(3.5f, 6f))
                {
                    float hh = R(1.5f, 6.5f);
                    Build.Part(Root, PrimitiveType.Cylinder, A + new Vector3(x, hh / 2, z0 + R(-1, 1)), new Vector3(0.9f, hh / 2, 0.9f), oldWood, new Vector3(R(-8, 8), 0, R(-8, 8)));
                }
            // a fishing boat on its side, half in the mud: hull, keel, ribs
            var hullC = A + new Vector3(-10, 1.2f, -48);
            var hull = Build.Part(Root, PrimitiveType.Capsule, hullC, new Vector3(5, 9, 3.4f), Mats.Toon(new Color(0.2f, 0.16f, 0.13f), null, 0.03f), new Vector3(90, 35, 70));
            Build.Part(Root, PrimitiveType.Cube, hullC + new Vector3(1.8f, 1.6f, 0), new Vector3(0.6f, 0.6f, 17), oldWood, new Vector3(0, 35, 70));
            for (int i = -3; i <= 3; i++)
            {
                var r = Build.Part(Root, PrimitiveType.Cube, hullC + Quaternion.Euler(0, 35, 0) * new Vector3(0, 2.6f, i * 2.2f), new Vector3(0.35f, 5.5f, 0.35f), oldWood, new Vector3(0, 35, 25));
            }
            Build.Part(Root, PrimitiveType.Cylinder, hullC + new Vector3(-3, 3, 4), new Vector3(0.35f, 5f, 0.35f), oldWood, new Vector3(0, 0, 60));   // the mast

            // stone quays down both sides, with warehouses and towers on them
            foreach (int side in new[] { -1, 1 })
            {
                float qz = A.z + side * 97;
                Box(new Vector3(A.x - 20, -1.2f, qz), new Vector3(150, 2.8f, 8), stoneMat);       // top at street level
                Box(new Vector3(A.x - 20, 0.15f, qz - side * 3.9f), new Vector3(150, 0.3f, 0.3f), trim, false);
                float xs = A.x - 92;
                while (xs < A.x + 52)
                {
                    float w = R(16, 30);
                    Tower(new Vector3(xs + w / 2, 0, qz + side * 4.5f), w, 26, R(45, 150), side > 0);
                    xs += w + R(1, 4);
                }
                GantryCrane(new Vector3(A.x - 40, 0, qz + side * 1));
                GantryCrane(new Vector3(A.x + 18, 0, qz + side * 1));
                for (int i = 0; i < 4; i++)
                {
                    var pos = new Vector3(A.x - 75 + i * 38, 0, qz - side * 2.5f);
                    Lamp(pos, Root, 1.7f);
                    Build.PointLight(Root, pos + new Vector3(0, 14, -side * 14), new Color(1f, 0.62f, 0.32f), 55, 1.4f);
                }
            }
            // containers stacked on the quays
            var boxColors = new[] { new Color(0.45f, 0.18f, 0.12f), new Color(0.16f, 0.3f, 0.32f), new Color(0.5f, 0.38f, 0.16f), new Color(0.2f, 0.22f, 0.32f) };
            for (int i = 0; i < 8; i++)
                foreach (int side in new[] { -1, 1 })
                {
                    int high = rng.Next(1, 4);
                    for (int hh = 0; hh < high; hh++)
                        Box(new Vector3(A.x - 80 + i * 17 + R(-2, 2), 1.3f + hh * 2.6f, A.z + side * 99), new Vector3(12, 2.6f, 2.5f), Mats.Toon(boxColors[rng.Next(boxColors.Length)]), false);
                }
            // the drop-off where the harbor gets deep again
            Box(A + new Vector3(WaterEdgeX + 2, -1.5f, 0), new Vector3(4, 3, 190), stoneMat);
            // light over the bed: the moon through a break in the cloud, and the floodlights on the quays
            // (no extra fill: the floodlights and the moon are enough, and the mud should stay dark)
            // skyline across the water
            for (int i = 0; i < 20; i++) Tower(A + new Vector3(R(220, 420), 2.3f, R(-300, 300)), R(30, 60), 30, R(160, 380), true, 1.3f);
        }

        // ---------------- the causeway into town (the opening drive) ----------------
        // Built far away from the city and repeating every 240 m, so the car can drive as long as the
        // conversation takes: when it reaches the end of one stretch it's moved back one stretch, and
        // nothing in view changes.
        public static readonly Vector3 DriveOrigin = new Vector3(0, 0, -3000);
        public const float DrivePeriod = 240f;
        public Transform DriveRoot, DriveSkyline;

        public void BuildDrive()
        {
            var D = DriveOrigin;
            DriveRoot = Build.Pivot(Root, "Causeway", D);
            var root = DriveRoot;
            Material Glints() => Mats.Glow(new Color(1f, 0.7f, 0.4f), 0.22f);
            Build.Part(root, PrimitiveType.Cube, new Vector3(0, -0.5f, 0), new Vector3(840, 1, 11), asphalt);
            for (float x = -420; x < 420; x += 6) Build.Part(root, PrimitiveType.Cube, new Vector3(x, 0.01f, 0), new Vector3(2.5f, 0.02f, 0.16f), Mats.Toon(new Color(0.55f, 0.5f, 0.35f)));
            for (int s = -1; s <= 1; s += 2)
            {
                Build.Part(root, PrimitiveType.Cube, new Vector3(0, 0.9f, s * 5.6f), new Vector3(840, 0.12f, 0.12f), metal);
                Build.Part(root, PrimitiveType.Cube, new Vector3(0, 0.15f, s * 5.6f), new Vector3(840, 0.3f, 0.3f), stoneMat);
                for (float x = -420; x < 420; x += 8) Build.Part(root, PrimitiveType.Cube, new Vector3(x, 0.5f, s * 5.6f), new Vector3(0.12f, 0.9f, 0.12f), metal);
            }
            for (float x = -420; x < 420; x += 40) Build.Part(root, PrimitiveType.Cube, new Vector3(x, -5, 0), new Vector3(3, 9, 9), stoneMat);
            for (int i = 0; i < 28; i++)
            {
                float x = -405 + i * 30;
                bool north = i % 2 == 0;
                var p = new Vector3(x, 0, north ? 6.2f : -6.2f);
                Build.Part(root, PrimitiveType.Cylinder, p + Vector3.up * 3f, new Vector3(0.14f, 3f, 0.14f), metal);
                Build.Part(root, PrimitiveType.Cube, p + new Vector3(0, 6f, north ? -0.9f : 0.9f), new Vector3(0.12f, 0.12f, 1.9f), metal);
                Build.Part(root, PrimitiveType.Sphere, p + new Vector3(0, 5.8f, north ? -1.7f : 1.7f), new Vector3(0.4f, 0.3f, 0.4f), lampMat);
                Build.PointLight(root, p + new Vector3(0, 5.4f, north ? -1.7f : 1.7f), new Color(1f, 0.66f, 0.35f), 16f, 2.4f);
            }
            var w = Build.Part(root, PrimitiveType.Plane, new Vector3(0, -6, 0), new Vector3(90, 1, 50), water);
            w.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            for (int i = 0; i < 70; i++)
            {
                float x = -420 + (i * 37 % 240) + (i / 20) * 240;   // periodic
                Build.Part(root, PrimitiveType.Quad, new Vector3(x - 120, -5.95f, (i * 53 % 120) - 60), new Vector3(1.5f + i % 3, 0.15f, 1), Glints(), new Vector3(90, 0, 0));
            }
            // the city ahead, through the rain: it rides along with the car so it never gets any closer
            DriveSkyline = Build.Pivot(Root, "DriveSkyline", D);
            for (int i = 0; i < 16; i++)
            {
                var holder = Build.Pivot(DriveSkyline, "Far", new Vector3(R(150, 230), 0, R(-140, 140)));
                Tower(Vector3.zero, R(16, 34), 20, R(110, 280), true, 2f, holder);
            }
        }
    }

    // Steam rising out of a manhole, now and then, in no hurry.
    public class SteamVent : MonoBehaviour
    {
        float t;
        void Update()
        {
            t -= Time.deltaTime;
            if (t > 0) return;
            t = Random.Range(0.05f, 0.12f);
            Fx.I?.Smoke(transform.position + Random.insideUnitSphere * 0.3f, new Vector3(0.1f, 0.55f, 0.05f), 1, 7f);
        }
    }
}
