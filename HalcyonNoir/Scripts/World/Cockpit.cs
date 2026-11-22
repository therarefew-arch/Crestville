using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // The inside of the Graven's chest: a cramped iron room with one seat, a curved console and the
    // visor slit across the front wall. It sits far below the city and is shown only in the boarding
    // cutscene. Everything starts dark; Link() lights it in sequence.
    public class Cockpit
    {
        public static readonly Vector3 Origin = new Vector3(0, -600, 0);
        public Transform Root;
        public Vector3 SeatPos => Origin + new Vector3(0, 0, -0.2f);   // floor point under the seat
        public readonly List<Material> Channels = new List<Material>(); // amber lines from the socket outward, in order
        public readonly List<Material> Gauges = new List<Material>();
        public Material Window;
        public Light Fill, Key;
        public Transform Socket;

        public Cockpit()
        {
            Root = new GameObject("Cockpit").transform;
            Root.position = Origin;
            var iron = Mats.Toon(new Color(0.1f, 0.1f, 0.12f), null, 0.02f);
            var ironDark = Mats.Toon(new Color(0.05f, 0.05f, 0.06f), null, 0.02f);
            var brass = Mats.Toon(new Color(0.6f, 0.47f, 0.26f), null, 0.015f);
            var leather = Mats.Toon(new Color(0.22f, 0.1f, 0.07f), null, 0.02f);

            // shell: floor, walls, ceiling. 5 wide, 3.4 tall, 5.4 deep. The front wall is at z = +2.4.
            P(PrimitiveType.Cube, new Vector3(0, -0.1f, 0), new Vector3(5, 0.2f, 5.4f), ironDark);
            P(PrimitiveType.Cube, new Vector3(0, 3.4f, 0), new Vector3(5, 0.2f, 5.4f), ironDark);
            P(PrimitiveType.Cube, new Vector3(-2.5f, 1.7f, 0), new Vector3(0.2f, 3.4f, 5.4f), iron);
            P(PrimitiveType.Cube, new Vector3(2.5f, 1.7f, 0), new Vector3(0.2f, 3.4f, 5.4f), iron);
            P(PrimitiveType.Cube, new Vector3(0, 1.7f, -2.7f), new Vector3(5, 3.4f, 0.2f), iron);
            // the front wall, split around the visor slit
            P(PrimitiveType.Cube, new Vector3(0, 0.95f, 2.6f), new Vector3(5, 1.9f, 0.2f), iron);
            P(PrimitiveType.Cube, new Vector3(0, 2.95f, 2.6f), new Vector3(5, 0.9f, 0.2f), iron);
            // the visor slit: amber glass you can see the rain through, later
            Window = Mats.GlowInstance(new Color(1f, 0.6f, 0.25f), 0.05f);
            P(PrimitiveType.Quad, new Vector3(0, 2.2f, 2.68f), new Vector3(4.6f, 0.55f, 1), Window);
            // art deco ribs along the walls and ceiling
            for (int i = 0; i < 5; i++)
            {
                float z = -2.2f + i * 1.1f;
                P(PrimitiveType.Cube, new Vector3(-2.35f, 1.7f, z), new Vector3(0.12f, 3.2f, 0.18f), brass);
                P(PrimitiveType.Cube, new Vector3(2.35f, 1.7f, z), new Vector3(0.12f, 3.2f, 0.18f), brass);
                P(PrimitiveType.Cube, new Vector3(0, 3.25f, z), new Vector3(4.6f, 0.1f, 0.18f), brass);
            }

            // the seat
            P(PrimitiveType.Cube, new Vector3(0, 0.25f, -0.2f), new Vector3(0.5f, 0.5f, 0.5f), ironDark);
            P(PrimitiveType.Cube, new Vector3(0, 0.55f, -0.2f), new Vector3(0.62f, 0.12f, 0.6f), leather);
            P(PrimitiveType.Cube, new Vector3(0, 1.15f, -0.52f), new Vector3(0.62f, 1.1f, 0.12f), leather, new Vector3(-8, 0, 0));
            P(PrimitiveType.Cube, new Vector3(0, 1.85f, -0.6f), new Vector3(0.36f, 0.3f, 0.12f), leather, new Vector3(-8, 0, 0));
            for (int s = -1; s <= 1; s += 2)
                P(PrimitiveType.Cube, new Vector3(s * 0.4f, 0.8f, -0.1f), new Vector3(0.12f, 0.08f, 0.6f), brass); // armrests

            // the console: a curved bank of panels in front of the seat
            for (int i = -3; i <= 3; i++)
            {
                float a = i * 16f;
                var dir = Quaternion.Euler(0, a, 0) * Vector3.forward;
                var pos = new Vector3(0, 0.95f, -0.2f) + dir * 1.25f;
                P(PrimitiveType.Cube, pos, new Vector3(0.55f, 0.12f, 0.45f), iron, new Vector3(-28, a, 0));
                P(PrimitiveType.Cube, pos + Vector3.down * 0.45f, new Vector3(0.5f, 0.8f, 0.3f), ironDark, new Vector3(0, a, 0));
                // two round gauges per panel
                for (int g = -1; g <= 1; g += 2)
                {
                    var m = Mats.GlowInstance(new Color(1f, 0.68f, 0.3f), 0f);
                    Gauges.Add(m);
                    var gp = pos + Quaternion.Euler(0, a, 0) * new Vector3(g * 0.13f, 0.08f, 0.02f);
                    P(PrimitiveType.Cylinder, gp, new Vector3(0.14f, 0.01f, 0.14f), m, new Vector3(-28, a, 0));
                }
            }
            // two control yokes
            for (int s = -1; s <= 1; s += 2)
            {
                P(PrimitiveType.Cylinder, new Vector3(s * 0.32f, 0.92f, 0.45f), new Vector3(0.06f, 0.18f, 0.06f), ironDark, new Vector3(-30, 0, 0));
                P(PrimitiveType.Cube, new Vector3(s * 0.32f, 1.08f, 0.38f), new Vector3(0.16f, 0.06f, 0.06f), brass);
            }

            // the link socket on the left armrest, and the channels that carry the light out from it:
            // along the armrest, down to the floor, across it and up the walls to the visor
            Socket = P(PrimitiveType.Cylinder, new Vector3(-0.4f, 0.86f, 0.05f), new Vector3(0.16f, 0.03f, 0.16f), brass).transform;
            var route = new List<(Vector3 pos, Vector3 size)>();
            route.Add((new Vector3(-0.4f, 0.85f, -0.25f), new Vector3(0.03f, 0.02f, 0.5f)));
            route.Add((new Vector3(-0.46f, 0.45f, -0.5f), new Vector3(0.03f, 0.8f, 0.03f)));
            for (int i = 0; i < 6; i++) route.Add((new Vector3(-0.46f - i * 0.33f, 0.01f, -0.5f), new Vector3(0.33f, 0.02f, 0.04f)));
            route.Add((new Vector3(-2.38f, 1.2f, -0.5f), new Vector3(0.03f, 2.4f, 0.04f)));
            for (int i = 0; i < 6; i++) route.Add((new Vector3(-2.38f, 2.45f, -0.3f + i * 0.45f), new Vector3(0.04f, 0.04f, 0.45f)));
            for (int i = 0; i < 6; i++) route.Add((new Vector3(0.46f + i * 0.33f, 0.01f, -0.5f), new Vector3(0.33f, 0.02f, 0.04f)));
            route.Add((new Vector3(2.38f, 1.2f, -0.5f), new Vector3(0.03f, 2.4f, 0.04f)));
            for (int i = 0; i < 6; i++) route.Add((new Vector3(2.38f, 2.45f, -0.3f + i * 0.45f), new Vector3(0.04f, 0.04f, 0.45f)));
            foreach (var (pos, size) in route)
            {
                var m = Mats.GlowInstance(new Color(1f, 0.6f, 0.22f), 0f);
                Channels.Add(m);
                P(PrimitiveType.Cube, pos, size, m);
            }

            Fill = Build.PointLight(Root, new Vector3(0, 2.6f, 0.8f), new Color(1f, 0.6f, 0.3f), 7f, 0.15f);
            Key = Build.PointLight(Root, new Vector3(0, 2.2f, 2.2f), new Color(1f, 0.7f, 0.35f), 6f, 0f);
            Root.gameObject.SetActive(false);
        }

        GameObject P(PrimitiveType t, Vector3 lp, Vector3 s, Material m, Vector3? e = null) => Build.Part(Root, t, lp, s, m, e);

        public static void SetGlow(Material m, float v) { if (m != null && m.HasProperty("_Intensity")) m.SetFloat("_Intensity", v); }
    }
}
