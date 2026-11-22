using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // The Tidewarden: a crab-like Relic with a lantern for a heart.
    // Every attack is telegraphed on the ground. Amber = guard or dodge. Red = dodge only.
    public class BossController : MonoBehaviour
    {
        public float MaxHp = 3200;
        public float Hp;
        public float Posture;           // 0..100, stagger at 100
        public bool Active;
        public bool Sharp;              // the deduction marked the core
        public float ArmorTaken = 1f;   // damage multiplier from the deduction outcome
        public GravenController Target;
        public System.Action OnPhaseChange;

        public float Hp01 => Hp / MaxHp;
        public float Posture01 => Posture / 100f;
        public bool Staggered => staggerT > 0;
        public bool Dead { get; private set; }
        public bool CanFinish => !Dead && Staggered && Hp01 <= 0.12f;
        public int Phase { get; private set; } = 1;
        public string PhaseName => Phase == 1 ? "THE TIDEWARDEN" : Phase == 2 ? "THE TIDEWARDEN — LANTERN WAKING" : "THE TIDEWARDEN — LOW TIDE";

        enum Atk { None, Slam, Sweep, Beam, Grab, Surge, Reel }
        Atk atk = Atk.None;
        float atkT, windup, recover, cooldown = 2.5f, staggerT, lastHitTime = -99;
        bool struck;
        Vector3 atkDir, atkPoint;
        int comboLeft;
        Atk lastAtk = Atk.None;
        float surgeRadius;
        bool surgeHit;

        // rig
        Transform body, clawL, clawR, pincerL, pincerR, lantern;
        readonly List<Transform> legs = new List<Transform>();
        Light coreLight;
        Material coreMat;
        GameObject marker;          // the deduction's mark on the core
        GameObject tele; Material teleMat;
        GameObject beamObj; Material beamMat;
        GameObject surgeObj; Material surgeMat;

        static readonly Color Amber = new Color(1f, 0.62f, 0.25f);
        static readonly Color Red = new Color(1f, 0.12f, 0.08f);
        static readonly Color Sea = new Color(0.35f, 0.85f, 0.9f);

        public static BossController Make(Vector3 pos, Quaternion rot)
        {
            var go = new GameObject("The Tidewarden");
            go.transform.SetPositionAndRotation(pos, rot);
            var b = go.AddComponent<BossController>();
            b.BuildRig();
            b.Hp = b.MaxHp;
            return b;
        }

        void BuildRig()
        {
            var t = transform;
            var shell = Mats.Toon(new Color(0.18f, 0.24f, 0.26f), null, 0.14f);
            var rust = Mats.Toon(new Color(0.38f, 0.22f, 0.15f), null, 0.12f);
            var dark = Mats.Toon(new Color(0.07f, 0.08f, 0.09f), null, 0.12f);
            var barn = Mats.Toon(new Color(0.55f, 0.55f, 0.48f), null, 0.06f);

            body = Build.Pivot(t, "Body", new Vector3(0, 9f, 0));
            Build.Part(body, PrimitiveType.Sphere, Vector3.zero, new Vector3(22, 8, 17), shell);
            Build.Part(body, PrimitiveType.Sphere, new Vector3(0, 2.6f, -1), new Vector3(16, 5, 12), rust);
            Build.Part(body, PrimitiveType.Cube, new Vector3(0, -2.6f, 0), new Vector3(14, 3, 10), dark);
            // barnacles and plates
            var rng = new System.Random(5);
            for (int i = 0; i < 26; i++)
            {
                float a = (float)rng.NextDouble() * Mathf.PI * 2, y = (float)rng.NextDouble();
                var p = new Vector3(Mathf.Cos(a) * 9.5f * (1 - y * 0.4f), 1 + y * 3.2f, Mathf.Sin(a) * 7.2f * (1 - y * 0.4f));
                Build.Part(body, PrimitiveType.Sphere, p, Vector3.one * (0.6f + (float)rng.NextDouble() * 1.2f), barn);
            }
            for (int i = -2; i <= 2; i++) Build.Part(body, PrimitiveType.Cube, new Vector3(i * 3.2f, 4.6f, -1), new Vector3(2.2f, 1.2f, 9), dark, new Vector3(0, 0, i * 8));

            // the lantern core, set into the front of the shell
            lantern = Build.Pivot(body, "Lantern", new Vector3(0, 0.2f, 8.2f));
            Build.Part(lantern, PrimitiveType.Cylinder, Vector3.zero, new Vector3(5.2f, 0.6f, 5.2f), dark, new Vector3(90, 0, 0));
            coreMat = Mats.GlowInstance(Sea, 3f);
            Build.Part(lantern, PrimitiveType.Sphere, new Vector3(0, 0, 0.4f), Vector3.one * 3.6f, coreMat);
            for (int i = 0; i < 4; i++) Build.Part(lantern, PrimitiveType.Cube, new Vector3(0, 0, 1.2f), new Vector3(0.35f, 4.4f, 0.35f), dark, new Vector3(0, 0, i * 45));
            coreLight = Build.PointLight(lantern, new Vector3(0, 0, 3), Sea, 45, 4);
            marker = Build.Part(lantern, PrimitiveType.Cylinder, new Vector3(0, 0, 2.4f), new Vector3(5.6f, 0.05f, 5.6f), Mats.Glow(new Color(1f, 0.85f, 0.4f), 2f), new Vector3(90, 0, 0));
            marker.SetActive(false);

            // eyes on stalks
            for (int s = -1; s <= 1; s += 2)
            {
                Build.Part(body, PrimitiveType.Cylinder, new Vector3(s * 3, 4.5f, 6), new Vector3(0.6f, 2f, 0.6f), dark);
                Build.Part(body, PrimitiveType.Sphere, new Vector3(s * 3, 6.6f, 6), Vector3.one * 1.3f, Mats.Glow(Sea, 2.5f));
            }

            // six legs
            for (int i = 0; i < 6; i++)
            {
                int side = i < 3 ? -1 : 1;
                float z = (i % 3 - 1) * 5.5f;
                var hip = Build.Pivot(body, "Leg", new Vector3(side * 9, -1, z));
                hip.localEulerAngles = new Vector3(0, side * (90 + (i % 3 - 1) * 25), 0);
                Build.Part(hip, PrimitiveType.Cube, new Vector3(0, 1.5f, 4.5f), new Vector3(1.6f, 1.6f, 9), shell, new Vector3(-20, 0, 0));
                Build.Part(hip, PrimitiveType.Cube, new Vector3(0, -3f, 9.5f), new Vector3(1.3f, 9, 1.3f), dark, new Vector3(18, 0, 0));
                legs.Add(hip);
            }

            // two great claws
            for (int s = -1; s <= 1; s += 2)
            {
                var shoulder = Build.Pivot(body, s < 0 ? "ClawL" : "ClawR", new Vector3(s * 8.5f, 0, 6));
                Build.Part(shoulder, PrimitiveType.Cube, new Vector3(0, 0, 4.5f), new Vector3(2.6f, 2.6f, 9), shell);
                var hand = Build.Pivot(shoulder, "Hand", new Vector3(0, 0, 10));
                Build.Part(hand, PrimitiveType.Sphere, new Vector3(0, 0, 2.5f), new Vector3(6, 5, 8), rust);
                Build.Part(hand, PrimitiveType.Cube, new Vector3(0, 1.6f, 7.5f), new Vector3(2.4f, 1.6f, 6), shell, new Vector3(-10, 0, 0));
                var pincer = Build.Pivot(hand, "Pincer", new Vector3(0, -1f, 5));
                Build.Part(pincer, PrimitiveType.Cube, new Vector3(0, 0, 2.5f), new Vector3(2.2f, 1.4f, 5.4f), shell, new Vector3(10, 0, 0));
                if (s < 0) { clawL = shoulder; pincerL = pincer; } else { clawR = shoulder; pincerR = pincer; }
            }
            foreach (var r in GetComponentsInChildren<Renderer>()) r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;

            // telegraphs
            teleMat = Mats.GlowInstance(Amber, 1f);
            tele = Build.MeshObject("Telegraph", Build.Sector(1, 360, 48), teleMat);
            tele.SetActive(false);
            beamMat = Mats.GlowInstance(Sea, 4f);
            beamObj = Build.Part(null, PrimitiveType.Cylinder, Vector3.zero, Vector3.one, beamMat, null, false, "Beam");
            beamObj.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            beamObj.SetActive(false);
            surgeMat = Mats.GlowInstance(Red, 1.5f);
            surgeObj = Build.MeshObject("Surge", Build.Sector(1, 360, 64, 0.9f), surgeMat);
            surgeObj.SetActive(false);
        }

        public void SetSharp(bool sharp) { Sharp = sharp; if (marker != null) marker.SetActive(sharp); }

        public void ResetForFight()
        {
            Hp = MaxHp; Posture = 0; staggerT = 0; Phase = 1; Dead = false;
            atk = Atk.None; cooldown = 3f; comboLeft = 0;
            HideTelegraphs();
        }

        void HideTelegraphs()
        {
            if (tele) tele.SetActive(false);
            if (beamObj) beamObj.SetActive(false);
            if (surgeObj) surgeObj.SetActive(false);
        }

        Vector3 Flat(Vector3 v) { v.y = 0; return v; }
        Vector3 ToTarget => Target != null ? Flat(Target.transform.position - transform.position) : transform.forward;

        void Update()
        {
            float dt = Time.deltaTime;
            if (dt <= 0) return;
            AnimateIdle(dt);
            if (Dead || !Active || Target == null) return;

            // posture recovers if left alone
            if (Time.time - lastHitTime > 2.5f && !Staggered) Posture = Mathf.Max(0, Posture - 6f * dt);

            if (Staggered)
            {
                staggerT -= dt;
                body.localPosition = Vector3.Lerp(body.localPosition, new Vector3(0, 5.5f, 0), dt * 5);
                coreLight.intensity = 6 + Mathf.Sin(Time.time * 14) * 3;
                if (staggerT <= 0) { Posture = 0; cooldown = 0.6f; Sound.I?.Play("roar", 0.8f, 1.1f); }
                return;
            }

            if (atk == Atk.None)
            {
                // drift and turn to face the Graven
                var to = ToTarget;
                float dist = to.magnitude;
                var face = Quaternion.LookRotation(to.sqrMagnitude > 0.1f ? to : transform.forward);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, face, (Phase == 3 ? 70 : 50) * dt);
                Vector3 move = Vector3.zero;
                if (dist > 30) move = to.normalized * (Phase == 3 ? 9 : 7);
                else if (dist < 20) move = -to.normalized * 4;
                move += transform.right * Mathf.Sin(Time.time * 0.7f) * 3f; // crab sidestep
                transform.position += move * dt;
                ClampToArena();
                cooldown -= dt;
                if (cooldown <= 0) ChooseAttack(dist);
            }
            else RunAttack(dt);
        }

        void ClampToArena()
        {
            var a = City.Arena;
            var rel = Flat(transform.position - a);
            if (rel.magnitude > City.ArenaRadius - 6) rel = rel.normalized * (City.ArenaRadius - 6);
            rel.x = Mathf.Min(rel.x, City.WaterEdgeX + 8);
            transform.position = new Vector3(a.x + rel.x, transform.position.y, a.z + rel.z);
        }

        void ChooseAttack(float dist)
        {
            var options = new List<Atk>();
            if (dist < 34) { options.Add(Atk.Slam); options.Add(Atk.Sweep); }
            if (dist < 24) options.Add(Atk.Grab);
            if (dist > 18 || Phase >= 2) options.Add(Atk.Beam);
            if (Phase == 3 && lastAtk != Atk.Surge) { options.Add(Atk.Surge); }
            if (options.Count == 0) options.Add(Atk.Beam);
            if (options.Count > 1) options.Remove(lastAtk);
            var pick = options[Random.Range(0, options.Count)];
            Begin(pick);
            if (comboLeft <= 0 && Phase >= 2 && (pick == Atk.Slam || pick == Atk.Sweep) && Random.value < (Phase == 3 ? 0.6f : 0.35f))
                comboLeft = Phase == 3 ? 2 : 1;
        }

        void Begin(Atk a)
        {
            atk = a; lastAtk = a; atkT = 0; struck = false;
            float speed = Phase == 1 ? 1f : Phase == 2 ? 0.85f : 0.72f;
            atkDir = ToTarget.normalized;
            switch (a)
            {
                case Atk.Slam:
                    windup = 1.15f * speed; recover = 1.3f;
                    atkPoint = transform.position + atkDir * Mathf.Clamp(ToTarget.magnitude, 14, 26);
                    ShowCircle(atkPoint, 11, Amber);
                    Sound.I?.Play("rumble", 0.6f, 1.2f);
                    break;
                case Atk.Sweep:
                    windup = 1.0f * speed; recover = 1.1f;
                    ShowSector(transform.position, atkDir, 38, 150, Amber);
                    Sound.I?.Play("whoosh", 0.4f, 0.4f);
                    break;
                case Atk.Beam:
                    windup = 1.5f * speed; recover = 1.6f;
                    ShowSector(transform.position, atkDir, 140, 9, Amber);
                    Sound.I?.Play("charge", 0.8f, 0.6f);
                    break;
                case Atk.Grab:
                    windup = 0.95f * speed; recover = 1.4f;
                    ShowSector(transform.position, atkDir, 32, 70, Red);
                    Sound.I?.Play("roar", 0.6f, 1.4f);
                    UI.I?.Toast("UNBLOCKABLE — dodge", Red);
                    break;
                case Atk.Surge:
                    windup = 1.6f; recover = 2f;
                    surgeRadius = 8; surgeHit = false;
                    ShowCircle(transform.position, 18, Red);
                    Sound.I?.Play("roar", 1f, 0.7f);
                    Sound.I?.Play("rumble", 1f, 0.8f);
                    UI.I?.Toast("THE TIDE IS COMING — dodge through the wave", Red);
                    break;
                case Atk.Reel:
                    windup = 0; recover = 1.4f; struck = true;
                    HideTelegraphs();
                    break;
            }
        }

        void ShowCircle(Vector3 c, float r, Color col)
        {
            tele.SetActive(true);
            tele.GetComponent<MeshFilter>().sharedMesh = circleMesh ?? (circleMesh = Build.Sector(1, 360, 48));
            tele.transform.position = new Vector3(c.x, 0.08f, c.z);
            tele.transform.rotation = Quaternion.identity;
            tele.transform.localScale = new Vector3(r, 1, r);
            teleColor = col;
        }
        Mesh circleMesh;
        readonly Dictionary<int, Mesh> sectorCache = new Dictionary<int, Mesh>();
        Color teleColor;

        void ShowSector(Vector3 origin, Vector3 dir, float r, float angle, Color col)
        {
            tele.SetActive(true);
            int key = Mathf.RoundToInt(angle);
            if (!sectorCache.TryGetValue(key, out var m)) sectorCache[key] = m = Build.Sector(1, angle, 40);
            tele.GetComponent<MeshFilter>().sharedMesh = m;
            tele.transform.position = new Vector3(origin.x, 0.08f, origin.z);
            tele.transform.rotation = Quaternion.LookRotation(dir);
            tele.transform.localScale = new Vector3(r, 1, r);
            teleColor = col;
        }

        void RunAttack(float dt)
        {
            atkT += dt;
            // telegraph pulses brighter as the strike approaches
            if (tele.activeSelf && !struck)
            {
                float p = Mathf.Clamp01(atkT / Mathf.Max(0.01f, windup));
                float pulse = 0.25f + 0.75f * p + Mathf.Sin(atkT * (10 + p * 25)) * 0.15f;
                Mats.SetGlowColor(teleMat, teleColor * pulse * 0.6f);
            }
            if (atk == Atk.Beam && atkT < windup * 0.6f)
            {
                // the beam tracks until it locks
                var to = ToTarget.normalized;
                atkDir = Vector3.RotateTowards(atkDir, to, 0.9f * dt, 0);
                tele.transform.rotation = Quaternion.LookRotation(atkDir);
            }
            if (atk != Atk.Surge && atk != Atk.Reel)
                transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(atkDir), 90 * dt);

            if (!struck && atkT >= windup) { struck = true; Strike(); }

            if (atk == Atk.Surge && struck) UpdateSurge(dt);
            if (atk == Atk.Beam && struck && beamObj.activeSelf)
            {
                float fade = 1 - Mathf.Clamp01((atkT - windup) / 0.6f);
                beamObj.transform.localScale = new Vector3(3f * fade + 0.1f, 70, 3f * fade + 0.1f);
                if (fade <= 0) beamObj.SetActive(false);
            }

            if (atkT >= windup + recover)
            {
                atk = Atk.None;
                HideTelegraphs();
                if (comboLeft > 0) { comboLeft--; Begin(Random.value < 0.5f ? Atk.Slam : Atk.Sweep); windup *= 0.8f; }
                else cooldown = Phase == 1 ? Random.Range(1.6f, 2.4f) : Phase == 2 ? Random.Range(1.1f, 1.8f) : Random.Range(0.7f, 1.3f);
            }
        }

        bool InSector(Vector3 origin, Vector3 dir, float r, float angle)
        {
            var d = Flat(Target.transform.position - origin);
            float dist = d.magnitude - GravenController.Radius;
            return dist <= r && Vector3.Angle(dir, d) <= angle * 0.5f + 6;
        }

        void Strike()
        {
            tele.SetActive(atk == Atk.Surge);
            float mult = Phase == 3 ? 1.15f : 1f;
            switch (atk)
            {
                case Atk.Slam:
                {
                    Sound.I?.Play("thump", 1f, 0.6f); Sound.I?.Play("impact", 0.8f, 0.5f);
                    Fx.I?.Shake(3f, 0.6f); Fx.I?.Debris(atkPoint + Vector3.up, 40, 8); Fx.I?.Splash(atkPoint, 30, 8);
                    var d = Flat(Target.transform.position - atkPoint).magnitude - GravenController.Radius;
                    if (d <= 11) Target.TakeHit(210 * mult, false, "slam", 0.7f);
                    break;
                }
                case Atk.Sweep:
                    Sound.I?.Play("whoosh", 1f, 0.5f); Fx.I?.Shake(1.5f, 0.4f);
                    if (InSector(transform.position, atkDir, 38, 150)) Target.TakeHit(150 * mult, false, "sweep");
                    break;
                case Atk.Beam:
                {
                    Sound.I?.Play("steam", 1f, 0.5f); Sound.I?.Play("clang", 0.5f, 0.4f);
                    Fx.I?.Flash(new Color(Sea.r, Sea.g, Sea.b, 0.4f), 0.3f); Fx.I?.Shake(2f, 0.5f);
                    var from = lantern.position;
                    beamObj.SetActive(true);
                    beamObj.transform.position = from + atkDir * 70 + Vector3.down * (from.y - 6) * 0.5f;
                    beamObj.transform.rotation = Quaternion.FromToRotation(Vector3.up, atkDir);
                    beamObj.transform.position = new Vector3(from.x, 7, from.z) + atkDir * 70;
                    if (InSector(transform.position, atkDir, 140, 9)) Target.TakeHit(250 * mult, false, "beam", 0.5f);
                    break;
                }
                case Atk.Grab:
                    Sound.I?.Play("clang", 1f, 0.5f); Fx.I?.Shake(1.8f, 0.4f);
                    if (InSector(transform.position, atkDir, 32, 70))
                    {
                        if (Target.TakeHit(300 * mult, true, "grab", 1.3f))
                            UI.I?.Toast("Seized — the claws close on the Graven's chest", Red);
                    }
                    break;
                case Atk.Surge:
                    Sound.I?.Play("rumble", 1f, 0.6f); Sound.I?.Play("thump", 1f, 0.4f);
                    Fx.I?.Shake(3.5f, 1.2f); Fx.I?.Splash(transform.position, 80, 20);
                    surgeObj.SetActive(true);
                    break;
            }
        }

        void UpdateSurge(float dt)
        {
            surgeRadius += 34f * Time.deltaTime;
            surgeObj.transform.position = new Vector3(transform.position.x, 0.12f, transform.position.z);
            surgeObj.transform.localScale = new Vector3(surgeRadius, 1, surgeRadius);
            Mats.SetGlowColor(surgeMat, Red * (0.9f + Mathf.Sin(Time.time * 20) * 0.2f));
            if (Random.value < dt * 30)
            {
                float a = Random.value * Mathf.PI * 2;
                Fx.I?.Splash(transform.position + new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)) * surgeRadius, 6, 2);
            }
            if (!surgeHit)
            {
                float d = Flat(Target.transform.position - transform.position).magnitude;
                if (Mathf.Abs(d - surgeRadius) < 3f)
                {
                    surgeHit = true;
                    Target.TakeHit(190, true, "surge", 0.8f);
                }
            }
            if (surgeRadius > City.ArenaRadius * 2.2f) { surgeObj.SetActive(false); tele.SetActive(false); }
        }

        // Called when the Graven lands a hit. Returns damage dealt.
        public float TakeHit(float dmg, float posture, string kind, Vector3 contact)
        {
            if (Dead) return 0;
            lastHitTime = Time.time;
            bool frontal = Vector3.Angle(transform.forward, Flat(Target.transform.position - transform.position)) < 60;
            float d = dmg * ArmorTaken;
            if (Staggered)
            {
                d *= Sharp ? 3f : 2f;
                Fx.I?.Embers(lantern.position, 30, 2);
            }
            else
            {
                // hitting the lantern head-on is worth more posture; interrupting a windup even more
                if (frontal) posture *= 1.25f;
                if (atk != Atk.None && atk != Atk.Reel && !struck && kind != "jab") posture *= 1.6f;
                Posture += posture;
                if (Posture >= 100) Stagger(Sharp ? 4.5f : 4f);
            }
            Hp -= d;
            CheckPhase();
            if (Hp <= 0) { Hp = 1; } // the last blow is always the finisher
            return d;
        }

        void Stagger(float seconds)
        {
            Posture = 100;
            staggerT = seconds;
            atk = Atk.None; comboLeft = 0;
            HideTelegraphs();
            Sound.I?.Play("roar", 1f, 0.6f);
            Sound.I?.Play("clang", 0.8f, 0.5f);
            Fx.I?.SlowMo(0.35f, 0.3f);
            Fx.I?.Flash(new Color(1f, 0.9f, 0.6f, 0.4f), 0.3f);
            Fx.I?.Steam(transform.position + Vector3.up * 10, 50, 10);
            UI.I?.Toast(Sharp ? "STAGGERED — the marked core is open" : "STAGGERED — the core is open", new Color(1f, 0.85f, 0.4f));
        }

        public void Parried()
        {
            Posture = Mathf.Min(99, Posture + 28);
            if (Posture >= 99 && Phase < 3) { Stagger(3f); return; }
            Begin(Atk.Reel);
        }

        void CheckPhase()
        {
            int want = Hp01 <= 0.25f ? 3 : Hp01 <= 0.6f ? 2 : 1;
            if (want > Phase)
            {
                Phase = want;
                Sound.I?.Play("roar", 1f, Phase == 3 ? 0.55f : 0.75f);
                Fx.I?.Shake(2.5f, 1f);
                coreLight.color = Phase == 3 ? new Color(0.5f, 1f, 1f) : Sea;
                Mats.SetGlowColor(coreMat, (Phase == 3 ? new Color(0.6f, 1f, 1f) : Sea) * 1.3f);
                OnPhaseChange?.Invoke();
            }
        }

        // ----- cutscene hooks -----
        public void Die()
        {
            Dead = true; Active = false; staggerT = 0;
            HideTelegraphs();
            coreLight.intensity = 0;
            Mats.SetGlowColor(coreMat, new Color(0.05f, 0.08f, 0.1f));
        }

        public Vector3 CorePos => lantern != null ? lantern.position : transform.position + Vector3.up * 9;

        // ----- animation -----
        float gait;
        void AnimateIdle(float dt)
        {
            if (body == null) return;
            float k = 1 - Mathf.Exp(-dt * 8);
            gait += dt * (atk == Atk.None && !Staggered ? 3f : 0.6f);
            if (Dead)
            {
                body.localPosition = Vector3.Lerp(body.localPosition, new Vector3(0, 3, 0), dt * 1.5f);
                body.localRotation = Quaternion.Slerp(body.localRotation, Quaternion.Euler(12, 0, -8), dt);
                return;
            }
            for (int i = 0; i < legs.Count; i++)
            {
                float ph = gait + i * 1.7f;
                legs[i].localRotation = Quaternion.Slerp(legs[i].localRotation, Quaternion.Euler(Mathf.Sin(ph) * 8, legs[i].localEulerAngles.y, 0), k);
            }

            Vector3 cl = new Vector3(-10, -15, 0), cr = new Vector3(-10, 15, 0);
            float pin = 15 + Mathf.Sin(Time.time * 2) * 5;
            float bodyY = 9 + Mathf.Sin(Time.time * 1.3f) * 0.4f;
            float wp = windup > 0 ? Mathf.Clamp01(atkT / windup) : 1;
            switch (atk)
            {
                case Atk.Slam:
                    if (!struck) { cl = new Vector3(-60 * wp, -5, 0); cr = new Vector3(-60 * wp, 5, 0); bodyY += 2 * wp; }
                    else { cl = new Vector3(25, -5, 0); cr = new Vector3(25, 5, 0); bodyY -= 2; }
                    break;
                case Atk.Sweep:
                    if (!struck) { cr = new Vector3(-10, 70 * wp, 0); }
                    else { cr = new Vector3(-5, -70, 0); }
                    break;
                case Atk.Beam:
                    bodyY += (struck ? -1 : 1.5f * wp);
                    cl = new Vector3(-20, -45, 0); cr = new Vector3(-20, 45, 0);
                    break;
                case Atk.Grab:
                    pin = struck ? 0 : 40 * wp;
                    cl = new Vector3(-15, struck ? 10 : -40 * wp, 0); cr = new Vector3(-15, struck ? -10 : 40 * wp, 0);
                    break;
                case Atk.Surge:
                    bodyY += struck ? -3 : 3 * wp;
                    cl = new Vector3(-70, -30, 0); cr = new Vector3(-70, 30, 0);
                    break;
                case Atk.Reel:
                    bodyY -= 1.5f; cl = new Vector3(20, -40, 0); cr = new Vector3(20, 40, 0);
                    break;
            }
            if (Staggered) { cl = new Vector3(30, -30, 0); cr = new Vector3(30, 30, 0); pin = 0; }
            else body.localPosition = Vector3.Lerp(body.localPosition, new Vector3(0, bodyY, 0), k);
            clawL.localRotation = Quaternion.Slerp(clawL.localRotation, Quaternion.Euler(cl), k);
            clawR.localRotation = Quaternion.Slerp(clawR.localRotation, Quaternion.Euler(cr), k);
            pincerL.localRotation = Quaternion.Slerp(pincerL.localRotation, Quaternion.Euler(pin, 0, 0), k);
            pincerR.localRotation = Quaternion.Slerp(pincerR.localRotation, Quaternion.Euler(pin, 0, 0), k);
            if (!Staggered && coreLight != null) coreLight.intensity = Mathf.Lerp(coreLight.intensity, (atk == Atk.Beam && !struck ? 4 + 8 * wp : 4), k);
            body.localRotation = Quaternion.Slerp(body.localRotation, Staggered ? Quaternion.Euler(-10, 0, 6) : Quaternion.identity, k);
        }
    }
}
