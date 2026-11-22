using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // A Trust enforcer: grey overcoat, grey hat, heavy hands. They circle, take turns, and telegraph
    // every swing: the striking hand draws back and a pale glint shows on the knuckles.
    public class Thug : MonoBehaviour
    {
        public Figure Figure;
        public PlayerMotor Target;
        public float Hp = 60, MaxHp = 60;
        public bool IsDown => st == St.Down;
        public bool Active = true;
        public float Damage = 14f;
        public float WindupTime = 0.6f;

        static Thug tokenHolder;
        static float nextTokenAt;

        enum St { Approach, Circle, Windup, Strike, Recover, Stagger, Down }
        St st = St.Approach;
        float t, dur, circleDir;
        CharacterController cc;
        Renderer glint;
        Material glintMat;
        Vector3 knockVel;
        bool struck;

        public static Thug Make(Transform parent, Vector3 pos, float yaw, string name, float height)
        {
            var f = Figure.Make(parent, pos, yaw, new Figure.Look {
                coat = new Color(0.34f, 0.35f, 0.36f), shirt = new Color(0.12f, 0.12f, 0.13f), skin = new Color(0.74f, 0.6f, 0.52f),
                hair = new Color(0.15f, 0.13f, 0.12f), trousers = new Color(0.2f, 0.2f, 0.22f), hat = new Color(0.27f, 0.28f, 0.29f),
                hasHat = true, longCoat = true, height = height }, name);
            var th = f.gameObject.AddComponent<Thug>();
            th.Figure = f;
            th.cc = f.gameObject.AddComponent<CharacterController>();
            th.cc.height = 1.8f * height; th.cc.radius = 0.32f; th.cc.center = new Vector3(0, 0.9f * height, 0);
            th.circleDir = Random.value < 0.5f ? -1 : 1;
            th.glintMat = Mats.GlowInstance(new Color(1f, 0.92f, 0.8f), 0f);
            th.glint = Build.Part(f.ArmR, PrimitiveType.Sphere, new Vector3(0, -0.72f, 0.05f), Vector3.one * 0.16f, th.glintMat).GetComponent<Renderer>();
            th.glint.enabled = false;
            return th;
        }

        public static void ResetTokens() { tokenHolder = null; nextTokenAt = Time.time + 1.2f; }

        void Enter(St s, float d) { st = s; t = 0; dur = d; struck = false; }

        void Update()
        {
            float dt = Time.deltaTime;
            if (dt <= 0 || Target == null) return;
            t += dt;
            var to = Target.transform.position - transform.position; to.y = 0;
            float dist = to.magnitude;
            Vector3 move = Vector3.zero;
            bool face = true;

            if (!Active && st != St.Down && st != St.Stagger) { st = St.Circle; }

            switch (st)
            {
                case St.Approach:
                    if (dist > 2.6f) move = to.normalized * 3.2f;
                    else Enter(St.Circle, Random.Range(0.6f, 1.4f));
                    break;
                case St.Circle:
                {
                    // hold a ring around Vane and drift sideways, waiting for a turn to swing
                    var side = Vector3.Cross(Vector3.up, to.normalized) * circleDir;
                    float want = tokenHolder == this ? 1.4f : 2.8f;
                    move = side * 1.1f + to.normalized * Mathf.Clamp(dist - want, -1.5f, 2.5f) * 1.6f;
                    if (Random.value < dt * 0.4f) circleDir = -circleDir;
                    if (Active && !Target.Down && tokenHolder == null && Time.time >= nextTokenAt && t > dur) tokenHolder = this;
                    if (tokenHolder == this && dist < 1.8f) { Enter(St.Windup, WindupTime); Sound.I?.Play("whoosh", 0.2f, 0.9f); }
                    break;
                }
                case St.Windup:
                    if (dist > 1.5f) move = to.normalized * 1.6f;
                    if (t >= dur) Enter(St.Strike, 0.3f);
                    break;
                case St.Strike:
                    if (t < 0.1f) move = transform.forward * 4f;
                    if (!struck && t >= 0.08f)
                    {
                        struck = true;
                        var d = Target.transform.position - transform.position; d.y = 0;
                        if (d.magnitude < 1.9f && Vector3.Angle(transform.forward, d) < 50) Target.TakeHit(Damage, this);
                        else Sound.I?.Play("whoosh", 0.2f, 0.7f);
                    }
                    if (t >= dur) { Enter(St.Recover, 0.55f); }
                    break;
                case St.Recover:
                    face = false;
                    if (t >= dur) { ReleaseToken(); Enter(St.Circle, Random.Range(0.4f, 1.2f)); }
                    break;
                case St.Stagger:
                    face = false;
                    move = knockVel;
                    knockVel = Vector3.Lerp(knockVel, Vector3.zero, 1 - Mathf.Exp(-dt * 6f));
                    if (t >= dur) Enter(St.Circle, Random.Range(0.3f, 0.8f));
                    break;
                case St.Down:
                    face = false;
                    move = knockVel;
                    knockVel = Vector3.Lerp(knockVel, Vector3.zero, 1 - Mathf.Exp(-dt * 4f));
                    break;
            }

            if (face && dist > 0.1f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(to), 1 - Mathf.Exp(-dt * (st == St.Windup ? 4f : 8f)));
            // keep the gang from stacking on each other
            foreach (var o in Brawl.All)
            {
                if (o == this || o == null || o.IsDown) continue;
                var away = transform.position - o.transform.position; away.y = 0;
                if (away.magnitude < 1.2f && away.sqrMagnitude > 0.0001f) move += away.normalized * (1.2f - away.magnitude) * 4f;
            }
            if (cc.enabled) cc.Move((move + Vector3.down * 9f) * dt);
            Figure.Speed01 = st == St.Down ? 0 : Mathf.Clamp01(move.magnitude / 5f);
            Pose();
        }

        void Pose()
        {
            var f = Figure;
            glint.enabled = st == St.Windup;
            switch (st)
            {
                case St.Windup:
                {
                    float p = Mathf.Clamp01(t / dur);
                    f.ArmRPose = new Vector3(-30 + 60 * p, 0, -25 * p);   // draw the fist back
                    f.ArmLPose = new Vector3(-60, 20, 0);
                    f.BodyPose = new Vector3(0, 25 * p, 0);
                    if (glintMat.HasProperty("_Intensity")) glintMat.SetFloat("_Intensity", p * p * 5f);
                    glint.transform.localScale = Vector3.one * (0.08f + 0.14f * p);
                    break;
                }
                case St.Strike:
                    f.ArmRPose = new Vector3(-95, 0, 0); f.ArmLPose = new Vector3(-50, 20, 0); f.BodyPose = new Vector3(10, -20, 0);
                    break;
                case St.Stagger:
                    f.ArmRPose = new Vector3(-10, 0, -30); f.ArmLPose = new Vector3(-10, 0, 30); f.BodyPose = new Vector3(-20, 0, 0);
                    break;
                case St.Down:
                    f.ArmRPose = new Vector3(-170, 0, -20); f.ArmLPose = new Vector3(-170, 0, 20);
                    f.BodyPose = Vector3.Lerp(f.BodyPose ?? Vector3.zero, new Vector3(-88, 0, 0), Mathf.Clamp01(t * 3));
                    break;
                default:
                    f.ArmRPose = new Vector3(-55, -10, 0); f.ArmLPose = new Vector3(-55, 10, 0); f.BodyPose = new Vector3(5, 0, 0);
                    break;
            }
        }

        void ReleaseToken()
        {
            if (tokenHolder == this) { tokenHolder = null; nextTokenAt = Time.time + Random.Range(0.6f, 1.3f); }
        }

        public void TakeHit(float dmg, Vector3 from, float knock, bool heavy)
        {
            if (st == St.Down) return;
            // a hit during the windup interrupts it: punish greed, reward reading the glint
            bool interrupt = st == St.Windup;
            if (interrupt) dmg *= 1.4f;
            Hp -= dmg;
            var away = transform.position - from; away.y = 0;
            knockVel = away.normalized * (knock * 6f + (heavy ? 3f : 0));
            UI.I?.Floater(transform.position + Vector3.up * 2.1f, Mathf.RoundToInt(dmg).ToString(), heavy || interrupt ? new Color(1f, 0.75f, 0.35f) : Color.white, heavy ? 0.9f : 0.65f);
            Fx.I?.Sparks(transform.position + Vector3.up * 1.5f, new Color(1f, 0.9f, 0.7f), heavy ? 10 : 4, 0.2f);
            ReleaseToken();
            if (Hp <= 0)
            {
                Hp = 0;
                Enter(St.Down, 99);
                knockVel = away.normalized * 5f;
                Sound.I?.Play("thump", 0.9f, 0.9f);
                return;
            }
            // light hits only stagger if they interrupt, or if he isn't already committed to a swing
            if (heavy || interrupt || st != St.Strike) Enter(St.Stagger, heavy ? 0.9f : interrupt ? 0.7f : 0.3f);
        }

        public void Parried()
        {
            ReleaseToken();
            knockVel = -transform.forward * 3f;
            Enter(St.Stagger, 1.3f);
        }
    }

    public static class Brawl
    {
        public static readonly List<Thug> All = new List<Thug>();
    }
}
