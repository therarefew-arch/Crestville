using UnityEngine;

namespace HalcyonNoir
{
    // The Graven: Vane's giant machine. Slow and enormous; every action costs heat.
    public class GravenController : MonoBehaviour
    {
        // ----- tuning -----
        public float MaxHp = 1600;
        const float MoveSpeed = 11f, GuardSpeed = 5f, ChargeSpeed = 3f;
        const float CoolRate = 10f;
        const float BossRadius = 13f;
        public const float Radius = 3.5f;

        public float Hp;
        public float Heat;
        public bool Overheated => st == St.Overheat;
        public float Hp01 => Hp / MaxHp;
        public float Heat01 => Heat / 100f;
        public float ChargeLevel { get; private set; }
        public bool Dead => st == St.Dead;
        public bool Controllable = true;
        public bool Sharp;
        public BossController Boss;
        public System.Action OnDeath;

        enum St { Idle, Jab, Heavy, Charging, Release, Dodge, Guard, Stunned, Vent, Overheat, Finisher, Dead }
        St st = St.Idle;
        float stT, stDur;
        bool hitDone, queuedJab;
        int jabSide;
        float guardPressedAt = -9, iframesUntil, dodgeReadyAt;
        Vector3 dodgeVel, moveVel;
        float stepTimer;

        // rig
        Transform torso, head, armL, armR, foreL, foreR, legL, legR, hips, hatch;
        public bool Scripted;   // driven by a cutscene: no input, physics or state machine
        Renderer visor;
        CharacterController cc;

        public static GravenController Make(Vector3 pos, Quaternion rot)
        {
            var root = new GameObject("The Graven");
            root.transform.SetPositionAndRotation(pos, rot);
            var g = root.AddComponent<GravenController>();
            g.BuildRig();
            g.cc = root.AddComponent<CharacterController>();
            g.cc.height = 18; g.cc.radius = Radius; g.cc.center = new Vector3(0, 9, 0); g.cc.stepOffset = 1;
            g.Hp = g.MaxHp;
            return g;
        }

        // The Graven is built like the city that buried it: an art-deco tower in a greatcoat. A narrow waist
        // under a broad, tapering chest; a high collar standing up around a narrow helm, the visor sunk
        // under a heavy brow; layered plates on the shoulders; flared gauntlets over real fists; long plates
        // hanging off the back like coat-tails. Gunmetal, a little brass, amber light in thin lines.
        // (Pivot positions are fixed: the animation, cutscenes and hit points are all measured from them.)
        void BuildRig()
        {
            var t = transform;
            var steel = Mats.Toon(new Color(0.21f, 0.23f, 0.29f), null, 0.1f);
            var edge = Mats.Toon(new Color(0.4f, 0.42f, 0.5f), null, 0.1f);
            var dark = Mats.Toon(new Color(0.075f, 0.075f, 0.095f), null, 0.1f);
            var brass = Mats.Toon(new Color(0.6f, 0.48f, 0.28f), null, 0.08f);
            var glow = Mats.Glow(new Color(1f, 0.62f, 0.25f), 3f);
            var visorMat = Mats.Glow(new Color(1f, 0.7f, 0.3f), 4f);
            GameObject T(Transform p, Vector3 pos, Vector2 bottom, Vector2 top, float h, Material m, Vector3? e = null, Vector2? lean = null) => Build.Taper(p, pos, bottom, top, h, m, e, lean);
            GameObject C(Transform p, Vector3 pos, Vector3 size, Material m, Vector3? e = null) => Build.Part(p, PrimitiveType.Cube, pos, size, m, e);

            // ----- hips: a narrow pelvis, a belt, a plate between the legs and long tails behind -----
            hips = Build.Pivot(t, "Hips", new Vector3(0, 7.2f, 0));
            T(hips, new Vector3(0, -0.1f, 0), new Vector2(3.4f, 2.8f), new Vector2(5f, 3.6f), 2.2f, dark);
            C(hips, new Vector3(0, 1.05f, 0), new Vector3(5.3f, 0.5f, 3.9f), edge);
            C(hips, new Vector3(0, 1.0f, 1.98f), new Vector3(1.3f, 0.75f, 0.25f), brass);
            T(hips, new Vector3(0, -1.5f, 1.75f), new Vector2(1.1f, 0.35f), new Vector2(1.8f, 0.45f), 2.6f, steel, new Vector3(-6, 0, 0));
            for (int s = -1; s <= 1; s += 2)
            {
                T(hips, new Vector3(s * 1.35f, -2.5f, -2.25f), new Vector2(2.4f, 0.32f), new Vector2(2.5f, 0.4f), 5.6f, steel, new Vector3(16, 0, s * -3));
                C(hips, new Vector3(s * 1.35f, -5.15f, -3.0f), new Vector3(2.35f, 0.18f, 0.42f), brass, new Vector3(16, 0, s * -3));
            }

            // ----- legs: tapered thighs, a knee, a calf that narrows to the ankle, long pointed feet -----
            legL = Build.Pivot(hips, "LegL", new Vector3(-2.3f, -0.6f, 0));
            legR = Build.Pivot(hips, "LegR", new Vector3(2.3f, -0.6f, 0));
            foreach (var leg in new[] { legL, legR })
            {
                int s = leg == legL ? -1 : 1;
                T(leg, new Vector3(0, -1.9f, 0), new Vector2(1.8f, 2.0f), new Vector2(2.4f, 2.6f), 3.4f, steel);
                T(leg, new Vector3(s * 1.3f, -1.3f, 0), new Vector2(0.35f, 2.5f), new Vector2(0.35f, 2.9f), 3.2f, edge, new Vector3(0, 0, s * 8));   // outer thigh plate
                C(leg, new Vector3(0, -3.75f, 0.45f), new Vector3(1.5f, 1.5f, 1.5f), edge, new Vector3(45, 0, 0));                                   // knee
                T(leg, new Vector3(0, -5.0f, 0), new Vector2(1.5f, 1.7f), new Vector2(2.2f, 2.5f), 2.6f, dark);                                       // calf
                T(leg, new Vector3(0, -4.85f, 1.2f), new Vector2(1.1f, 0.3f), new Vector2(1.8f, 0.36f), 2.5f, steel, new Vector3(-7, 0, 0));          // shin plate
                C(leg, new Vector3(0, -4.85f, 1.42f), new Vector3(0.16f, 1.5f, 0.1f), glow, new Vector3(-7, 0, 0));
                C(leg, new Vector3(0, -6.15f, 0), new Vector3(1.3f, 0.6f, 1.4f), dark);                                                                // ankle
                T(leg, new Vector3(0, -6.2f, 0.7f), new Vector2(2.3f, 4.4f), new Vector2(1.7f, 3.2f), 0.8f, steel);                                     // foot
                T(leg, new Vector3(0, -6.25f, 3.05f), new Vector2(1.9f, 0.8f), new Vector2(0.9f, 0.4f), 0.7f, edge, new Vector3(-90, 0, 0));          // toe point
                C(leg, new Vector3(0, -6.35f, -1.75f), new Vector3(0.5f, 0.5f, 1.2f), dark, new Vector3(-18, 0, 0));                                   // heel spur
            }

            // ----- torso: a V from a narrow waist to broad shoulders -----
            torso = Build.Pivot(t, "Torso", new Vector3(0, 8.6f, 0));
            T(torso, new Vector3(0, 0.45f, 0), new Vector2(3.8f, 3.2f), new Vector2(5.2f, 3.9f), 1.8f, dark);                       // waist
            for (int i = 0; i < 3; i++) C(torso, new Vector3(0, 0.0f + i * 0.5f, 1.75f + i * 0.08f), new Vector3(3.2f + i * 0.5f, 0.3f, 0.3f), edge);   // ribs of the belly
            T(torso, new Vector3(0, 3.9f, 0), new Vector2(5.8f, 4.4f), new Vector2(9.4f, 5.3f), 5.2f, steel);                         // chest
            // the chest hatch: hinged at the bottom, it drops forward like a drawbridge to let the pilot in.
            // Behind it, the cockpit's amber light.
            Build.Part(torso, PrimitiveType.Quad, new Vector3(0, 3.4f, 2.62f), new Vector3(4.4f, 3.8f, 1), Mats.Glow(new Color(1f, 0.62f, 0.28f), 1.6f), new Vector3(0, 180, 0));
            C(torso, new Vector3(0, 3.4f, 2.4f), new Vector3(4.6f, 4f, 0.3f), Mats.Toon(new Color(0.05f, 0.04f, 0.04f)));
            hatch = Build.Pivot(torso, "Hatch", new Vector3(0, 1.2f, 2.7f));
            T(hatch, new Vector3(0, 2.2f, 0), new Vector2(4.2f, 0.5f), new Vector2(5.4f, 0.5f), 4.4f, dark);
            T(hatch, new Vector3(0, 2.2f, 0.28f), new Vector2(3.4f, 0.08f), new Vector2(4.5f, 0.08f), 3.8f, steel);
            for (int i = 0; i < 4; i++) C(hatch, new Vector3(0, 0.9f + i * 0.85f, 0.34f), new Vector3(0.9f + i * 0.85f, 0.14f, 0.08f), brass);   // the deco chevron, widening upward
            // pectoral plates either side of the hatch, and the stepped crown above it
            for (int s = -1; s <= 1; s += 2)
            {
                T(torso, new Vector3(s * 3.25f, 4.4f, 2.45f), new Vector2(2.0f, 0.45f), new Vector2(3.0f, 0.5f), 3.2f, edge, new Vector3(-8, s * 16, 0));
                C(torso, new Vector3(s * 3.4f, 3.0f, 2.5f), new Vector3(0.14f, 1.6f, 0.1f), glow, new Vector3(-8, s * 16, 0));
            }
            for (int i = 0; i < 3; i++) C(torso, new Vector3(0, 6.0f + i * 0.32f, 2.45f - i * 0.25f), new Vector3(4.2f - i * 1.1f, 0.3f, 0.6f), i == 0 ? brass : edge);

            // the high collar: plates standing up around the head, like a coat collar turned up against the rain
            C(torso, new Vector3(0, 6.75f, 0.2f), new Vector3(2.0f, 1.0f, 2.0f), dark);   // neck
            for (int s = -1; s <= 1; s += 2)
                T(torso, new Vector3(s * 1.95f, 7.55f, -0.55f), new Vector2(0.5f, 2.6f), new Vector2(0.3f, 2.0f), 2.8f, edge, new Vector3(-6, s * 24, -s * 9), new Vector2(0, -0.3f));
            T(torso, new Vector3(0, 7.5f, -1.75f), new Vector2(3.8f, 0.5f), new Vector2(4.4f, 0.4f), 2.8f, steel, new Vector3(-16, 0, 0));

            // the back: a housing, two tall stacks and two short ones, like organ pipes
            T(torso, new Vector3(0, 4.4f, -2.75f), new Vector2(4.6f, 1.5f), new Vector2(6.2f, 1.9f), 4.6f, dark);
            for (int s = -1; s <= 1; s += 2)
            {
                Build.Part(torso, PrimitiveType.Cylinder, new Vector3(s * 2.2f, 7.0f, -2.5f), new Vector3(0.9f, 2.6f, 0.9f), dark);
                Build.Part(torso, PrimitiveType.Cylinder, new Vector3(s * 2.2f, 9.5f, -2.5f), new Vector3(1.05f, 0.12f, 1.05f), brass);
                Build.Part(torso, PrimitiveType.Cylinder, new Vector3(s * 3.3f, 6.2f, -2.6f), new Vector3(0.6f, 1.9f, 0.6f), dark);
                Build.Part(torso, PrimitiveType.Cylinder, new Vector3(s * 3.3f, 8.05f, -2.6f), new Vector3(0.7f, 0.1f, 0.7f), brass);
            }

            // ----- head: a narrow helm, wider at the brow than the jaw; the visor sunk in under the brow -----
            head = Build.Pivot(torso, "Head", new Vector3(0, 6.6f, 0.4f));
            T(head, new Vector3(0, 1.5f, -0.1f), new Vector2(1.8f, 2.4f), new Vector2(2.5f, 3.1f), 2.4f, steel, null, new Vector2(0, 0.25f));
            T(head, new Vector3(0, 0.6f, 1.05f), new Vector2(0.7f, 0.9f), new Vector2(2.1f, 0.8f), 1.2f, edge, new Vector3(-8, 0, 0));       // jaw guard, tapering to a point
            visor = C(head, new Vector3(0, 1.3f, 1.42f), new Vector3(2.1f, 0.26f, 0.12f), visorMat).GetComponent<Renderer>();
            C(head, new Vector3(0, 1.3f, 1.36f), new Vector3(2.3f, 0.5f, 0.1f), Mats.Toon(new Color(0.02f, 0.02f, 0.03f)));      // the slot it sits in
            C(head, new Vector3(0, 1.72f, 1.25f), new Vector3(2.75f, 0.42f, 0.95f), steel, new Vector3(16, 0, 0));          // heavy brow
            T(head, new Vector3(0, 2.75f, -0.55f), new Vector2(0.32f, 3.2f), new Vector2(0.12f, 1.6f), 1.6f, brass, new Vector3(-28, 0, 0), new Vector2(0, -0.6f));   // crest, swept back
            for (int s = -1; s <= 1; s += 2) C(head, new Vector3(s * 1.22f, 0.95f, 0.45f), new Vector3(0.28f, 1.3f, 1.9f), dark, new Vector3(0, s * 8, 0));          // cheek plates

            // ----- shoulders and arms -----
            for (int s = -1; s <= 1; s += 2)
            {
                // three plates stepping down and out, like the setbacks on a tower
                for (int i = 0; i < 3; i++)
                    T(torso, new Vector3(s * (5.4f + 0.4f * i), 6.6f - 0.85f * i, 0), new Vector2(4.2f - 0.35f * i, 4.5f - 0.3f * i), new Vector2(3.4f - 0.35f * i, 3.9f - 0.3f * i), 0.75f, i == 0 ? edge : steel, new Vector3(0, 0, -s * (16 + 7 * i)));
                C(torso, new Vector3(s * 5.4f, 7.02f, 0), new Vector3(3.0f, 0.12f, 3.6f), brass, new Vector3(0, 0, -s * 16));
                T(torso, new Vector3(s * 4.6f, 7.6f, -1.0f), new Vector2(0.3f, 2.4f), new Vector2(0.12f, 0.8f), 1.8f, edge, new Vector3(-24, 0, -s * 8), new Vector2(0, -0.5f));   // swept fin
                C(torso, new Vector3(s * 5.6f, 4.9f, 0), new Vector3(2.4f, 2.4f, 2.4f), dark);                                     // shoulder joint

                var arm = Build.Pivot(torso, s < 0 ? "ArmL" : "ArmR", new Vector3(s * 5.8f, 4.8f, 0));
                T(arm, new Vector3(0, -2.2f, 0), new Vector2(1.5f, 1.6f), new Vector2(2.0f, 2.1f), 3.8f, dark);
                T(arm, new Vector3(s * 0.95f, -2.1f, 0), new Vector2(0.3f, 1.4f), new Vector2(0.35f, 1.9f), 2.8f, steel, new Vector3(0, 0, s * 4));
                var fore = Build.Pivot(arm, "Fore", new Vector3(0, -4.6f, 0));
                C(fore, new Vector3(0, 0.05f, 0), new Vector3(1.5f, 1.5f, 1.5f), edge, new Vector3(45, 0, 0));                  // elbow
                T(fore, new Vector3(0, 0.0f, -1.0f), new Vector2(1.0f, 1.0f), new Vector2(0.15f, 0.15f), 1.3f, dark, new Vector3(-100, 0, 0));   // elbow spike
                // the gauntlet: narrow at the elbow, flaring to a heavy cuff at the wrist
                T(fore, new Vector3(0, -2.2f, 0), new Vector2(2.9f, 3.0f), new Vector2(1.8f, 1.9f), 3.4f, steel);
                T(fore, new Vector3(0, -2.2f, 1.25f), new Vector2(1.7f, 0.3f), new Vector2(1.0f, 0.3f), 3.0f, edge, new Vector3(9, 0, 0));     // top plate
                for (int v = -1; v <= 1; v += 2) C(fore, new Vector3(s * 1.2f, -2.6f, v * 0.45f), new Vector3(0.1f, 1.8f, 0.2f), glow, new Vector3(0, 0, -s * 9));
                C(fore, new Vector3(0, -4.0f, 0), new Vector3(3.0f, 0.4f, 3.1f), brass);                                             // wrist cuff
                // a fist, not a block: palm, knuckle plate, folded fingers, thumb
                C(fore, new Vector3(0, -5.0f, -0.1f), new Vector3(2.3f, 1.9f, 2.3f), dark);
                C(fore, new Vector3(0, -5.25f, 1.22f), new Vector3(2.45f, 0.75f, 0.55f), edge);
                for (int i = 0; i < 4; i++) C(fore, new Vector3(-0.87f + i * 0.58f, -6.1f, 0.55f), new Vector3(0.52f, 0.85f, 1.5f), steel);
                C(fore, new Vector3(-s * 1.2f, -5.2f, 0.75f), new Vector3(0.6f, 1.3f, 0.7f), steel, new Vector3(0, 0, s * 18));
                if (s < 0) { armL = arm; foreL = fore; } else { armR = arm; foreR = fore; }
            }
            // its own light: a cool key from up front and a rim from behind, so the shape reads against the night
            Build.PointLight(torso, new Vector3(-4, 10, 16), new Color(0.66f, 0.74f, 0.95f), 42f, 1.7f);
            Build.PointLight(torso, new Vector3(3, 14, -13), new Color(0.55f, 0.65f, 0.95f), 34f, 1.4f);
            foreach (var r in GetComponentsInChildren<Renderer>()) r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        }

        public Vector3 FistPos(bool left) => (left ? foreL : foreR).TransformPoint(new Vector3(0, -5.2f, 0));
        public Vector3 Chest => transform.position + Vector3.up * 12f;

        // ----- cutscene control -----
        public Transform Hatch => hatch;
        public Transform RightFore => foreR;
        // The top surface of the open hatch, where the pilot stands before stepping inside.
        public Vector3 HatchStep => hatch.TransformPoint(new Vector3(0, 3.2f, 0.3f));
        public Vector3 CockpitDoor => torso.TransformPoint(new Vector3(0, 3.0f, 1.6f));
        public Vector3 ExhaustPos(int side) => torso.TransformPoint(new Vector3(side * 2.2f, 9.6f, -2.4f));
        public Vector3 VisorPos => visor.transform.position;
        public float VisorBoost;   // extra glow on the visor while it charges the finishing beam

        public void SetVisor(float intensity)
        {
            if (visor != null) visor.sharedMaterial = Mats.Glow(new Color(1f, 0.7f, 0.3f), Mathf.Max(0.5f, Mathf.Round(intensity * 2) / 2));
            visor.enabled = intensity > 0.05f;
        }

        // crouch 0..1 lowers it in the water and leans it forward; reach 0..1 puts the right hand
        // down and out, palm up; lift 0..1 brings that hand up in front of the chest; hatch 0..1 opens it.
        public void ScriptPose(float crouch, float reach, float lift, float hatchOpen)
        {
            hips.localPosition = new Vector3(0, 7.2f - 3f * crouch, 0);
            torso.localPosition = new Vector3(0, 8.6f - 3f * crouch, 0);
            legL.localEulerAngles = new Vector3(-35 * crouch, 0, -6 * crouch);
            legR.localEulerAngles = new Vector3(25 * crouch, 0, 6 * crouch);
            torso.localEulerAngles = new Vector3(Mathf.Lerp(24 * crouch, 4, lift), 0, 0);
            var idleL = new Vector3(-20, 0, 10);
            var down = new Vector3(-38, 10, 0);
            var up = new Vector3(-78, -28, 0);
            var armRot = Quaternion.Slerp(Quaternion.Slerp(Quaternion.Euler(new Vector3(-20, 0, -10)), Quaternion.Euler(down), reach), Quaternion.Euler(up), lift);
            armR.localRotation = armRot;
            foreR.localPosition = new Vector3(0, -4.6f - 1.2f * reach * (1 - lift), 0);
            foreR.localRotation = Quaternion.Euler(Mathf.Lerp(-20 * reach, -85, lift), 0, 0);
            armL.localRotation = Quaternion.Euler(Vector3.Lerp(idleL, new Vector3(-30, 0, 20), crouch));
            head.localEulerAngles = new Vector3(Mathf.Lerp(18 * reach, 8, lift), Mathf.Lerp(-6 * reach, 0, lift), 0);
            hatch.localEulerAngles = new Vector3(95 * hatchOpen, 0, 0);
        }

        // Both arms driven straight out, shoulders behind them: shoving something big away. k 0..1.
        public void ScriptShove(float k)
        {
            ScriptPose(0, 0, 0, 0);
            armR.localRotation = Quaternion.Slerp(Quaternion.Euler(-20, 0, -10), Quaternion.Euler(-86, -10, -4), k);
            armL.localRotation = Quaternion.Slerp(Quaternion.Euler(-20, 0, 10), Quaternion.Euler(-86, 10, 4), k);
            foreR.localRotation = Quaternion.Euler(-8 * k, 0, 0);
            foreL.localRotation = Quaternion.Euler(-8 * k, 0, 0);
            torso.localEulerAngles = new Vector3(16 * k, 0, 0);
            legL.localEulerAngles = new Vector3(-24 * k, 0, 0);
            legR.localEulerAngles = new Vector3(20 * k, 0, 0);
            hips.localPosition = new Vector3(0, 7.2f - 0.8f * k, 0);
        }

        // A walking stride for cutscenes: legs swing, arms counter-swing, the torso rolls a little.
        public void ScriptWalk(float phase, float amount)
        {
            ScriptPose(0, 0, 0, 0);
            float s = Mathf.Sin(phase) * amount;
            legL.localEulerAngles = new Vector3(22 * s, 0, 0);
            legR.localEulerAngles = new Vector3(-22 * s, 0, 0);
            armL.localEulerAngles = new Vector3(-20 - 14 * s, 0, 10);
            armR.localEulerAngles = new Vector3(-20 + 14 * s, 0, -10);
            torso.localEulerAngles = new Vector3(4 * amount, 6 * s, -3 * s);
            hips.localPosition = new Vector3(0, 7.2f - Mathf.Abs(s) * 0.5f, 0);
        }

        // Where Vane stands on the hand: on top of the fist block.
        public Vector3 PalmTop => foreR.TransformPoint(new Vector3(0, -5.2f, 0)) + Vector3.up * 1.5f * transform.lossyScale.y;

        void Enter(St s, float dur) { st = s; stT = 0; stDur = dur; hitDone = false; }

        float DistToBoss()
        {
            if (Boss == null) return 999;
            var d = Boss.transform.position - transform.position; d.y = 0;
            return d.magnitude - BossRadius;
        }

        bool BossInFront(float maxAngle)
        {
            if (Boss == null) return false;
            var d = Boss.transform.position - transform.position; d.y = 0;
            return Vector3.Angle(transform.forward, d) < maxAngle;
        }

        void Update()
        {
            if (Scripted) return;
            float dt = Time.deltaTime;
            if (dt <= 0 || st == St.Dead) { Animate(dt); return; }
            stT += dt;

            // face the enemy
            if (Boss != null && st != St.Finisher)
            {
                var d = Boss.transform.position - transform.position; d.y = 0;
                if (d.sqrMagnitude > 1)
                {
                    float turn = st == St.Idle || st == St.Guard ? 160f : 60f;
                    transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(d), turn * dt);
                }
            }

            // passive cooling
            if (st == St.Idle || st == St.Guard) Heat = Mathf.Max(0, Heat - CoolRate * dt);

            bool ctrl = Controllable;
            switch (st)
            {
                case St.Idle:
                    if (!ctrl) break;
                    if (In.GuardPressed || In.GuardHeld) { guardPressedAt = In.GuardPressed ? Time.time : guardPressedAt; Enter(St.Guard, 0); break; }
                    if (In.Dodge && Time.time >= dodgeReadyAt) { StartDodge(); break; }
                    if (In.Jab || queuedJab) { queuedJab = false; StartAttack(St.Jab, 0.58f, 7); break; }
                    if (In.Heavy) { StartAttack(St.Heavy, 1.25f, 15); Sound.I?.Play("whoosh", 0.5f, 0.6f); break; }
                    if (In.ChargeHeld) { Enter(St.Charging, 0); ChargeLevel = 0; Sound.I?.Play("charge", 0.6f); break; }
                    if (In.Vent && Heat > 5) { Enter(St.Vent, 1.4f); Sound.I?.Play("steam", 0.9f); break; }
                    break;
                case St.Guard:
                    if (In.GuardPressed) guardPressedAt = Time.time;
                    if (!ctrl || !In.GuardHeld) Enter(St.Idle, 0);
                    else if (In.Dodge && Time.time >= dodgeReadyAt) StartDodge();
                    break;
                case St.Jab:
                    if (ctrl && In.Jab && stT > 0.25f) queuedJab = true;
                    if (!hitDone && stT >= 0.17f) { hitDone = true; TryHit(34, 7, 15f, 0.06f, 0.6f, "jab"); }
                    if (stT >= stDur) Enter(St.Idle, 0);
                    break;
                case St.Heavy:
                    if (!hitDone && stT >= 0.6f) { hitDone = true; TryHit(95, 24, 16f, 0.11f, 1.6f, "heavy"); }
                    if (stT >= stDur) Enter(St.Idle, 0);
                    break;
                case St.Charging:
                    ChargeLevel = Mathf.Min(1f, ChargeLevel + dt / 1.4f);
                    Heat += 16f * dt;
                    if (Random.value < dt * 6) Fx.I?.Steam(FistPos(false), 2, 1f);
                    if (!ctrl || !In.ChargeHeld)
                    {
                        if (ChargeLevel < 0.2f) { ChargeLevel = 0; StartAttack(St.Jab, 0.58f, 4); }
                        else { Enter(St.Release, 1.05f); Heat += 14; Sound.I?.Play("whoosh", 0.9f, 0.5f); }
                    }
                    break;
                case St.Release:
                    if (stT < 0.22f) cc.Move(transform.forward * 28f * dt);
                    if (!hitDone && stT >= 0.22f)
                    {
                        hitDone = true;
                        float lvl = ChargeLevel;
                        TryHit(110 + 230 * lvl, 15 + 40 * lvl, 17f, 0.12f + 0.1f * lvl, 2.4f + 2 * lvl, "piston");
                        Fx.I?.Steam(FistPos(false), 30, 3f);
                        Sound.I?.Play("steam", 0.8f);
                    }
                    if (stT >= stDur) { ChargeLevel = 0; Enter(St.Idle, 0); }
                    break;
                case St.Dodge:
                    cc.Move(dodgeVel * dt * Mathf.Lerp(1.4f, 0.2f, stT / stDur));
                    if (stT >= stDur) { Enter(St.Idle, 0); dodgeReadyAt = Time.time + 0.2f; }
                    break;
                case St.Vent:
                    Heat = Mathf.Max(0, Heat - 110f * dt);
                    if (Random.value < dt * 20) Fx.I?.Steam(transform.position + Vector3.up * 16 + transform.forward * -2.4f + transform.right * Random.Range(-2.2f, 2.2f), 4, 1f);
                    if (stT >= stDur) Enter(St.Idle, 0);
                    break;
                case St.Overheat:
                    Heat = Mathf.Max(0, Heat - 30f * dt);
                    if (Random.value < dt * 25) Fx.I?.Steam(Chest + Random.insideUnitSphere * 4, 4, 2f);
                    if (stT >= stDur) { Heat = 40; Enter(St.Idle, 0); }
                    break;
                case St.Stunned:
                    if (stT >= stDur) Enter(St.Idle, 0);
                    break;
            }

            if (Heat >= 100 && st != St.Overheat && st != St.Dead && st != St.Finisher)
            {
                Heat = 100; ChargeLevel = 0;
                Enter(St.Overheat, 2.8f);
                Sound.I?.Play("steam", 1f, 0.8f);
                UI.I?.Toast("OVERHEATED — the Graven locks up", new Color(1f, 0.4f, 0.3f));
            }

            Move(dt);
            Animate(dt);
        }

        void StartAttack(St s, float dur, float heat)
        {
            Enter(s, dur);
            Heat += heat;
            if (s == St.Jab) jabSide = 1 - jabSide;
        }

        void StartDodge()
        {
            var input = In.Move;
            var dir = transform.right * input.x + transform.forward * input.y;
            if (dir.sqrMagnitude < 0.1f) dir = -transform.forward;
            dodgeVel = dir.normalized * 38f;
            Enter(St.Dodge, 0.42f);
            iframesUntil = Time.time + 0.32f;
            Heat += 12;
            Sound.I?.Play("whoosh", 0.8f, 0.8f);
            Fx.I?.Steam(transform.position + Vector3.up * 2, 10, 4f);
        }

        void Move(float dt)
        {
            Vector3 want = Vector3.zero;
            if (Controllable && (st == St.Idle || st == St.Guard || st == St.Charging))
            {
                var input = In.Move;
                float speed = st == St.Guard ? GuardSpeed : st == St.Charging ? ChargeSpeed : MoveSpeed;
                want = (transform.right * input.x + transform.forward * input.y) * speed;
            }
            moveVel = Vector3.Lerp(moveVel, want, 1 - Mathf.Exp(-dt * 4f));
            var delta = moveVel * dt + Vector3.down * 20f * dt;
            cc.Move(delta);
            Clamp();
            if (moveVel.magnitude > 2f)
            {
                stepTimer -= dt * moveVel.magnitude / MoveSpeed;
                if (stepTimer <= 0)
                {
                    stepTimer = 0.62f;
                    Sound.I?.Play("bigstep", 0.6f, Random.Range(0.85f, 1f));
                    Fx.I?.Shake(0.15f, 0.25f);
                }
            }
        }

        // Stay on the plaza and out of the boss.
        void Clamp()
        {
            var a = City.Arena;
            var p = transform.position;
            var rel = p - a; rel.y = 0;
            if (rel.magnitude > City.ArenaRadius) rel = rel.normalized * City.ArenaRadius;
            rel.x = Mathf.Clamp(rel.x, City.LandEdgeX, City.WaterEdgeX - 8f);
            var np = new Vector3(a.x + rel.x, p.y, a.z + rel.z);
            if (Boss != null)
            {
                var b = Boss.transform.position; var d = np - b; d.y = 0;
                float min = BossRadius + Radius;
                if (d.magnitude < min) { var push = d.normalized * min; np = new Vector3(b.x + push.x, np.y, b.z + push.z); }
            }
            if ((np - p).sqrMagnitude > 0.0001f)
            {
                cc.enabled = false; transform.position = np; cc.enabled = true;
            }
        }

        void TryHit(float dmg, float posture, float reach, float stop, float shake, string kind)
        {
            if (Boss == null || Boss.Dead) return;
            bool left = kind == "jab" ? jabSide == 0 : kind == "heavy";
            if (DistToBoss() <= reach && BossInFront(75))
            {
                var contact = Boss.transform.position + (transform.position - Boss.transform.position).normalized * BossRadius + Vector3.up * 9;
                float dealt = Boss.TakeHit(dmg, posture, kind, contact);
                Fx.I?.HitStop(stop);
                Fx.I?.Shake(shake, 0.35f);
                Fx.I?.Sparks(contact, new Color(1f, 0.75f, 0.4f), kind == "jab" ? 25 : 60, 2f);
                Sound.I?.Play("impact", kind == "jab" ? 0.7f : 1f, kind == "jab" ? 1.15f : 0.85f);
                if (kind == "piston") { Fx.I?.Flash(new Color(1f, 0.9f, 0.7f, 0.5f), 0.25f); Sound.I?.Play("clang", 0.6f, 0.6f); }
                Color c = Boss.Staggered ? new Color(1f, 0.85f, 0.3f) : Color.white;
                UI.I?.Floater(contact + Vector3.up * 4, Mathf.RoundToInt(dealt).ToString(), c, kind == "jab" ? 0.9f : kind == "heavy" ? 1.3f : 1.7f);
            }
            else Sound.I?.Play("whoosh", 0.5f, 0.9f);
        }

        // Called by the boss. Returns true if the hit landed.
        public bool TakeHit(float dmg, bool unblockable, string kind, float stun = 0)
        {
            if (st == St.Dead || st == St.Finisher) return false;
            if (Time.time < iframesUntil)
            {
                UI.I?.Floater(Chest + Vector3.up * 6, "DODGED", new Color(0.7f, 0.85f, 1f), 0.8f);
                return false;
            }
            if (st == St.Guard && !unblockable)
            {
                if (Time.time - guardPressedAt <= 0.22f)
                {
                    // perfect guard: no damage, the boss reels
                    Boss?.Parried();
                    Heat = Mathf.Max(0, Heat - 15);
                    Sound.I?.Play("clang", 1f, 1.1f);
                    Fx.I?.SlowMo(0.45f, 0.25f);
                    Fx.I?.Flash(new Color(1f, 1f, 1f, 0.6f), 0.2f);
                    Fx.I?.Sparks(FistPos(true), new Color(0.8f, 0.9f, 1f), 60, 3f);
                    UI.I?.Floater(Chest + Vector3.up * 6, "PERFECT GUARD", new Color(1f, 0.85f, 0.4f), 1.2f);
                    return false;
                }
                dmg *= 0.3f;
                Heat += 8;
                Sound.I?.Play("clang", 0.6f, 0.8f);
                Fx.I?.Sparks(FistPos(true), new Color(1f, 0.7f, 0.4f), 20, 2f);
            }
            if (st == St.Vent) dmg *= 1.3f;
            Hp -= dmg;
            Sound.I?.Play("impact", 1f, 0.7f);
            Fx.I?.Shake(2.2f, 0.5f);
            Fx.I?.HitStop(0.08f);
            Fx.I?.Flash(new Color(0.8f, 0.1f, 0.05f, 0.35f), 0.3f);
            UI.I?.Floater(Chest + Vector3.up * 5, Mathf.RoundToInt(dmg).ToString(), new Color(1f, 0.4f, 0.35f), 1.1f);
            if (Hp <= 0)
            {
                Hp = 0;
                Enter(St.Dead, 0);
                OnDeath?.Invoke();
                return true;
            }
            if (stun > 0) { ChargeLevel = 0; Enter(St.Stunned, stun); }
            else if (st == St.Jab || st == St.Heavy || st == St.Charging) { ChargeLevel = 0; Enter(St.Stunned, 0.35f); }
            return true;
        }

        // The finishing blow is driven by the director's cutscene.
        bool finisherPunched;
        public void BeginFinisher() { Enter(St.Finisher, 99); ChargeLevel = 1; finisherPunched = false; }
        public void FinisherPunch() { stT = 0; finisherPunched = true; }
        public void EndFinisher() { ChargeLevel = 0; VisorBoost = 0; Enter(St.Idle, 0); }

        public void ResetForFight(float hpMultiplier)
        {
            MaxHp = 1600 * hpMultiplier;
            Hp = MaxHp; Heat = 0; ChargeLevel = 0; moveVel = Vector3.zero;
            Enter(St.Idle, 0);
        }

        // ----- procedural animation -----
        void Animate(float dt)
        {
            if (armL == null) return;
            float k = 1 - Mathf.Exp(-dt * 14f);
            Vector3 aL = new Vector3(0, 0, 8), aR = new Vector3(0, 0, -8);
            float fL = 0, fR = 0; // piston extension
            Vector3 torsoRot = Vector3.zero;
            float t = stT;
            switch (st)
            {
                case St.Idle:
                    float breathe = Mathf.Sin(Time.time * 1.6f) * 2f;
                    aL = new Vector3(-20 + breathe, 0, 10); aR = new Vector3(-20 - breathe, 0, -10);
                    float walk = moveVel.magnitude / MoveSpeed;
                    float ph = Time.time * 5f;
                    legL.localEulerAngles = new Vector3(Mathf.Sin(ph) * 18 * walk, 0, 0);
                    legR.localEulerAngles = new Vector3(-Mathf.Sin(ph) * 18 * walk, 0, 0);
                    break;
                case St.Guard:
                    aL = new Vector3(-80, 30, 0); aR = new Vector3(-80, -30, 0);
                    torsoRot = new Vector3(8, 0, 0);
                    break;
                case St.Jab:
                {
                    float p = t < 0.17f ? t / 0.17f : Mathf.Max(0, 1 - (t - 0.17f) / 0.3f);
                    var punch = new Vector3(-90 * p - 20 * (1 - p), 0, 0);
                    if (jabSide == 0) { aL = punch; fL = p * 2f; aR = new Vector3(-30, 0, -10); }
                    else { aR = punch; fR = p * 2f; aL = new Vector3(-30, 0, 10); }
                    torsoRot = new Vector3(0, (jabSide == 0 ? 12 : -12) * p, 0);
                    break;
                }
                case St.Heavy:
                {
                    if (t < 0.55f) { float p = t / 0.55f; aL = new Vector3(-30 + 50 * p, 0, 25 * p); torsoRot = new Vector3(0, 30 * p, 0); }
                    else { float p = Mathf.Clamp01((t - 0.55f) / 0.1f) * Mathf.Clamp01(1 - (t - 0.8f) / 0.45f); aL = new Vector3(-95 * p, 0, 0); fL = 3.5f * p; torsoRot = new Vector3(6 * p, -25 * p, 0); }
                    aR = new Vector3(-40, 0, -10);
                    break;
                }
                case St.Finisher:
                    // braced for the visor beam: feet planted, arms thrown back, chest square to the target
                    aL = new Vector3(25, 0, 38); aR = new Vector3(25, 0, -38);
                    torsoRot = new Vector3(-6 + 10 * VisorBoost / 12f, Mathf.Sin(Time.time * 40) * 0.6f * VisorBoost / 12f, 0);
                    break;
                case St.Charging:
                    aR = new Vector3(20, 0, -20); fR = -1f + Mathf.Sin(Time.time * 30) * 0.15f * ChargeLevel;
                    aL = new Vector3(-70, 20, 0);
                    torsoRot = new Vector3(0, -30 * ChargeLevel, 0);
                    break;
                case St.Release:
                {
                    float p = Mathf.Clamp01(t / 0.2f) * Mathf.Clamp01(1 - (t - 0.5f) / 0.5f);
                    aR = new Vector3(-95 * p, 0, 0); fR = 5f * p; aL = new Vector3(-30, 0, 10);
                    torsoRot = new Vector3(8 * p, 25 * p, 0);
                    break;
                }
                case St.Dodge:
                    torsoRot = new Vector3(-10, 0, 0);
                    aL = new Vector3(-50, 0, 20); aR = new Vector3(-50, 0, -20);
                    break;
                case St.Vent:
                case St.Overheat:
                    torsoRot = new Vector3(18, 0, 0);
                    aL = new Vector3(-10, 0, 25); aR = new Vector3(-10, 0, -25);
                    break;
                case St.Stunned:
                    torsoRot = new Vector3(-18, Mathf.Sin(t * 30) * 4, 0);
                    aL = new Vector3(10, 0, 30); aR = new Vector3(10, 0, -30);
                    break;
                case St.Dead:
                    torsoRot = new Vector3(35, 0, 10);
                    aL = new Vector3(20, 0, 30); aR = new Vector3(20, 0, -30);
                    break;
            }
            armL.localRotation = Quaternion.Slerp(armL.localRotation, Quaternion.Euler(aL), k);
            armR.localRotation = Quaternion.Slerp(armR.localRotation, Quaternion.Euler(aR), k);
            foreL.localPosition = Vector3.Lerp(foreL.localPosition, new Vector3(0, -4.6f - fL, 0), k);
            foreR.localPosition = Vector3.Lerp(foreR.localPosition, new Vector3(0, -4.6f - fR, 0), k);
            torso.localRotation = Quaternion.Slerp(torso.localRotation, Quaternion.Euler(torsoRot), k);
            if (visor != null)
            {
                float flick = st == St.Overheat || st == St.Dead ? (Mathf.PerlinNoise(Time.time * 12, 0) > 0.5f ? 0.3f : 1.5f) : 4f + Heat01 * 2f + VisorBoost;
                visor.sharedMaterial = Mats.Glow(st == St.Overheat ? new Color(1f, 0.3f, 0.2f) : new Color(1f, 0.7f, 0.3f), Mathf.Round(flick * 2) / 2);
            }
        }
    }
}
