using UnityEngine;

namespace HalcyonNoir
{
    // The investigation theme: late-50s modal cool jazz, after the feel of that era's quintet records
    // (all of it original: our own tune, form and lines). A slow swing with a Harmon-muted trumpet that
    // leaves a lot of space, walking upright bass, ride cymbal and hi-hat on 2 and 4, sparse quartal piano,
    // and a little room around everything. 32 bars, AABA: A in D Dorian, the bridge a half step up in E-flat Dorian.
    public partial class Sound
    {
        const float CoolBpm = 96f;

        AudioClip MakeCool()
        {
            float beat = 60f / CoolBpm;
            int bars = 32;
            float len = bars * 4 * beat;
            int n = (int)(len * SR) + SR * 2;
            var dry = new float[n];
            var send = new float[n];          // what goes to the reverb
            var r = new System.Random(1959);
            float Swing(float beatPos) => (beatPos % 1f) >= 0.5f ? Mathf.Floor(beatPos) + 0.66f : beatPos; // swung eighths
            int S(float beats) => (int)(beats * beat * SR);
            int Shift(int bar) => bar >= 16 && bar < 24 ? 1 : 0;   // the bridge

            // ---------------- drums ----------------
            for (int b = 0; b < bars; b++)
            {
                float b0 = b * 4;
                // ride: ding, ding-da, ding, ding-da
                foreach (float q in new[] { 0f, 1f, 1.66f, 2f, 3f, 3.66f })
                {
                    bool skip = q % 1f > 0.1f;
                    float amp = (skip ? 0.045f : 0.06f) * (0.85f + (float)r.NextDouble() * 0.3f);
                    Ride(dry, S(b0 + q), amp);
                }
                // hi-hat foot on 2 and 4
                foreach (float q in new[] { 1f, 3f }) Chick(dry, S(b0 + q), 0.05f);
                // feathered bass drum, barely there
                for (int q = 0; q < 4; q++) Kick(dry, S(b0 + q), 0.035f);
                // the odd brushed snare ghost note
                if (r.NextDouble() < 0.45) Brush(dry, S(b0 + Swing(1.5f + (float)r.Next(0, 3))), 0.03f);
                // a soft crash on the top of each section
                if (b % 8 == 0) Ride(dry, S(b0), 0.09f, 2.2f);
            }

            // ---------------- walking bass ----------------
            int[] dorian = { 0, 2, 3, 5, 7, 9, 10 };
            int prev = 38;
            for (int b = 0; b < bars; b++)
            {
                int root = 38 + Shift(b);                       // D2, or E-flat2 in the bridge
                int nextRoot = 38 + Shift((b + 1) % bars);
                var line = new int[4];
                line[0] = r.NextDouble() < 0.8 ? root : root + 7;
                if (line[0] - prev > 7) line[0] -= 12;
                // beats 2 and 3 step through the mode, up or down
                int dir = r.NextDouble() < 0.5 ? 1 : -1;
                int deg = System.Array.IndexOf(dorian, ((line[0] - root) % 12 + 12) % 12);
                if (deg < 0) deg = 0;
                for (int q = 1; q < 3; q++)
                {
                    deg += dir * (r.NextDouble() < 0.7 ? 1 : 2);
                    int oct = Mathf.FloorToInt(deg / 7f);
                    int d = ((deg % 7) + 7) % 7;
                    line[q] = root + dorian[d] + oct * 12;
                    if (line[q] < 28) line[q] += 12;
                    if (line[q] > 52) line[q] -= 12;
                }
                // beat 4: a chromatic approach into the next bar
                int target = nextRoot;
                while (target - line[2] > 6) target -= 12;
                while (line[2] - target > 6) target += 12;
                line[3] = target + (line[2] > target ? 1 : -1);
                for (int q = 0; q < 4; q++)
                {
                    float push = q == 0 ? 0 : (float)(r.NextDouble() * 0.02);
                    Bass(dry, S(b * 4 + q - push), Mtof(line[q]), beat * 0.92f, q == 0 ? 0.2f : 0.17f);
                }
                prev = line[3];
            }

            // ---------------- piano: sparse quartal comping ----------------
            int[][] voicings = { new[] { 64, 69, 74 }, new[] { 62, 67, 72 }, new[] { 57, 62, 67, 71 }, new[] { 60, 65, 69, 74 } };
            float[] spots = { 0f, 1.66f, 2.66f, 3.66f, 1f, 2.33f };
            for (int b = 0; b < bars; b++)
            {
                int hits = r.NextDouble() < 0.25 ? 0 : r.NextDouble() < 0.7 ? 1 : 2;
                for (int h = 0; h < hits; h++)
                {
                    float at = b * 4 + spots[r.Next(spots.Length)];
                    var v = voicings[r.Next(voicings.Length)];
                    float hold = r.NextDouble() < 0.5 ? 0.6f : 1.6f;
                    foreach (int note in v) Piano(dry, send, S(at) + r.Next(0, 160), Mtof(note + Shift(b)), hold * beat, 0.028f);
                }
            }

            // ---------------- the muted trumpet ----------------
            // (start beat, length in beats, note). Lots of space; long notes left to hang.
            float[,] mel = {
                // A1
                { 2, 1.5f, 69 }, { 3.5f, 0.5f, 67 }, { 4, 3, 65 },
                { 8.66f, 0.34f, 62 }, { 9, 1, 64 }, { 10, 2.5f, 65 },
                { 13, 0.66f, 67 }, { 13.66f, 0.34f, 69 }, { 14, 4.5f, 72 },
                { 19, 1, 71 }, { 20, 1, 69 }, { 21, 3.5f, 65 },
                { 28.66f, 0.34f, 62 }, { 29, 0.66f, 64 }, { 29.66f, 2.3f, 65 },
                // A2
                { 34, 1, 62 }, { 35, 1, 65 }, { 36, 2, 69 }, { 38.66f, 0.34f, 67 }, { 39, 4, 64 },
                { 44.66f, 0.34f, 69 }, { 45, 0.66f, 71 }, { 45.66f, 0.34f, 72 }, { 46, 1, 74 }, { 47, 3, 72 },
                { 51, 1, 69 }, { 52, 6, 67 },
                // B (E-flat Dorian)
                { 66, 1.5f, 70 }, { 67.5f, 0.5f, 68 }, { 68, 4, 66 },
                { 74, 1, 63 }, { 75, 1, 66 }, { 76, 2, 70 }, { 78, 1, 73 }, { 79, 5, 72 },
                { 86.66f, 0.34f, 70 }, { 87, 0.66f, 68 }, { 87.66f, 0.34f, 66 }, { 88, 6, 65 },
                // A3
                { 98, 1, 69 }, { 99, 1, 72 }, { 100, 2, 74 }, { 102.66f, 0.34f, 72 }, { 103, 2, 69 },
                { 106, 1, 67 }, { 107, 5, 65 },
                { 114.66f, 0.34f, 62 }, { 115, 0.66f, 64 }, { 115.66f, 0.34f, 65 }, { 116, 1, 67 }, { 117, 6, 62 },
            };
            for (int i = 0; i < mel.GetLength(0); i++)
                Trumpet(dry, send, S(mel[i, 0]), Mtof(mel[i, 2]), mel[i, 1] * beat, 0.07f);

            // ---------------- room ----------------
            Room(send, dry);
            for (int i = 0; i < n; i++) dry[i] = (float)System.Math.Tanh(dry[i] * 1.3f) * 0.85f;
            return Clip("noir", Loopify(dry, SR));
        }

        // Dev: write a clip to a 16-bit mono .wav, and log its length, peak and loudness.
        static void WriteWav(AudioClip c, string dir)
        {
            var data = new float[c.samples];
            c.GetData(data, 0);
            float peak = 0; double sum = 0;
            foreach (var v in data) { peak = Mathf.Max(peak, Mathf.Abs(v)); sum += v * v; }
            System.IO.Directory.CreateDirectory(dir);
            var path = System.IO.Path.Combine(dir, c.name + ".wav");
            using (var w = new System.IO.BinaryWriter(System.IO.File.Create(path)))
            {
                int bytes = data.Length * 2;
                w.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); w.Write(36 + bytes);
                w.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); w.Write(16); w.Write((short)1); w.Write((short)1);
                w.Write(SR); w.Write(SR * 2); w.Write((short)2); w.Write((short)16);
                w.Write(System.Text.Encoding.ASCII.GetBytes("data")); w.Write(bytes);
                foreach (var v in data) w.Write((short)(Mathf.Clamp(v, -1, 1) * 32767));
            }
            Debug.Log($"[Wav] {c.name}: {data.Length / (float)SR:0.0}s peak={peak:0.00} rms={System.Math.Sqrt(sum / data.Length):0.000} -> {path}");
        }

        // ---------- instruments ----------
        static void Ride(float[] d, int s0, float amp, float decay = 0.9f)
        {
            float[] partials = { 3120f, 4430f, 5210f, 6890f, 8120f };
            int len = (int)(decay * SR);
            float hp = 0;
            for (int j = 0; j < len && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float t = j / (float)SR;
                float env = Mathf.Exp(-t * 4.5f / decay) * (j < 40 ? j / 40f : 1);
                float ping = 0;
                foreach (var p in partials) ping += Mathf.Sin(2 * Mathf.PI * p * t);
                float nz = Noise(); hp += (nz - hp) * 0.6f;
                d[s0 + j] += (ping * 0.12f + (nz - hp) * 0.6f) * env * amp;
            }
        }

        static void Chick(float[] d, int s0, float amp)
        {
            float hp = 0;
            for (int j = 0; j < SR * 0.06f && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float nz = Noise(); hp += (nz - hp) * 0.5f;
                d[s0 + j] += (nz - hp) * Mathf.Exp(-j / 260f) * amp;
            }
        }

        static void Kick(float[] d, int s0, float amp)
        {
            for (int j = 0; j < SR * 0.2f && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float t = j / (float)SR;
                d[s0 + j] += Mathf.Sin(2 * Mathf.PI * (60 + 40 * Mathf.Exp(-t * 30)) * t) * Mathf.Exp(-t * 14) * amp;
            }
        }

        static void Brush(float[] d, int s0, float amp)
        {
            float lp = 0;
            for (int j = 0; j < SR * 0.18f && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float nz = Noise(); lp += (nz - lp) * 0.35f;
                d[s0 + j] += lp * Mathf.Exp(-j / 1400f) * amp;
            }
        }

        // Upright bass: a round fundamental, a little growl, a soft finger thump at the start.
        static void Bass(float[] d, int s0, float f, float dur, float amp)
        {
            int len = (int)(dur * SR);
            for (int j = 0; j < len && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float t = j / (float)SR;
                float env = Mathf.Min(1, j / 60f) * Mathf.Exp(-t * 2.4f) * Mathf.Min(1, (len - j) / 300f);
                float ph = 2 * Mathf.PI * f * t;
                float v = Mathf.Sin(ph) + 0.35f * Mathf.Sin(2 * ph) * Mathf.Exp(-t * 5) + 0.12f * Mathf.Sin(3 * ph) * Mathf.Exp(-t * 8);
                float thump = Mathf.Sin(2 * Mathf.PI * 90 * t) * Mathf.Exp(-t * 60) * 0.5f;
                d[s0 + j] += (v + thump) * env * amp;
            }
        }

        static void Piano(float[] d, float[] send, int s0, float f, float dur, float amp)
        {
            int len = (int)((dur + 0.4f) * SR);
            for (int j = 0; j < len && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float t = j / (float)SR;
                float release = t > dur ? Mathf.Exp(-(t - dur) * 12) : 1;
                float env = Mathf.Min(1, j / 30f) * Mathf.Exp(-t * 2.2f) * release;
                float ph = 2 * Mathf.PI * f * t;
                float v = Mathf.Sin(ph) + 0.45f * Mathf.Sin(2 * ph) * Mathf.Exp(-t * 3) + 0.2f * Mathf.Sin(3 * ph) * Mathf.Exp(-t * 5)
                          + 0.08f * Mathf.Sin(4.01f * ph) * Mathf.Exp(-t * 7);
                d[s0 + j] += v * env * amp;
                send[s0 + j] += v * env * amp * 0.6f;
            }
        }

        // Harmon-muted trumpet: thin, buzzy and close. The tone is a stack of harmonics weighted toward the
        // upper-middle (the mute's nasal peak), a small scoop up into each note, and vibrato that only comes in
        // on the long ones.
        static void Trumpet(float[] d, float[] send, int s0, float f, float dur, float amp)
        {
            int len = (int)((dur + 0.12f) * SR);
            float ph = 0;
            for (int j = 0; j < len && s0 + j < d.Length; j++)
            {
                if (s0 + j < 0) continue;
                float t = j / (float)SR;
                float attack = Mathf.Min(1, t / 0.05f);
                float release = t > dur ? Mathf.Exp(-(t - dur) * 30) : 1;
                float breath = dur > 1.2f ? 0.85f + 0.15f * Mathf.Exp(-t * 0.8f) : 1;   // long notes ease off, then hang
                float scoop = 1 - 0.03f * Mathf.Exp(-t * 25);
                float vib = 1 + (t > 0.45f ? 0.006f * Mathf.Min(1, (t - 0.45f) * 2) * Mathf.Sin(2 * Mathf.PI * 5.2f * t) : 0);
                ph += 2 * Mathf.PI * f * scoop * vib / SR;
                float v = 0.35f * Mathf.Sin(ph) + 0.5f * Mathf.Sin(2 * ph) + 0.55f * Mathf.Sin(3 * ph) + 0.6f * Mathf.Sin(4 * ph)
                        + 0.45f * Mathf.Sin(5 * ph) + 0.3f * Mathf.Sin(6 * ph) + 0.16f * Mathf.Sin(7 * ph) + 0.08f * Mathf.Sin(8 * ph);
                v += Noise() * 0.06f * attack;   // air
                float e = attack * release * breath;
                d[s0 + j] += v * e * amp;
                send[s0 + j] += v * e * amp * 0.9f;
            }
        }

        // A small, dark room: three feedback combs and an all-pass, mixed under the dry signal.
        static void Room(float[] send, float[] outp)
        {
            int[] combs = { 1601, 1867, 2053 };
            var wet = new float[send.Length];
            foreach (int dl in combs)
            {
                var buf = new float[send.Length];
                float lp = 0;
                for (int i = 0; i < send.Length; i++)
                {
                    float fb = i >= dl ? buf[i - dl] : 0;
                    lp += (fb - lp) * 0.45f;           // darken the tail
                    buf[i] = send[i] + lp * 0.72f;
                    wet[i] += buf[i];
                }
            }
            int ap = 556; float g = 0.5f;
            var apBuf = new float[send.Length];
            for (int i = 0; i < send.Length; i++)
            {
                float x = wet[i] / combs.Length;
                float delayed = i >= ap ? apBuf[i - ap] : 0;
                float y = -g * x + delayed;
                apBuf[i] = x + g * y;
                outp[i] += y * 0.32f;
            }
        }
    }
}
