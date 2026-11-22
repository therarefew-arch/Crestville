using System.Collections;
using UnityEngine;

namespace HalcyonNoir
{
    // Game feel: hit-stop, slow motion, camera shake, screen flashes and particle bursts.
    public class Fx : MonoBehaviour
    {
        public static Fx I;
        public Vector3 ShakeOffset { get; private set; }
        public Color FlashColor { get; private set; }
        public float FlashAlpha { get; private set; }
        public float BaseTimeScale = 1f;

        float shakeAmp, shakeTime, shakeDur;
        float flashTime, flashDur;
        float stopUntil, slowUntil, slowScale = 1f;
        ParticleSystem sparks, debris, steam, splash, embers;

        void Awake()
        {
            I = this;
            sparks = MakeSystem("Sparks", Color.white, 0.25f, 60f, 0.6f, 2f, true);
            debris = MakeSystem("Debris", new Color(0.45f, 0.42f, 0.4f), 0.9f, 30f, 2.2f, 1.6f, false);
            steam = MakeSystem("Steam", new Color(0.8f, 0.82f, 0.85f, 0.5f), 4f, 6f, 1.8f, -0.2f, false);
            splash = MakeSystem("Splash", new Color(0.7f, 0.85f, 1f, 0.8f), 1.2f, 24f, 1.6f, 2.5f, false);
            embers = MakeSystem("Embers", new Color(1f, 0.6f, 0.25f), 0.3f, 18f, 1.4f, -0.4f, true);
        }

        ParticleSystem MakeSystem(string name, Color c, float size, float speed, float life, float gravity, bool glow)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.playOnAwake = false;
            main.loop = false;
            main.startColor = c;
            main.startSize = new ParticleSystem.MinMaxCurve(size * 0.5f, size * 1.5f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(speed * 0.3f, speed);
            main.startLifetime = new ParticleSystem.MinMaxCurve(life * 0.5f, life);
            main.gravityModifier = gravity;
            main.maxParticles = 1500;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            var em = ps.emission;
            em.enabled = true;
            em.rateOverTime = 0;
            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.5f;
            var col = ps.colorOverLifetime;
            col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) },
                new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(0, 1) });
            col.color = grad;
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = glow ? Mats.Glow(Color.white, 1.6f, true) : Mats.Glow(new Color(0.55f, 0.55f, 0.6f), 0.5f, true);
            if (!glow && name == "Debris") r.sharedMaterial = Mats.Toon(new Color(0.42f, 0.4f, 0.38f));
            r.renderMode = name == "Debris" ? ParticleSystemRenderMode.Mesh : ParticleSystemRenderMode.Billboard;
            if (name == "Debris")
            {
                var tmp = GameObject.CreatePrimitive(PrimitiveType.Cube);
                r.mesh = tmp.GetComponent<MeshFilter>().sharedMesh;
                Destroy(tmp);
                var rot = ps.rotationOverLifetime;
                rot.enabled = true;
                rot.z = new ParticleSystem.MinMaxCurve(-6f, 6f);
            }
            return ps;
        }

        void Emit(ParticleSystem ps, Vector3 pos, int count, Color? color = null, float radius = 0.5f)
        {
            var p = new ParticleSystem.EmitParams { position = pos, applyShapeToPosition = true };
            if (color.HasValue) p.startColor = color.Value;
            var shape = ps.shape;
            shape.radius = radius;
            ps.Emit(p, count);
        }

        public void Sparks(Vector3 pos, Color color, int count = 30, float radius = 1f) => Emit(sparks, pos, count, color, radius);
        public void Debris(Vector3 pos, int count = 20, float radius = 3f) => Emit(debris, pos, count, null, radius);
        public void Steam(Vector3 pos, int count = 12, float radius = 1.5f) => Emit(steam, pos, count, null, radius);
        public void Splash(Vector3 pos, int count = 40, float radius = 4f) => Emit(splash, pos, count, null, radius);
        public void Embers(Vector3 pos, int count = 20, float radius = 2f) => Emit(embers, pos, count, null, radius);

        public void Shake(float amp, float dur)
        {
            if (amp >= shakeAmp * Mathf.Clamp01(1 - shakeTime / Mathf.Max(shakeDur, 0.01f)))
            {
                shakeAmp = amp; shakeDur = dur; shakeTime = 0;
            }
        }

        public void Flash(Color c, float dur) { FlashColor = c; flashDur = dur; flashTime = 0; }

        // Freeze the game for a split second on big hits.
        public void HitStop(float seconds) => stopUntil = Mathf.Max(stopUntil, Time.unscaledTime + seconds);
        public void SlowMo(float seconds, float scale) { slowUntil = Time.unscaledTime + seconds; slowScale = scale; }

        void Update()
        {
            float dt = Time.unscaledDeltaTime;
            shakeTime += dt;
            float k = shakeDur > 0 ? Mathf.Clamp01(1 - shakeTime / shakeDur) : 0;
            float a = shakeAmp * k * k;
            ShakeOffset = new Vector3(
                (Mathf.PerlinNoise(Time.unscaledTime * 28f, 0) - 0.5f) * 2f * a,
                (Mathf.PerlinNoise(0, Time.unscaledTime * 28f) - 0.5f) * 2f * a,
                0);
            if (k <= 0) shakeAmp = 0;

            flashTime += dt;
            FlashAlpha = flashDur > 0 ? Mathf.Clamp01(1 - flashTime / flashDur) : 0;

            if (Game.Paused) { Time.timeScale = 0; return; }
            float scale = BaseTimeScale;
            if (Time.unscaledTime < slowUntil) scale *= slowScale;
            if (Time.unscaledTime < stopUntil) scale *= 0.03f;
            Time.timeScale = scale;
            Time.fixedDeltaTime = 0.02f * Mathf.Max(scale, 0.05f);
        }

        public IEnumerator WaitReal(float s)
        {
            float end = Time.unscaledTime + s;
            while (Time.unscaledTime < end) yield return null;
        }
    }
}
