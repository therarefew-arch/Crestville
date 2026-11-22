using UnityEngine;

namespace HalcyonNoir
{
    // A long, low four-door from the forties: a hood that goes on forever, swollen fenders, a split
    // windshield, whitewalls and a lot of chrome. Vane's is black. Parked cars along the street use the
    // same body in tired colors with their lights off. The car faces local +z; the driver sits on the left.
    public class Car : MonoBehaviour
    {
        public Transform[] Wheels;
        public Transform DriverDoor;
        public Vector3 DriverSeat => transform.TransformPoint(new Vector3(-0.42f, -0.6f, -0.42f));   // where a seated Figure's root goes
        public Vector3 PassengerSeat => transform.TransformPoint(new Vector3(0.42f, -0.6f, -0.42f));
        public Vector3 DriverDoorStep => transform.TransformPoint(new Vector3(-1.45f, 0, -0.35f));
        public Light[] Headlights;
        float spin;
        public float Speed;   // m/s, for the wheels

        public static Car Make(Transform parent, Vector3 pos, float yaw, Color paint, bool lightsOn, string name = "Car")
        {
            var root = new GameObject(name).transform;
            root.SetParent(parent, false);
            root.position = pos;
            root.rotation = Quaternion.Euler(0, yaw, 0);
            var c = root.gameObject.AddComponent<Car>();
            c.BuildBody(paint, lightsOn);
            return c;
        }

        void BuildBody(Color paintColor, bool lightsOn)
        {
            var t = transform;
            var paint = Mats.Toon(paintColor, null, 0.03f);
            var chrome = Mats.Toon(new Color(0.75f, 0.76f, 0.8f), null, 0.02f);
            var rubber = Mats.Toon(new Color(0.04f, 0.04f, 0.045f));
            var white = Mats.Toon(new Color(0.85f, 0.84f, 0.8f));
            var glass = Mats.Toon(new Color(0.06f, 0.08f, 0.11f), null, 0.01f);
            var leather = Mats.Toon(new Color(0.25f, 0.1f, 0.07f));
            var dash = Mats.Toon(new Color(0.12f, 0.08f, 0.06f));

            // body: a long tub, the hood stretched out in front, a rounded trunk behind
            P(PrimitiveType.Cube, new Vector3(0, 0.62f, -0.1f), new Vector3(1.9f, 0.46f, 5.2f), paint);
            P(PrimitiveType.Capsule, new Vector3(0, 0.78f, 1.25f), new Vector3(1.25f, 1.3f, 0.55f), paint, new Vector3(90, 0, 0));      // hood
            P(PrimitiveType.Sphere, new Vector3(0, 0.66f, -2.55f), new Vector3(1.85f, 0.62f, 1.0f), paint);                             // trunk
            // fenders: fat teardrops over each wheel
            for (int sx = -1; sx <= 1; sx += 2)
            {
                P(PrimitiveType.Capsule, new Vector3(sx * 0.9f, 0.58f, 1.5f), new Vector3(0.46f, 1.05f, 0.62f), paint, new Vector3(90, 0, 0));
                P(PrimitiveType.Capsule, new Vector3(sx * 0.9f, 0.58f, -1.75f), new Vector3(0.46f, 0.95f, 0.62f), paint, new Vector3(90, 0, 0));
                P(PrimitiveType.Cube, new Vector3(sx * 0.97f, 0.5f, -0.1f), new Vector3(0.03f, 0.05f, 4.4f), chrome);                    // trim line
                P(PrimitiveType.Cube, new Vector3(sx * 0.95f, 0.34f, -0.15f), new Vector3(0.12f, 0.06f, 1.7f), chrome);                  // running board
            }
            // cabin: pillars, a low roof, dark glass at the back and sides; open at the front so we can see in
            P(PrimitiveType.Cube, new Vector3(0, 1.74f, -0.55f), new Vector3(1.66f, 0.07f, 1.9f), paint);                                // roof
            P(PrimitiveType.Cube, new Vector3(0, 1.3f, -1.6f), new Vector3(1.62f, 0.86f, 0.08f), glass, new Vector3(-30, 0, 0));       // rear window
            for (int sx = -1; sx <= 1; sx += 2)
            {
                P(PrimitiveType.Cube, new Vector3(sx * 0.8f, 1.28f, 0.31f), new Vector3(0.06f, 0.96f, 0.06f), paint, new Vector3(-28, 0, 0)); // A pillar
                P(PrimitiveType.Cube, new Vector3(sx * 0.82f, 1.29f, -0.5f), new Vector3(0.06f, 0.9f, 0.07f), paint);                       // B pillar
                P(PrimitiveType.Cube, new Vector3(sx * 0.82f, 1.27f, -1.1f), new Vector3(0.03f, 0.8f, 0.95f), glass);                        // back side glass
            }
            P(PrimitiveType.Cube, new Vector3(0, 1.28f, 0.33f), new Vector3(0.05f, 0.94f, 0.04f), chrome, new Vector3(-28, 0, 0));           // windshield split
            // the driver's door, hinged at the front so it can swing open
            DriverDoor = Build.Pivot(t, "DriverDoor", new Vector3(-0.96f, 0, 0.32f));
            Build.Part(DriverDoor, PrimitiveType.Cube, new Vector3(0, 0.66f, -0.6f), new Vector3(0.06f, 0.5f, 1.15f), paint);
            Build.Part(DriverDoor, PrimitiveType.Cube, new Vector3(-0.04f, 0.78f, -1.05f), new Vector3(0.03f, 0.03f, 0.14f), chrome);

            // interior: bench seat, dash, wheel
            P(PrimitiveType.Cube, new Vector3(0, 0.32f, -0.45f), new Vector3(1.6f, 0.18f, 0.6f), leather);
            P(PrimitiveType.Cube, new Vector3(0, 0.85f, -0.78f), new Vector3(1.6f, 0.7f, 0.14f), leather, new Vector3(-12, 0, 0));
            P(PrimitiveType.Cube, new Vector3(0, 0.95f, 0.42f), new Vector3(1.6f, 0.22f, 0.25f), dash);
            P(PrimitiveType.Cube, new Vector3(0, 1.0f, 0.3f), new Vector3(0.5f, 0.12f, 0.02f), Mats.Glow(new Color(0.9f, 0.6f, 0.3f), 0.8f)); // gauges
            P(PrimitiveType.Cylinder, new Vector3(-0.42f, 1.0f, 0.12f), new Vector3(0.4f, 0.012f, 0.4f), rubber, new Vector3(-62, 0, 0));    // steering wheel
            P(PrimitiveType.Cylinder, new Vector3(-0.42f, 0.95f, 0.22f), new Vector3(0.04f, 0.14f, 0.04f), rubber, new Vector3(-62, 0, 0));

            // the face: a tall chrome waterfall grille, bumpers, round headlamps in the fenders
            for (int i = -3; i <= 3; i++)
                P(PrimitiveType.Cube, new Vector3(i * 0.075f, 0.62f, 2.58f), new Vector3(0.03f, 0.42f, 0.04f), chrome);
            P(PrimitiveType.Cube, new Vector3(0, 0.3f, 2.62f), new Vector3(1.95f, 0.1f, 0.1f), chrome);
            P(PrimitiveType.Cube, new Vector3(0, 0.33f, -3.06f), new Vector3(1.9f, 0.1f, 0.1f), chrome);
            P(PrimitiveType.Sphere, new Vector3(0, 1.0f, 2.25f), new Vector3(0.06f, 0.06f, 0.28f), chrome);                                   // hood ornament
            var lampMat = lightsOn ? Mats.Glow(new Color(1f, 0.92f, 0.75f), 3f) : Mats.Toon(new Color(0.5f, 0.5f, 0.45f));
            var tailMat = lightsOn ? Mats.Glow(new Color(1f, 0.12f, 0.08f), 2.5f) : Mats.Toon(new Color(0.3f, 0.06f, 0.05f));
            Headlights = new Light[lightsOn ? 2 : 0];
            for (int sx = -1; sx <= 1; sx += 2)
            {
                P(PrimitiveType.Cylinder, new Vector3(sx * 0.9f, 0.78f, 2.1f), new Vector3(0.26f, 0.03f, 0.26f), chrome, new Vector3(90, 0, 0));
                P(PrimitiveType.Sphere, new Vector3(sx * 0.9f, 0.78f, 2.13f), new Vector3(0.22f, 0.22f, 0.06f), lampMat);
                P(PrimitiveType.Sphere, new Vector3(sx * 0.82f, 0.68f, -2.98f), new Vector3(0.1f, 0.16f, 0.06f), tailMat);
                if (lightsOn)
                {
                    var go = new GameObject("Headlight");
                    go.transform.SetParent(t, false);
                    go.transform.localPosition = new Vector3(sx * 0.9f, 0.8f, 2.3f);
                    go.transform.localRotation = Quaternion.Euler(6, 0, 0);
                    var l = go.AddComponent<Light>();
                    l.type = LightType.Spot; l.spotAngle = 48; l.range = 38; l.intensity = 9;
                    l.color = new Color(1f, 0.9f, 0.72f);
                    Headlights[(sx + 1) / 2] = l;
                }
            }
            if (lightsOn) Build.PointLight(t, new Vector3(0, 0.7f, -3.4f), new Color(1f, 0.15f, 0.1f), 4f, 1.2f);

            // wheels with whitewalls
            Wheels = new Transform[4];
            int w = 0;
            foreach (var z in new[] { 1.55f, -1.8f })
                for (int sx = -1; sx <= 1; sx += 2)
                {
                    var piv = Build.Pivot(t, "Wheel", new Vector3(sx * 0.86f, 0.36f, z));
                    Build.Part(piv, PrimitiveType.Cylinder, Vector3.zero, new Vector3(0.72f, 0.12f, 0.72f), rubber, new Vector3(0, 0, 90));
                    Build.Part(piv, PrimitiveType.Cylinder, new Vector3(sx * 0.07f, 0, 0), new Vector3(0.5f, 0.01f, 0.5f), white, new Vector3(0, 0, 90));
                    Build.Part(piv, PrimitiveType.Cylinder, new Vector3(sx * 0.08f, 0, 0), new Vector3(0.3f, 0.012f, 0.3f), chrome, new Vector3(0, 0, 90));
                    Wheels[w++] = piv;
                }

            // a solid body so people walk around it, not through it
            var col = gameObject.AddComponent<BoxCollider>();
            col.center = new Vector3(0, 0.75f, -0.2f);
            col.size = new Vector3(2f, 1.4f, 5.6f);
        }

        GameObject P(PrimitiveType type, Vector3 lp, Vector3 s, Material m, Vector3? e = null) => Build.Part(transform, type, lp, s, m, e);

        public void SetDoor(float open01) { if (DriverDoor != null) DriverDoor.localRotation = Quaternion.Euler(0, -62f * open01, 0); }

        void Update()
        {
            if (Wheels == null || Mathf.Abs(Speed) < 0.01f) return;
            spin += Speed / 0.36f * Mathf.Rad2Deg * Time.deltaTime;
            foreach (var w in Wheels) w.localRotation = Quaternion.Euler(spin, 0, 0);
        }
    }
}
