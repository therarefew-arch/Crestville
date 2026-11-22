using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
{
    // Every sound in the slice is synthesized at startup: rain, a slow noir jazz loop,
    // the fight theme and the impacts. No audio files needed.
    public class Sound : MonoBehaviour
    {
        public static Sound I;
        const int SR = 22050;
        AudioSource music, music2, ambience, sfx, detail, thunderSrc;
        AudioClip[] drips;
        readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        float musicTarget = 0.5f;
        AudioSource activeMusic;
        public float MasterVolume = 1f;

        void Awake()
        {
            I = this;
            music = gameObject.AddComponent<AudioSource>();
            music2 = gameObject.AddComponent<AudioSource>();
            ambience = gameObject.AddComponent<AudioSource>();
            sfx = gameObject.AddComponent<AudioSource>();
            foreach (var s in new[] { music, music2, ambience }) { s.loop = true; s.playOnAwake = false; s.volume = 0; }
            sfx.playOnAwake = false;
            activeMusic = music;

            detail = gameObject.AddComponent<AudioSource>();
            thunderSrc = gameObject.AddComponent<AudioSource>();
            detail.playOnAwake = thunderSrc.playOnAwake = false;
            clips["rain"] = MakeRain();
            clips["thunder"] = MakeThunder();
            drips = new[] { MakeDrip(1100, 40), MakeDrip(1500, 55), MakeDrip(1850, 70), MakeDrip(900, 35), MakeDrip(2300, 90), MakeDrip(1300, 30) };
            clips["noir"] = MakeNoir();
            clips["fight"] = MakeFight();
            clips["thump"] = MakeThump(55f, 0.5f, 0.9f);
            clips["impact"] = MakeImpact();
            clips["clang"] = MakeClang();
            clips["steam"] = MakeNoiseBurst(0.9f, 0.25f, true);
            clips["whoosh"] = MakeWhoosh();
            clips["step"] = MakeThump(90f, 0.12f, 0.25f);
            clips["bigstep"] = MakeThump(38f, 0.6f, 1f);
            clips["blip"] = MakeBlip(880f, 0.06f);
            clips["clue"] = MakeChime();
            clips["siren"] = MakeSiren();
            clips["rumble"] = MakeRumble();
            clips["charge"] = MakeCharge();
            clips["roar"] = MakeRoar();
        }

        void Update()
        {
            var other = activeMusic == music ? music2 : music;
            activeMusic.volume = Mathf.MoveTowards(activeMusic.volume, musicTarget * MasterVolume, Time.unscaledDeltaTime * 0.35f);
            other.volume = Mathf.MoveTowards(other.volume, 0, Time.unscaledDeltaTime * 0.5f);
            if (other.volume <= 0 && other.isPlaying) other.Stop();
            RainDetail();
        }

        public void PlayMusic(string name, float volume = 0.45f)
        {
            if (!clips.TryGetValue(name, out var c)) return;
            if (activeMusic.clip == c && activeMusic.isPlaying) { musicTarget = volume; return; }
            activeMusic = activeMusic == music ? music2 : music;
            activeMusic.clip = c;
            activeMusic.volume = 0;
            activeMusic.Play();
            musicTarget = volume;
        }
        public void MusicVolume(float v) => musicTarget = v;

        public void Ambience(string name, float volume)
        {
            if (name == null) { ambience.Stop(); return; }
            if (!clips.TryGetValue(name, out var c)) return;
            if (ambience.clip != c) { ambience.clip = c; ambience.Play(); }
            ambience.volume = volume * MasterVolume;
        }

        public void Play(string name, float volume = 1f, float pitch = 1f)
        {
            if (!clips.TryGetValue(name, out var c)) return;
            sfx.pitch = pitch;
            sfx.PlayOneShot(c, volume * MasterVolume);
        }

        // ---------- synthesis ----------
        static AudioClip Clip(string name, float[] data)
        {
            var c = AudioClip.Create(name, data.Length, 1, SR, false);
            c.SetData(data, 0);
            return c;
        }
        static System.Random rng = new System.Random(7);
        static float Noise() => (float)(rng.NextDouble() * 2 - 1);
        static float Mtof(float m) => 440f * Mathf.Pow(2f, (m - 69f) / 12f);

        // Seamless loop: crossfade the tail into the head.
        static float[] Loopify(float[] d, int fade)
        {
            int n = d.Length - fade;
            var o = new float[n];
            for (int i = 0; i < n; i++) o[i] = d[i];
            for (int i = 0; i < fade; i++)
            {
                float t = i / (float)fade;
                o[i] = d[n + i] * (1 - t) + d[i] * t;
            }
            return o;
        }

        // A 20-second rain bed with slow gusts: heavier, lighter, heavier. No drips are baked in, so
        // there's nothing distinctive for the ear to catch repeating. Drips and distant thunder are
        // scheduled at random while it plays (see RainDetail), so they never fall in the same place twice.
        AudioClip MakeRain()
        {
            int n = SR * 21;
            var d = new float[n];
            float lp = 0, lp2 = 0, hp = 0, gustPh = 0, gustPh2 = 0;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                lp += (Noise() - lp) * 0.35f;
                lp2 += (lp - lp2) * 0.2f;
                hp += (Noise() - hp) * 0.8f;
                // two slow, unrelated swells; their sum never quite repeats inside the clip
                gustPh = t / 21f * 2 * Mathf.PI * 2;
                gustPh2 = t / 21f * 2 * Mathf.PI * 3;
                float gust = 0.82f + 0.12f * Mathf.Sin(gustPh) + 0.07f * Mathf.Sin(gustPh2 + 1.3f);
                float hiss = (lp - lp2) * 0.55f + lp2 * 0.35f + (Noise() - hp) * 0.05f;
                // a sparse spatter of tiny ticks (individual drops on stone), too dense to pick out one by one
                if (rng.NextDouble() < 0.0025) hiss += Noise() * 0.25f;
                d[i] = hiss * gust;
            }
            return Clip("rain", Loopify(d, SR));
        }

        AudioClip MakeDrip(float f, float decay)
        {
            int n = (int)(0.25f * SR);
            var d = new float[n];
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float sweep = f * (1 + 0.35f * Mathf.Exp(-t * 60));   // the little upward "plink" of a drop
                d[j] = Mathf.Sin(2 * Mathf.PI * sweep * t) * Mathf.Exp(-t * decay) * 0.5f;
            }
            return Clip("drip", d);
        }

        AudioClip MakeThunder()
        {
            int n = (int)(7f * SR);
            var d = new float[n];
            float lp = 0, lp2 = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                lp += (Noise() - lp) * 0.03f;
                lp2 += (lp - lp2) * 0.04f;
                // a far-off roll: swells and crackles that die away
                float env = Mathf.Min(1, t * 1.5f) * Mathf.Exp(-t * 0.55f) * (0.6f + 0.4f * Mathf.PerlinNoise(t * 3f, 0.3f));
                d[j] = lp2 * 6f * env;
            }
            return Clip("thunder", d);
        }

        // Random drips and the odd roll of thunder over the rain bed.
        float nextDrip, nextThunder = 18f;
        void RainDetail()
        {
            if (ambience.clip == null || ambience.clip.name != "rain" || !ambience.isPlaying) return;
            float now = Time.unscaledTime;
            float level = ambience.volume;
            if (now >= nextDrip)
            {
                nextDrip = now + Random.Range(0.12f, 1.4f);
                detail.pitch = Random.Range(0.8f, 1.35f);
                detail.PlayOneShot(drips[Random.Range(0, drips.Length)], Random.Range(0.08f, 0.3f) * level);
            }
            if (now >= nextThunder)
            {
                nextThunder = now + Random.Range(28f, 75f);
                thunderSrc.pitch = Random.Range(0.7f, 1.1f);
                thunderSrc.PlayOneShot(clips["thunder"], Random.Range(0.35f, 0.7f) * level);
            }
        }

        // Slow minor-key jazz: soft electric piano chords, walking bass, brushed snare.
        AudioClip MakeNoir()
        {
            float bpm = 66, beat = 60f / bpm;
            int bars = 16, beatsPerBar = 4;   // two eight-bar halves: A, then a darker B with its own melody
            float len = bars * beatsPerBar * beat;
            int n = (int)(len * SR) + SR;
            var d = new float[n];
            int[][] chords = {
                new[] { 57, 60, 64, 67 }, new[] { 53, 57, 60, 64 }, new[] { 50, 53, 57, 60, 64 }, new[] { 52, 56, 59, 62 },
                new[] { 57, 60, 64, 67 }, new[] { 55, 59, 62, 65 }, new[] { 53, 57, 60, 64 }, new[] { 52, 56, 59, 62, 65 } };
            int[][] bass = {
                new[] { 45, 48, 52, 50 }, new[] { 41, 45, 48, 47 }, new[] { 38, 41, 45, 44 }, new[] { 40, 44, 47, 44 },
                new[] { 45, 43, 41, 40 }, new[] { 43, 47, 50, 47 }, new[] { 41, 45, 48, 45 }, new[] { 40, 44, 47, 40 } };
            // B half: Am7, Dm9, G7, Cmaj7, Fmaj7, Bm7b5, E7, E7b9
            int[][] chordsB = {
                new[] { 57, 60, 64, 67 }, new[] { 50, 53, 57, 60, 64 }, new[] { 55, 59, 62, 65 }, new[] { 52, 55, 59, 60 },
                new[] { 53, 57, 60, 64 }, new[] { 50, 53, 57, 59 }, new[] { 52, 56, 59, 62 }, new[] { 52, 56, 59, 62, 65 } };
            int[][] bassB = {
                new[] { 45, 48, 52, 50 }, new[] { 38, 41, 45, 43 }, new[] { 43, 47, 50, 47 }, new[] { 48, 47, 45, 43 },
                new[] { 41, 45, 48, 45 }, new[] { 47, 45, 44, 42 }, new[] { 40, 44, 47, 44 }, new[] { 40, 41, 44, 40 } };
            for (int b = 0; b < bars; b++)
            {
                float t0 = b * beatsPerBar * beat;
                // piano chord on beat 1 and an off-beat stab on the "and" of 3
                foreach (var start in new[] { 0f, 2.5f })
                    foreach (int note in (b < 8 ? chords : chordsB)[b % 8])
                    {
                        float f = Mtof(note);
                        int s0 = (int)((t0 + start * beat + note * 0.0007f) * SR);
                        int dur = (int)((start == 0 ? 2.4f : 1.4f) * beat * SR);
                        float amp = start == 0 ? 0.05f : 0.032f;
                        for (int j = 0; j < dur && s0 + j < n; j++)
                        {
                            float t = j / (float)SR;
                            float env = Mathf.Exp(-t * 1.6f) * Mathf.Min(1, j / 200f);
                            float v = Mathf.Sin(2 * Mathf.PI * f * t) + 0.3f * Mathf.Sin(4 * Mathf.PI * f * t) * Mathf.Exp(-t * 4) + 0.1f * Mathf.Sin(2 * Mathf.PI * f * 3.01f * t);
                            d[s0 + j] += v * env * amp;
                        }
                    }
                // walking bass, one note per beat
                for (int q = 0; q < 4; q++)
                {
                    float f = Mtof((b < 8 ? bass : bassB)[b % 8][q] - 12);
                    int s0 = (int)((t0 + q * beat) * SR);
                    int dur = (int)(beat * 0.95f * SR);
                    for (int j = 0; j < dur && s0 + j < n; j++)
                    {
                        float t = j / (float)SR;
                        float env = Mathf.Exp(-t * 2.2f) * Mathf.Min(1, j / 80f);
                        d[s0 + j] += (Mathf.Sin(2 * Mathf.PI * f * t) + 0.25f * Mathf.Sin(4 * Mathf.PI * f * t)) * env * 0.16f;
                    }
                }
                // brushes on 2 and 4, a soft swish on every beat
                for (int q = 0; q < 8; q++)
                {
                    int s0 = (int)((t0 + q * beat * 0.5f + (q % 2 == 1 ? beat * 0.16f : 0)) * SR);
                    bool backbeat = q == 2 || q == 6;
                    int dur = (int)((backbeat ? 0.28f : 0.12f) * SR);
                    float lp = 0;
                    for (int j = 0; j < dur && s0 + j < n; j++)
                    {
                        lp += (Noise() - lp) * 0.5f;
                        float env = Mathf.Exp(-j / (backbeat ? 1800f : 500f));
                        d[s0 + j] += (Noise() - lp) * env * (backbeat ? 0.05f : 0.018f);
                    }
                }
            }
            // a lonely muted-trumpet-ish line over the last four bars of each half; the second answers the first
            int[] melA = { 76, 74, 72, 71, 72, 69, 0, 0, 72, 74, 76, 79, 77, 76, 74, 0 };
            int[] melB = { 72, 71, 69, 0, 76, 74, 72, 71, 69, 68, 69, 71, 69, 0, 0, 0 };
            for (int k = 0; k < 32; k++)
            {
                int note = k < 16 ? melA[k] : melB[k - 16];
                if (note == 0) continue;
                float f = Mtof(note - 12);
                int startBar = k < 16 ? 4 : 12;
                int s0 = (int)((startBar * beatsPerBar * beat + (k % 16) * beat) * SR);
                int dur = (int)(beat * 1.05f * SR);
                for (int j = 0; j < dur && s0 + j < n; j++)
                {
                    float t = j / (float)SR;
                    float env = Mathf.Min(1, t * 8) * Mathf.Exp(-t * 1.2f);
                    float vib = 1 + 0.004f * Mathf.Sin(2 * Mathf.PI * 5.5f * t);
                    float ph = 2 * Mathf.PI * f * vib * t;
                    float v = Mathf.Sin(ph) * 0.6f + Mathf.Sin(2 * ph) * 0.3f + Mathf.Sin(3 * ph) * 0.15f;
                    d[s0 + j] += v * env * 0.045f;
                }
            }
            return Clip("noir", Loopify(d, SR / 2));
        }

        // Driving fight theme: pounding low brass, timpani-like kicks, snare and a pulsing bass.
        AudioClip MakeFight()
        {
            float bpm = 132, beat = 60f / bpm;
            int bars = 16;   // A, then a B half that climbs and hits harder
            float len = bars * 4 * beat;
            int n = (int)(len * SR) + SR / 2;
            var d = new float[n];
            int[] roots = { 45, 45, 41, 43, 45, 45, 48, 47, 41, 41, 43, 45, 48, 47, 45, 44 };
            for (int b = 0; b < bars; b++)
            {
                float t0 = b * 4 * beat;
                // pulsing eighth-note bass
                for (int e = 0; e < 8; e++)
                {
                    float f = Mtof(roots[b] - 12 + (e == 7 ? 7 : 0));
                    int s0 = (int)((t0 + e * beat * 0.5f) * SR);
                    int dur = (int)(beat * 0.45f * SR);
                    float ph = 0;
                    for (int j = 0; j < dur && s0 + j < n; j++)
                    {
                        float t = j / (float)SR;
                        ph += f / SR;
                        float saw = 2 * (ph - Mathf.Floor(ph + 0.5f));
                        d[s0 + j] += saw * Mathf.Exp(-t * 6f) * 0.11f;
                    }
                }
                // kicks on 1 and 3 (plus a pickup), snare on 2 and 4
                foreach (float k in new[] { 0f, 2f, 3.5f })
                {
                    int s0 = (int)((t0 + k * beat) * SR);
                    for (int j = 0; j < SR * 0.35f && s0 + j < n; j++)
                    {
                        float t = j / (float)SR;
                        float f = 110 * Mathf.Exp(-t * 18) + 45;
                        d[s0 + j] += Mathf.Sin(2 * Mathf.PI * f * t) * Mathf.Exp(-t * 7) * 0.35f;
                    }
                }
                // the last bar of each half ends in a snare fill, so the loop point reads as a turnaround
                var snares = b % 8 == 7 ? new[] { 1f, 2f, 2.5f, 3f, 3.25f, 3.5f, 3.75f } : new[] { 1f, 3f };
                foreach (float k in snares)
                {
                    int s0 = (int)((t0 + k * beat) * SR);
                    for (int j = 0; j < SR * 0.22f && s0 + j < n; j++)
                    {
                        float t = j / (float)SR;
                        d[s0 + j] += (Noise() * 0.7f + Mathf.Sin(2 * Mathf.PI * 190 * t) * 0.3f) * Mathf.Exp(-t * 16) * 0.16f;
                    }
                }
                // brass stab: a heavy minor chord on beat 1 of every other bar
                if (b % 2 == 0 || b >= 8)
                {
                    int[] chord = { roots[b], roots[b] + 3, roots[b] + 7, roots[b] + 12 };
                    foreach (int note in chord)
                    {
                        float f = Mtof(note);
                        int s0 = (int)(t0 * SR);
                        float ph = 0;
                        for (int j = 0; j < SR * 1.2f && s0 + j < n; j++)
                        {
                            float t = j / (float)SR;
                            ph += f / SR;
                            float saw = 2 * (ph - Mathf.Floor(ph + 0.5f));
                            float env = Mathf.Min(1, t * 30) * Mathf.Exp(-t * 2.2f);
                            d[s0 + j] += saw * env * 0.035f;
                        }
                    }
                }
            }
            // soft clip to glue it together
            for (int i = 0; i < n; i++) d[i] = (float)System.Math.Tanh(d[i] * 1.4f) * 0.8f;
            return Clip("fight", Loopify(d, SR / 4));
        }

        AudioClip MakeThump(float freq, float len, float amp)
        {
            int n = (int)(len * SR);
            var d = new float[n];
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float f = freq * (1 + 2 * Mathf.Exp(-t * 30));
                d[j] = Mathf.Sin(2 * Mathf.PI * f * t) * Mathf.Exp(-t * 9 / len) * amp + Noise() * Mathf.Exp(-t * 60) * amp * 0.3f;
            }
            return Clip("thump", d);
        }

        AudioClip MakeImpact()
        {
            int n = (int)(0.9f * SR);
            var d = new float[n];
            float lp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                lp += (Noise() - lp) * 0.08f;
                float low = Mathf.Sin(2 * Mathf.PI * (48 + 90 * Mathf.Exp(-t * 25)) * t) * Mathf.Exp(-t * 5f);
                d[j] = (low * 0.9f + lp * 1.6f * Mathf.Exp(-t * 7) + Noise() * Mathf.Exp(-t * 40) * 0.35f) * 0.8f;
            }
            return Clip("impact", d);
        }

        AudioClip MakeClang()
        {
            int n = (int)(1.4f * SR);
            var d = new float[n];
            float[] partials = { 1f, 2.76f, 5.4f, 8.93f };
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR, v = 0;
                for (int p = 0; p < partials.Length; p++) v += Mathf.Sin(2 * Mathf.PI * 320 * partials[p] * t) * Mathf.Exp(-t * (2.5f + p * 2f)) / (p + 1);
                d[j] = v * 0.45f + Noise() * Mathf.Exp(-t * 80) * 0.3f;
            }
            return Clip("clang", d);
        }

        AudioClip MakeNoiseBurst(float len, float amp, bool hiss)
        {
            int n = (int)(len * SR);
            var d = new float[n];
            float lp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                lp += (Noise() - lp) * 0.3f;
                float v = hiss ? Noise() - lp : lp;
                d[j] = v * amp * Mathf.Min(1, t * 20) * Mathf.Exp(-t * 2.5f / len);
            }
            return Clip("noise", d);
        }

        AudioClip MakeWhoosh()
        {
            int n = (int)(0.45f * SR);
            var d = new float[n];
            float lp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float k = 0.02f + 0.25f * Mathf.Sin(Mathf.PI * t / 0.45f);
                lp += (Noise() - lp) * k;
                d[j] = lp * Mathf.Sin(Mathf.PI * t / 0.45f) * 0.9f;
            }
            return Clip("whoosh", d);
        }

        AudioClip MakeBlip(float f, float len)
        {
            int n = (int)(len * SR);
            var d = new float[n];
            for (int j = 0; j < n; j++) { float t = j / (float)SR; d[j] = Mathf.Sin(2 * Mathf.PI * f * t) * Mathf.Exp(-t * 40) * 0.25f; }
            return Clip("blip", d);
        }

        AudioClip MakeChime()
        {
            int n = (int)(1.6f * SR);
            var d = new float[n];
            int[] notes = { 76, 81, 88 };
            for (int k = 0; k < notes.Length; k++)
            {
                float f = Mtof(notes[k]);
                int s0 = (int)(k * 0.09f * SR);
                for (int j = 0; s0 + j < n; j++)
                {
                    float t = j / (float)SR;
                    d[s0 + j] += (Mathf.Sin(2 * Mathf.PI * f * t) + 0.3f * Mathf.Sin(2 * Mathf.PI * f * 2.01f * t)) * Mathf.Exp(-t * 3) * 0.12f;
                }
            }
            return Clip("chime", d);
        }

        AudioClip MakeSiren()
        {
            int n = (int)(5f * SR);
            var d = new float[n];
            float ph = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float f = 520 + 180 * Mathf.Sin(2 * Mathf.PI * t / 2.5f);
                ph += f / SR;
                float v = Mathf.Sin(2 * Mathf.PI * ph) + 0.3f * Mathf.Sin(4 * Mathf.PI * ph);
                d[j] = v * 0.12f * Mathf.Min(1, t * 2) * Mathf.Min(1, (5 - t) * 2);
            }
            return Clip("siren", d);
        }

        AudioClip MakeRumble()
        {
            int n = (int)(4f * SR);
            var d = new float[n];
            float lp = 0, lp2 = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                lp += (Noise() - lp) * 0.02f;
                lp2 += (lp - lp2) * 0.05f;
                d[j] = (lp2 * 5f + Mathf.Sin(2 * Mathf.PI * 32 * t) * 0.3f) * Mathf.Min(1, t) * Mathf.Min(1, (4 - t) * 1.5f);
            }
            return Clip("rumble", d);
        }

        AudioClip MakeCharge()
        {
            int n = (int)(1.6f * SR);
            var d = new float[n];
            float ph = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float f = 80 + 220 * t;
                ph += f / SR;
                d[j] = (2 * (ph - Mathf.Floor(ph + 0.5f))) * 0.12f * Mathf.Min(1, t * 4) + Noise() * 0.04f * t;
            }
            return Clip("charge", d);
        }

        AudioClip MakeRoar()
        {
            int n = (int)(2.4f * SR);
            var d = new float[n];
            float ph = 0, lp = 0;
            for (int j = 0; j < n; j++)
            {
                float t = j / (float)SR;
                float f = 70 + 25 * Mathf.Sin(t * 9) - t * 12;
                ph += f / SR;
                lp += (Noise() - lp) * 0.1f;
                float saw = 2 * (ph - Mathf.Floor(ph + 0.5f));
                d[j] = (saw * 0.5f + lp * 1.2f) * Mathf.Min(1, t * 3) * Mathf.Min(1, (2.4f - t) * 2) * 0.6f;
            }
            return Clip("roar", d);
        }
    }
}
