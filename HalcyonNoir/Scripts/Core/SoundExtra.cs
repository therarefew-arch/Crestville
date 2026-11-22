using UnityEngine;

namespace HalcyonNoir
{
    // Small sounds for v0.0.06: the lighter, a long exhale, a car door and the car's engine.
    public partial class Sound
    {
        AudioSource engine;

        void MakeExtras()
        {
            clips["lighter"] = MakeLighter();
            clips["exhale"] = MakeExhale();
            clips["door"] = MakeDoor();
            clips["engine"] = MakeEngine();
            engine = gameObject.AddComponent<AudioSource>();
            engine.loop = true; engine.playOnAwake = false; engine.volume = 0;
            engine.clip = clips["engine"];
        }

        // The car's engine, under everything while it drives. Volume 0 stops it.
        public void Engine(float volume, float pitch = 1f)
        {
            if (engine == null) return;
            engine.volume = volume * MasterVolume;
            engine.pitch = pitch;
            if (volume > 0 && !engine.isPlaying) engine.Play();
            if (volume <= 0 && engine.isPlaying) engine.Stop();
        }

        // A steel lid clicks open, the wheel scrapes, the flame catches with a soft breath.
        AudioClip MakeLighter()
        {
            int n = (int)(0.7f * SR);
            var d = new float[n];
            float lp = 0, hp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float v = 0;
                if (t < 0.012f) v += Noise() * 0.6f * (1 - t / 0.012f) + Mathf.Sin(t * 2 * Mathf.PI * 3100) * 0.3f;   // click
                if (t > 0.16f && t < 0.24f) { hp = Noise() - lp; lp += (Noise() - lp) * 0.5f; v += hp * 0.5f * Mathf.Sin(Mathf.PI * (t - 0.16f) / 0.08f); } // wheel
                if (t > 0.22f) { lp += (Noise() - lp) * 0.06f; v += lp * 0.9f * Mathf.Min(1, (t - 0.22f) * 30) * Mathf.Exp(-(t - 0.22f) * 4f); } // flame
                d[j] = v;
            }
            return Clip("lighter", d);
        }

        AudioClip MakeExhale()
        {
            int n = (int)(1.3f * SR);
            var d = new float[n];
            float lp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                lp += (Noise() - lp) * 0.09f;
                float env = Mathf.Sin(Mathf.PI * Mathf.Pow(t / 1.3f, 0.6f));
                d[j] = lp * 0.55f * env;
            }
            return Clip("exhale", d);
        }

        AudioClip MakeDoor()
        {
            int n = (int)(0.5f * SR);
            var d = new float[n];
            float lp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                lp += (Noise() - lp) * 0.12f;
                d[j] = (Mathf.Sin(t * 2 * Mathf.PI * 70) * 0.8f + lp * 0.6f) * Mathf.Exp(-t * 14) + (t > 0.03f && t < 0.05f ? Noise() * 0.2f : 0);
            }
            return Clip("door", d);
        }

        // A big, slow V8 idle: a low thrum with a lumpy firing rhythm and some rasp. Loops.
        AudioClip MakeEngine()
        {
            int n = (int)(2f * SR);
            var d = new float[n + 2000];
            float lp = 0;
            for (int j = 0; j < d.Length; j++)
            {
                float t = j / (float)SR;
                float f = 42f;
                float fire = 0.6f + 0.4f * Mathf.Sin(t * 2 * Mathf.PI * f / 4f) * Mathf.Sin(t * 2 * Mathf.PI * 3.1f);
                lp += (Noise() - lp) * 0.05f;
                float v = Mathf.Sin(t * 2 * Mathf.PI * f) * 0.5f + Mathf.Sin(t * 2 * Mathf.PI * f * 2) * 0.25f + Mathf.Sin(t * 2 * Mathf.PI * f * 3.02f) * 0.1f;
                d[j] = (v * fire + lp * 0.5f) * 0.45f;
            }
            return Clip("engine", Loopify(d, 2000));
        }
    }
}
