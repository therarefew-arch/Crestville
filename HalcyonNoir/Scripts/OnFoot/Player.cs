using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // Elias Vane on foot: walks relative to the camera, runs with Shift.
    // In a fight (Combat = true) the same body boxes: jab chain (LMB), haymaker (RMB),
    // guard (Shift, a well-timed press parries), dodge (Space).
    public class PlayerMotor : MonoBehaviour
    {
        public Figure Figure;
        public CharacterController Cc;
        public OrbitCamera Cam;
        public bool CanMove = true;
        public bool Scripted;   // a cutscene is moving him by hand
        float vy, stepTimer;
        const float WalkSpeed = 2.4f, RunSpeed = 5f, FightSpeed = 2.8f;

        // ----- brawling -----
        public bool Combat;
        public float Hp = 100, MaxHp = 100;
        public readonly List<Thug> Foes = new List<Thug>();
        public bool Down => cst == CSt.Down;
        enum CSt { Ready, Jab, Hook, Haymaker, Dodge, Guard, Hurt, Down }
        CSt cst = CSt.Ready;
        float cT, cDur, guardPressedAt = -9, iframesUntil;
        bool cHit, queued;
        int combo;
        float comboUntil;
        Vector3 dodgeDir;

        public static PlayerMotor Make(Transform parent, Vector3 pos, float yaw)
        {
            var f = Figure.MakeHero(parent, pos, yaw, "Vane");
            var p = f.gameObject.AddComponent<PlayerMotor>();
            p.Figure = f;
            p.Cc = f.gameObject.AddComponent<CharacterController>();
            p.Cc.height = 1.9f;
            p.Cc.radius = 0.3f;
            p.Cc.center = new Vector3(0, 0.97f, 0);
            p.Cc.stepOffset = 0.35f;
            return p;
        }

        void Update()
        {
            if (Time.deltaTime <= 0 || Scripted) return;
            if (Combat) { CombatUpdate(Time.deltaTime); return; }
            Vector2 input = CanMove ? In.Move : Vector2.zero;
            var dir = CamDir(input);
            bool run = In.Run && CanMove;
            float speed = (run ? RunSpeed : WalkSpeed) * dir.magnitude;
            if (dir.sqrMagnitude > 0.01f)
            {
                var target = Quaternion.LookRotation(dir.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, target, Time.deltaTime * 10f);
            }
            vy = Cc.isGrounded ? -1f : vy - 20f * Time.deltaTime;
            Cc.Move((dir.normalized * speed + Vector3.up * vy) * Time.deltaTime);
            Figure.Speed01 = speed < 0.1f ? 0 : speed / RunSpeed;
            Steps(speed, run);
        }

        Vector3 CamDir(Vector2 input)
        {
            var camYaw = Cam != null ? Cam.Yaw : 0f;
            var fwd = Quaternion.Euler(0, camYaw, 0) * Vector3.forward;
            var right = Quaternion.Euler(0, camYaw, 0) * Vector3.right;
            return fwd * input.y + right * input.x;
        }

        void Steps(float speed, bool run)
        {
            if (speed > 0.1f)
            {
                stepTimer -= Time.deltaTime * (run ? 1.7f : 1f);
                if (stepTimer <= 0) { stepTimer = 0.45f; Sound.I?.Play("step", run ? 0.35f : 0.22f, Random.Range(0.9f, 1.1f)); }
            }
        }

        public void FaceTowards(Vector3 p)
        {
            var d = p - transform.position; d.y = 0;
            if (d.sqrMagnitude > 0.01f) transform.rotation = Quaternion.LookRotation(d);
        }

        // ---------------- the brawl ----------------
        public void BeginCombat()
        {
            Combat = true; Hp = MaxHp; cst = CSt.Ready; combo = 0;
            Figure.ArmLPose = Figure.ArmRPose = null; Figure.BodyPose = null;
        }
        public void EndCombat()
        {
            Combat = false; cst = CSt.Ready;
            Figure.ArmLPose = Figure.ArmRPose = null; Figure.BodyPose = null;
            Figure.ForeLBend = Figure.ForeRBend = -1;
        }

        Thug Nearest(float maxDist = 99f)
        {
            Thug best = null; float bd = maxDist;
            foreach (var f in Foes)
            {
                if (f == null || f.IsDown) continue;
                float d = Vector3.Distance(f.transform.position, transform.position);
                if (d < bd) { bd = d; best = f; }
            }
            return best;
        }

        void Enter(CSt s, float dur) { cst = s; cT = 0; cDur = dur; cHit = false; }

        void CombatUpdate(float dt)
        {
            cT += dt;
            bool ctrl = CanMove;
            var target = Nearest(6f);
            Vector3 move = Vector3.zero;

            switch (cst)
            {
                case CSt.Ready:
                    if (!ctrl) break;
                    move = CamDir(In.Move) * FightSpeed;
                    if (In.GuardPressed || In.GuardHeld) { if (In.GuardPressed) guardPressedAt = Time.time; Enter(CSt.Guard, 0); break; }
                    if (In.Dodge) { StartDodge(); break; }
                    if (In.Jab || queued)
                    {
                        queued = false;
                        if (Time.time > comboUntil) combo = 0;
                        combo++;
                        if (combo >= 3) { Enter(CSt.Hook, 0.55f); combo = 0; Sound.I?.Play("whoosh", 0.35f, 1.6f); }
                        else { Enter(CSt.Jab, 0.3f); Sound.I?.Play("whoosh", 0.25f, 2.2f); }
                        break;
                    }
                    if (In.Heavy) { Enter(CSt.Haymaker, 0.85f); combo = 0; Sound.I?.Play("whoosh", 0.4f, 1.2f); }
                    break;
                case CSt.Guard:
                    if (In.GuardPressed) guardPressedAt = Time.time;
                    move = CamDir(In.Move) * FightSpeed * 0.45f;
                    if (!ctrl || !In.GuardHeld) Enter(CSt.Ready, 0);
                    else if (In.Dodge) StartDodge();
                    break;
                case CSt.Jab:
                    if (ctrl && In.Jab && cT > 0.1f) queued = true;
                    if (!cHit && cT >= 0.11f) { cHit = true; Strike(9, 1.75f, 0.25f, false); comboUntil = Time.time + 0.7f; }
                    if (cT >= cDur) Enter(CSt.Ready, 0);
                    break;
                case CSt.Hook:
                    if (!cHit && cT >= 0.2f) { cHit = true; Strike(17, 1.85f, 0.55f, false); }
                    if (cT >= cDur) Enter(CSt.Ready, 0);
                    break;
                case CSt.Haymaker:
                    if (cT < 0.4f && target != null) Turn(target.transform.position, 8f * dt);
                    if (!cHit && cT >= 0.42f) { cHit = true; Strike(26, 1.95f, 1.0f, true); }
                    if (cT >= cDur) Enter(CSt.Ready, 0);
                    break;
                case CSt.Dodge:
                    move = dodgeDir * Mathf.Lerp(9f, 1.5f, cT / cDur);
                    if (cT >= cDur) Enter(CSt.Ready, 0);
                    break;
                case CSt.Hurt:
                    if (cT >= cDur) Enter(CSt.Ready, 0);
                    break;
                case CSt.Down:
                    break;
            }

            // soft lock: square up to the nearest man while fighting
            if (target != null && cst != CSt.Dodge && cst != CSt.Down) Turn(target.transform.position, (cst == CSt.Ready && move.sqrMagnitude > 0.1f ? 6f : 12f) * dt);
            else if (move.sqrMagnitude > 0.1f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(move), dt * 10f);

            vy = Cc.isGrounded ? -1f : vy - 20f * dt;
            Cc.Move((move + Vector3.up * vy) * dt);
            Figure.Speed01 = cst == CSt.Dodge ? 0.8f : move.magnitude > 0.2f ? move.magnitude / RunSpeed : 0;
            Steps(move.magnitude, false);
            Pose();
        }

        void Turn(Vector3 at, float k)
        {
            var d = at - transform.position; d.y = 0;
            if (d.sqrMagnitude > 0.01f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(d), Mathf.Clamp01(k));
        }

        void StartDodge()
        {
            var d = CamDir(In.Move);
            dodgeDir = d.sqrMagnitude > 0.05f ? d.normalized : -transform.forward;
            Enter(CSt.Dodge, 0.36f);
            iframesUntil = Time.time + 0.28f;
            combo = 0;
            Sound.I?.Play("whoosh", 0.3f, 1.8f);
        }

        void Strike(float dmg, float reach, float knock, bool heavy)
        {
            bool any = false;
            foreach (var f in Foes)
            {
                if (f == null || f.IsDown) continue;
                var d = f.transform.position - transform.position; d.y = 0;
                if (d.magnitude > reach || Vector3.Angle(transform.forward, d) > 55) continue;
                f.TakeHit(dmg, transform.position, knock, heavy);
                any = true;
            }
            if (any)
            {
                Sound.I?.Play("thump", heavy ? 0.8f : 0.5f, heavy ? 1.6f : 2.2f);
                Fx.I?.HitStop(heavy ? 0.09f : 0.04f);
                Fx.I?.Shake(heavy ? 0.12f : 0.05f, 0.15f);
            }
        }

        // A thug's punch lands (or doesn't). Returns false when it was dodged or parried.
        public bool TakeHit(float dmg, Thug from)
        {
            if (cst == CSt.Down) return false;
            if (Time.time < iframesUntil) { UI.I?.Floater(transform.position + Vector3.up * 2f, "Dodged", new Color(0.7f, 0.85f, 1f), 0.6f); return false; }
            var d = from.transform.position - transform.position; d.y = 0;
            bool facing = Vector3.Angle(transform.forward, d) < 75;
            if (cst == CSt.Guard && facing)
            {
                if (Time.time - guardPressedAt < 0.22f)
                {
                    // parry: he's wide open
                    from.Parried();
                    Sound.I?.Play("clang", 0.35f, 2.2f);
                    Fx.I?.SlowMo(0.35f, 0.3f);
                    UI.I?.Floater(transform.position + Vector3.up * 2f, "Parry", new Color(1f, 0.8f, 0.4f), 0.8f);
                    return false;
                }
                Hp -= dmg * 0.25f;
                Sound.I?.Play("thump", 0.4f, 1.3f);
                Fx.I?.Shake(0.05f, 0.1f);
            }
            else
            {
                Hp -= dmg;
                Sound.I?.Play("impact", 0.35f, 2.4f);
                Fx.I?.Shake(0.2f, 0.25f);
                Fx.I?.Flash(new Color(0.5f, 0f, 0f, 0.25f), 0.25f);
                Enter(CSt.Hurt, 0.45f);
                combo = 0;
            }
            if (Hp <= 0) { Hp = 0; Enter(CSt.Down, 99); Sound.I?.Play("thump", 0.8f, 0.8f); }
            return true;
        }

        void Pose()
        {
            var f = Figure;
            float t = cT;
            Vector3 guardL = new Vector3(-75, 25, 0), guardR = new Vector3(-75, -25, 0);
            switch (cst)
            {
                case CSt.Ready:
                    // a loose boxer's stance, hands up
                    f.ArmLPose = new Vector3(-55, 20, 5); f.ArmRPose = new Vector3(-45, -15, -5);
                    f.ForeLBend = 110; f.ForeRBend = 120;
                    f.BodyPose = new Vector3(6, 0, 0);
                    break;
                case CSt.Guard:
                    f.ArmLPose = guardL; f.ArmRPose = guardR; f.ForeLBend = 135; f.ForeRBend = 135;
                    f.BodyPose = new Vector3(12, 0, 0);
                    break;
                case CSt.Jab:
                {
                    float p = t < 0.11f ? t / 0.11f : Mathf.Max(0, 1 - (t - 0.11f) / 0.18f);
                    bool left = combo % 2 == 1;
                    var punch = new Vector3(-88 * p - 50 * (1 - p), 0, 0);
                    if (left) { f.ArmLPose = punch; f.ForeLBend = Mathf.Lerp(110, 5, p); f.ArmRPose = new Vector3(-50, -15, -5); f.ForeRBend = 120; }
                    else { f.ArmRPose = punch; f.ForeRBend = Mathf.Lerp(120, 5, p); f.ArmLPose = new Vector3(-55, 20, 5); f.ForeLBend = 110; }
                    f.BodyPose = new Vector3(8, (left ? 14 : -14) * p, 0);
                    break;
                }
                case CSt.Hook:
                {
                    float p = t < 0.2f ? t / 0.2f : Mathf.Max(0, 1 - (t - 0.2f) / 0.3f);
                    f.ArmRPose = new Vector3(-85, -70 * p + 40 * (1 - p), -20); f.ForeRBend = 80;
                    f.ArmLPose = new Vector3(-55, 20, 5); f.ForeLBend = 110;
                    f.BodyPose = new Vector3(8, -35 * p + 20 * (1 - p), 0);
                    break;
                }
                case CSt.Haymaker:
                {
                    if (t < 0.4f) { float p = t / 0.4f; f.ArmRPose = new Vector3(-20 + 40 * p, 0, -30 * p); f.ForeRBend = 90; f.BodyPose = new Vector3(0, 30 * p, 0); }
                    else { float p = Mathf.Clamp01((t - 0.4f) / 0.08f) * Mathf.Clamp01(1 - (t - 0.6f) / 0.25f); f.ArmRPose = new Vector3(-95 * p, -10 * p, 0); f.ForeRBend = Mathf.Lerp(90, 0, p); f.BodyPose = new Vector3(14 * p, -30 * p, 0); }
                    f.ArmLPose = new Vector3(-55, 20, 5); f.ForeLBend = 110;
                    break;
                }
                case CSt.Dodge:
                    f.ArmLPose = guardL; f.ArmRPose = guardR; f.BodyPose = new Vector3(22, 0, 0);
                    break;
                case CSt.Hurt:
                    f.ArmLPose = new Vector3(-20, 0, 20); f.ArmRPose = new Vector3(-20, 0, -20); f.ForeLBend = 40; f.ForeRBend = 40;
                    f.BodyPose = new Vector3(-18, 0, 6);
                    break;
                case CSt.Down:
                    f.ArmLPose = new Vector3(10, 0, 30); f.ArmRPose = new Vector3(10, 0, -30);
                    f.BodyPose = new Vector3(-70, 0, 0);
                    break;
            }
        }
    }

    // Third-person camera that orbits with the mouse and stays out of walls.
    public class OrbitCamera : MonoBehaviour
    {
        public Transform Target;
        public float Yaw, Pitch = 12f, Distance = 4.2f;
        public Vector3 Offset = new Vector3(0, 1.65f, 0);
        public bool Control = true;
        // Optional fixed cinematic shot (set by cutscenes)
        public bool Cinematic;
        public Vector3 CinePos, CineLook;
        public float CineSpeed = 2.5f;
        public Transform CineAnchor;    // when set, CinePos and CineLook are local to it and the camera rides along rigidly (the drive)
        float curDist;

        void LateUpdate()
        {
            if (Cinematic && CineAnchor != null)
            {
                transform.position = CineAnchor.TransformPoint(CinePos);
                transform.rotation = Quaternion.LookRotation(CineAnchor.TransformPoint(CineLook) - transform.position);
                if (Fx.I != null) transform.position += transform.rotation * Fx.I.ShakeOffset;
                return;
            }
            if (Cinematic)
            {
                transform.position = Vector3.Lerp(transform.position, CinePos, 1 - Mathf.Exp(-Time.unscaledDeltaTime * CineSpeed));
                var look = Quaternion.LookRotation(CineLook - transform.position);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, 1 - Mathf.Exp(-Time.unscaledDeltaTime * (CineSpeed + 0.5f)));
                transform.position += Fx.I != null ? transform.rotation * Fx.I.ShakeOffset : Vector3.zero;
                return;
            }
            if (Target == null) return;
            if (Control)
            {
                var l = In.Look;
                Yaw += l.x * 2.2f;
                Pitch = Mathf.Clamp(Pitch - l.y * 2.2f, -10f, 55f);
            }
            var rot = Quaternion.Euler(Pitch, Yaw, 0);
            var pivot = Target.position + Offset;
            float want = Distance;
            if (Physics.SphereCast(pivot, 0.25f, rot * Vector3.back, out var hit, Distance, ~0, QueryTriggerInteraction.Ignore))
                want = Mathf.Max(0.6f, hit.distance - 0.1f);
            curDist = Mathf.Lerp(curDist <= 0 ? want : curDist, want, 1 - Mathf.Exp(-Time.unscaledDeltaTime * (want < curDist ? 30f : 6f)));
            transform.rotation = rot;
            transform.position = pivot + rot * new Vector3(0.45f, 0, -curDist);
            if (Fx.I != null) transform.position += rot * Fx.I.ShakeOffset;
        }
    }
}
