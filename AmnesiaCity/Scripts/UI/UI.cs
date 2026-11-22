using System.Collections.Generic;
using UnityEngine;

namespace AmnesiaCity
{
    // All on-screen text and HUD, drawn with Unity's immediate-mode GUI so the slice needs
    // no UI packages or prefabs. Laid out on a 1920x1080 canvas and scaled to the screen.
    public class UI : MonoBehaviour
    {
        public static UI I;
        const float W = 1920, H = 1080;

        // ----- state the game sets -----
        public string Objective;
        public string Prompt;
        public float Letterbox;          // 0..1
        public float Black;              // full-screen fade 0..1
        public string CardTitle, CardSub; public float CardAlpha;
        public bool ShowNotebook;
        public List<(string title, string body)> NotebookEntries = new List<(string, string)>();
        public string NotebookFooter;
        public GravenController Graven;
        public BossController Boss;
        public bool MechHud;
        public bool Sharp;
        public string HintLine;

        // dialogue
        public string Speaker, Line;
        int shown;
        float typeTimer;
        public bool Typing => Line != null && shown < Line.Length;
        public List<string> Choices;
        public int Picked = -1;

        // toasts and floating numbers
        readonly List<(string text, float t, Color c)> toasts = new List<(string, float, Color)>();
        readonly List<(Vector3 pos, string text, float t, Color c, float size)> floaters = new List<(Vector3, string, float, Color, float)>();

        // pause menu callbacks
        public bool PauseOpen;
        public System.Action OnResume, OnRestartFight, OnQuit;
        public bool CanRestartFight;

        Texture2D white, vignette, grain;
        GUIStyle sTitle, sSub, sBody, sNarr, sSpeaker, sSmall, sPrompt, sChoice, sNum, sBig, sCenter;
        Font serif, sans;

        public static Font LoadFont(int size)
        {
            Font f = null;
            try { f = Font.CreateDynamicFontFromOSFont(new[] { "Georgia", "Palatino Linotype", "Times New Roman", "Liberation Serif", "DejaVu Serif" }, size); }
            catch { f = null; }
            if (f == null) f = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            return f;
        }

        void Awake()
        {
            I = this;
            white = Tex(Color.white);
            vignette = MakeVignette();
            grain = MakeGrain();
            serif = LoadFont(32);
            try { sans = Font.CreateDynamicFontFromOSFont(new[] { "Futura", "Century Gothic", "Gill Sans MT", "Segoe UI", "Helvetica", "Liberation Sans", "DejaVu Sans" }, 28); }
            catch { sans = serif; }
            if (sans == null) sans = serif;
        }

        static Texture2D Tex(Color c)
        {
            var t = new Texture2D(1, 1);
            t.SetPixel(0, 0, c);
            t.Apply();
            return t;
        }

        static Texture2D MakeVignette()
        {
            const int S = 128;
            var t = new Texture2D(S, S, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float dx = (x - S / 2f) / (S / 2f), dy = (y - S / 2f) / (S / 2f);
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    t.SetPixel(x, y, new Color(0, 0, 0, Mathf.Clamp01((d - 0.55f) * 1.3f) * 0.85f));
                }
            t.Apply();
            return t;
        }

        static Texture2D MakeGrain()
        {
            const int S = 256;
            var t = new Texture2D(S, S, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Point };
            var r = new System.Random(3);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float v = (float)r.NextDouble();
                    t.SetPixel(x, y, new Color(v, v, v, 0.06f));
                }
            t.Apply();
            return t;
        }

        void Styles()
        {
            if (sTitle != null) return;
            GUIStyle Make(Font f, int size, FontStyle fs, TextAnchor a, Color c, bool wrap = true)
            {
                var s = new GUIStyle(GUI.skin.label) { font = f, fontSize = size, fontStyle = fs, alignment = a, wordWrap = wrap, richText = true };
                s.normal.textColor = c;
                return s;
            }
            var paper = new Color(0.93f, 0.9f, 0.84f);
            var amber = new Color(0.95f, 0.72f, 0.38f);
            sTitle = Make(sans, 96, FontStyle.Bold, TextAnchor.MiddleCenter, paper);
            sSub = Make(serif, 38, FontStyle.Italic, TextAnchor.MiddleCenter, amber);
            sBody = Make(serif, 34, FontStyle.Normal, TextAnchor.UpperLeft, paper);
            sNarr = Make(serif, 36, FontStyle.Italic, TextAnchor.UpperCenter, new Color(0.85f, 0.85f, 0.9f));
            sSpeaker = Make(sans, 24, FontStyle.Bold, TextAnchor.UpperLeft, amber);
            sSmall = Make(serif, 26, FontStyle.Italic, TextAnchor.UpperLeft, new Color(0.8f, 0.8f, 0.82f));
            sPrompt = Make(sans, 28, FontStyle.Bold, TextAnchor.MiddleCenter, paper);
            sChoice = Make(serif, 30, FontStyle.Normal, TextAnchor.MiddleLeft, paper);
            sChoice.hover.textColor = amber;
            sNum = Make(sans, 30, FontStyle.Bold, TextAnchor.MiddleCenter, Color.white, false);
            sBig = Make(sans, 54, FontStyle.Bold, TextAnchor.MiddleCenter, paper);
            sCenter = Make(serif, 30, FontStyle.Normal, TextAnchor.UpperCenter, paper);
        }

        // ----- API -----
        public void SetLine(string speaker, string text)
        {
            Speaker = speaker; Line = text; shown = 0; typeTimer = 0;
        }
        public void FinishTyping() { if (Line != null) shown = Line.Length; }
        public void ClearLine() { Line = null; Speaker = null; }
        public void Toast(string text, Color? c = null) => toasts.Add((text, 0, c ?? new Color(0.95f, 0.72f, 0.38f)));
        public void Floater(Vector3 world, string text, Color c, float size = 1f) => floaters.Add((world, text, 0, c, size));

        void Update()
        {
            if (Line != null && shown < Line.Length)
            {
                typeTimer += Time.unscaledDeltaTime * 55f;
                while (typeTimer >= 1 && shown < Line.Length) { shown++; typeTimer -= 1; }
            }
            for (int i = toasts.Count - 1; i >= 0; i--)
            {
                var t = toasts[i]; t.t += Time.unscaledDeltaTime; toasts[i] = t;
                if (t.t > 4f) toasts.RemoveAt(i);
            }
            for (int i = floaters.Count - 1; i >= 0; i--)
            {
                var f = floaters[i]; f.t += Time.unscaledDeltaTime; f.pos += Vector3.up * Time.unscaledDeltaTime * 4f; floaters[i] = f;
                if (f.t > 1.2f) floaters.RemoveAt(i);
            }
        }

        void Fill(Rect r, Color c)
        {
            var old = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, white);
            GUI.color = old;
        }

        void Bar(Rect r, float v, Color fill, Color back, Color? ghost = null, float ghostV = 0)
        {
            Fill(r, back);
            if (ghost.HasValue) Fill(new Rect(r.x, r.y, r.width * Mathf.Clamp01(ghostV), r.height), ghost.Value);
            Fill(new Rect(r.x, r.y, r.width * Mathf.Clamp01(v), r.height), fill);
            Fill(new Rect(r.x, r.y, r.width, 2), new Color(1, 1, 1, 0.15f));
        }

        void Text(Rect r, string s, GUIStyle st, float alpha = 1f)
        {
            var old = GUI.color;
            GUI.color = new Color(0, 0, 0, alpha * 0.8f);
            GUI.Label(new Rect(r.x + 2, r.y + 3, r.width, r.height), s, st);
            GUI.color = new Color(1, 1, 1, alpha);
            GUI.Label(r, s, st);
            GUI.color = old;
        }

        float ghostBoss = 1, ghostGraven = 1;

        void OnGUI()
        {
            Styles();
            float scale = Screen.height / H;
            float vw = Screen.width / scale; // virtual width at 1080p height
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(scale, scale, 1));
            var cam = Camera.main;

            // floating damage numbers
            if (cam != null)
                foreach (var f in floaters)
                {
                    var sp = cam.WorldToScreenPoint(f.pos);
                    if (sp.z < 0) continue;
                    float a = 1 - Mathf.Clamp01((f.t - 0.6f) / 0.6f);
                    float pop = 1 + Mathf.Max(0, 0.4f - f.t) * 2f;
                    var st = new GUIStyle(sNum) { fontSize = (int)(sNum.fontSize * f.size * pop) };
                    st.normal.textColor = f.c;
                    Text(new Rect(sp.x / scale - 150, (Screen.height - sp.y) / scale - 30, 300, 60), f.text, st, a);
                }

            // film look: vignette and grain
            GUI.DrawTexture(new Rect(0, 0, vw, H), vignette, ScaleMode.StretchToFill);
            var gr = new Rect(Random.value, Random.value, vw / 256f, H / 256f);
            GUI.DrawTextureWithTexCoords(new Rect(0, 0, vw, H), grain, gr);

            // objective
            if (!string.IsNullOrEmpty(Objective) && Letterbox < 0.5f && !MechHud)
                Text(new Rect(48, 36, 900, 80), "<size=20><b>CASE</b></size>\n" + Objective, sSmall);

            if (MechHud) DrawMechHud(vw);

            // toasts
            float ty = 150;
            foreach (var t in toasts)
            {
                float a = Mathf.Clamp01(t.t * 4) * Mathf.Clamp01((4f - t.t) * 2);
                var st = new GUIStyle(sPrompt) { fontSize = 30 };
                st.normal.textColor = t.c;
                Fill(new Rect(vw / 2 - 420, ty - 6, 840, 56), new Color(0, 0, 0, 0.55f * a));
                Text(new Rect(vw / 2 - 420, ty - 6, 840, 56), t.text, st, a);
                ty += 66;
            }

            // interaction prompt
            if (!string.IsNullOrEmpty(Prompt) && Line == null)
            {
                Fill(new Rect(vw / 2 - 300, H - 230, 600, 56), new Color(0, 0, 0, 0.55f));
                Text(new Rect(vw / 2 - 300, H - 230, 600, 56), Prompt, sPrompt);
            }

            // letterbox bars
            if (Letterbox > 0)
            {
                float bh = 130 * Letterbox;
                Fill(new Rect(0, 0, vw, bh), Color.black);
                Fill(new Rect(0, H - bh, vw, bh), Color.black);
            }

            if (ShowNotebook) DrawNotebook(vw);

            // dialogue / narration
            if (Line != null)
            {
                string s = Line.Substring(0, Mathf.Min(shown, Line.Length));
                if (string.IsNullOrEmpty(Speaker))
                {
                    var r = new Rect(vw / 2 - 760, H - 240, 1520, 190);
                    Fill(new Rect(0, H - 260, vw, 260), new Color(0, 0, 0, 0.45f));
                    Text(r, s, sNarr);
                }
                else
                {
                    var box = new Rect(vw / 2 - 760, H - 300, 1520, 250);
                    Fill(box, new Color(0.03f, 0.03f, 0.05f, 0.88f));
                    Fill(new Rect(box.x, box.y, box.width, 3), new Color(0.95f, 0.72f, 0.38f, 0.9f));
                    Text(new Rect(box.x + 40, box.y + 22, 800, 40), Speaker.ToUpperInvariant(), sSpeaker);
                    Text(new Rect(box.x + 40, box.y + 62, box.width - 80, 180), s, sBody);
                }
                if (!Typing && (Choices == null || Choices.Count == 0))
                    Text(new Rect(vw / 2 + 600, H - 92, 160, 40), "▼", sPrompt, 0.5f + 0.5f * Mathf.Sin(Time.unscaledTime * 6));
            }

            // choices
            if (Choices != null && Choices.Count > 0 && !Typing)
            {
                float h = 64, y0 = H - 320 - Choices.Count * (h + 8);
                for (int i = 0; i < Choices.Count; i++)
                {
                    var r = new Rect(vw / 2 - 560, y0 + i * (h + 8), 1120, h);
                    bool hover = r.Contains(Event.current.mousePosition);
                    Fill(r, hover ? new Color(0.2f, 0.14f, 0.08f, 0.92f) : new Color(0.03f, 0.03f, 0.05f, 0.88f));
                    Fill(new Rect(r.x, r.y, 4, r.height), new Color(0.95f, 0.72f, 0.38f, hover ? 1f : 0.5f));
                    Text(new Rect(r.x + 24, r.y, r.width - 40, r.height), $"<b>{i + 1}.</b>  {Choices[i]}", sChoice);
                    if (GUI.Button(r, GUIContent.none, GUIStyle.none)) Picked = i;
                }
            }

            // title card
            if (CardAlpha > 0)
            {
                Fill(new Rect(0, 0, vw, H), new Color(0, 0, 0, CardAlpha * 0.6f));
                Text(new Rect(0, H / 2 - 120, vw, 140), CardTitle, sTitle, CardAlpha);
                if (!string.IsNullOrEmpty(CardSub)) Text(new Rect(0, H / 2 + 20, vw, 80), CardSub, sSub, CardAlpha);
            }

            // fades and flashes
            if (Black > 0) Fill(new Rect(0, 0, vw, H), new Color(0, 0, 0, Black));
            if (Fx.I != null && Fx.I.FlashAlpha > 0) { var c = Fx.I.FlashColor; c.a *= Fx.I.FlashAlpha; Fill(new Rect(0, 0, vw, H), c); }

            if (PauseOpen) DrawPause(vw);
        }

        void DrawNotebook(float vw)
        {
            var r = new Rect(vw / 2 - 640, 110, 1280, 820);
            Fill(r, new Color(0.9f, 0.86f, 0.76f, 0.97f));
            Fill(new Rect(r.x + 60, r.y, 3, r.height), new Color(0.75f, 0.25f, 0.2f, 0.6f));
            var ink = new Color(0.15f, 0.12f, 0.12f);
            var h = new GUIStyle(sTitle) { fontSize = 44, alignment = TextAnchor.UpperLeft }; h.normal.textColor = ink;
            var b = new GUIStyle(sBody) { fontSize = 26 }; b.normal.textColor = ink;
            var t = new GUIStyle(sSpeaker) { fontSize = 24 }; t.normal.textColor = new Color(0.55f, 0.2f, 0.15f);
            GUI.Label(new Rect(r.x + 90, r.y + 30, 1000, 60), "NOTEBOOK — The Quill Case", h);
            float y = r.y + 110;
            if (NotebookEntries.Count == 0) GUI.Label(new Rect(r.x + 90, y, 1100, 40), "Nothing yet. Talk to people. Look closely.", b);
            foreach (var e in NotebookEntries)
            {
                GUI.Label(new Rect(r.x + 90, y, 1100, 34), e.title.ToUpperInvariant(), t);
                var bh = b.CalcHeight(new GUIContent(e.body), 1100);
                GUI.Label(new Rect(r.x + 90, y + 34, 1100, bh), e.body, b);
                y += 44 + bh;
            }
            var f = new GUIStyle(sSmall); f.normal.textColor = new Color(0.35f, 0.3f, 0.28f);
            GUI.Label(new Rect(r.x + 90, r.yMax - 70, 1100, 50), NotebookFooter ?? "[Tab] Close", f);
        }

        void DrawMechHud(float vw)
        {
            if (Boss != null)
            {
                var r = new Rect(vw / 2 - 600, 52, 1200, 22);
                ghostBoss = Mathf.MoveTowards(ghostBoss, Boss.Hp01, Time.unscaledDeltaTime * 0.25f);
                if (ghostBoss < Boss.Hp01) ghostBoss = Boss.Hp01;
                Text(new Rect(r.x, r.y - 44, 900, 40), $"<b>THE TIDEWARDEN</b>  <size=20><i>Relic from before the Blank</i></size>", sSmall);
                Bar(r, Boss.Hp01, new Color(0.85f, 0.3f, 0.2f), new Color(0, 0, 0, 0.6f), new Color(1f, 0.85f, 0.6f, 0.8f), ghostBoss);
                Bar(new Rect(r.x, r.yMax + 6, r.width, 9), Boss.Posture01, Boss.Staggered ? new Color(1f, 0.9f, 0.4f) : new Color(0.95f, 0.72f, 0.38f), new Color(0, 0, 0, 0.5f));
                var tag = Boss.Staggered ? (Sharp ? "CORE EXPOSED — strike now (×3)" : "CORE EXPOSED — strike now (×2)") : Boss.PhaseName;
                Text(new Rect(r.x, r.yMax + 18, r.width, 40), $"<size=22>{tag}</size>", sPrompt);
                if (Boss.CanFinish) Text(new Rect(0, H / 2 + 120, vw, 70), "[F]  FINISH IT", sBig, 0.6f + 0.4f * Mathf.Sin(Time.unscaledTime * 8));
            }
            if (Graven != null)
            {
                var r = new Rect(60, H - 150, 560, 22);
                ghostGraven = Mathf.MoveTowards(ghostGraven, Graven.Hp01, Time.unscaledDeltaTime * 0.3f);
                if (ghostGraven < Graven.Hp01) ghostGraven = Graven.Hp01;
                Text(new Rect(r.x, r.y - 44, 600, 40), "<b>THE GRAVEN</b>", sSmall);
                Bar(r, Graven.Hp01, new Color(0.55f, 0.75f, 0.95f), new Color(0, 0, 0, 0.6f), new Color(1f, 0.4f, 0.3f, 0.8f), ghostGraven);
                var hr = new Rect(60, H - 112, 560, 14);
                Color heat = Graven.Overheated ? new Color(1f, 0.3f, 0.2f) : Color.Lerp(new Color(0.95f, 0.72f, 0.38f), new Color(1f, 0.35f, 0.2f), Graven.Heat01);
                Bar(hr, Graven.Heat01, heat, new Color(0, 0, 0, 0.5f));
                Text(new Rect(r.x, hr.yMax + 4, 600, 34), Graven.Overheated ? "<b>OVERHEATED</b> — locked up" : $"HEAT {Mathf.RoundToInt(Graven.Heat01 * 100)}%{(Graven.Heat01 > 0.7f ? "   [E] vent" : "")}", sSmall);
                if (Graven.ChargeLevel > 0)
                {
                    var cr = new Rect(vw / 2 - 150, H / 2 + 80, 300, 12);
                    Bar(cr, Graven.ChargeLevel, new Color(1f, 0.85f, 0.45f), new Color(0, 0, 0, 0.5f));
                }
            }
            Text(new Rect(vw - 760, H - 190, 700, 180),
                "<size=22>[LMB] Jab   [RMB] Heavy   [Q] hold: Piston\n[Shift] Guard (perfect timing parries)\n[Space] Dodge   [E] Vent heat</size>", new GUIStyle(sSmall) { alignment = TextAnchor.LowerRight });
            if (!string.IsNullOrEmpty(HintLine)) Text(new Rect(0, H - 300, vw, 50), $"<size=24>{HintLine}</size>", sPrompt);
        }

        void DrawPause(float vw)
        {
            Fill(new Rect(0, 0, vw, H), new Color(0, 0, 0, 0.75f));
            Text(new Rect(0, 160, vw, 100), "PAUSED", sTitle);
            Text(new Rect(0, 290, vw, 360),
                "<b>On foot</b>  WASD move · Mouse look · Shift run · E interact · Tab notebook\n" +
                "<b>The Graven</b>  LMB jab · RMB heavy · hold Q piston · Shift guard · Space dodge · E vent · F finish\n" +
                "Gamepad works too.  F9 switches between toon and plain shading.\n\n" +
                $"Mouse sensitivity: {In.LookSensitivity:0.0}", sCenter);
            float y = 680;
            if (Btn(new Rect(vw / 2 - 200, y, 400, 60), "Resume")) OnResume?.Invoke();
            y += 76;
            if (Btn(new Rect(vw / 2 - 200, y, 190, 50), "Sensitivity −")) In.LookSensitivity = Mathf.Max(0.2f, In.LookSensitivity - 0.2f);
            if (Btn(new Rect(vw / 2 + 10, y, 190, 50), "Sensitivity +")) In.LookSensitivity = Mathf.Min(4f, In.LookSensitivity + 0.2f);
            y += 66;
            if (CanRestartFight && Btn(new Rect(vw / 2 - 200, y, 400, 56), "Restart the fight")) OnRestartFight?.Invoke();
            y += 72;
            if (Btn(new Rect(vw / 2 - 200, y, 400, 56), "Quit")) OnQuit?.Invoke();
            Text(new Rect(0, H - 60, vw, 40), $"<size=20>Amnesia City {Game.Version}</size>", sCenter, 0.6f);
        }

        bool Btn(Rect r, string label)
        {
            bool hover = r.Contains(Event.current.mousePosition);
            Fill(r, hover ? new Color(0.25f, 0.17f, 0.1f, 0.95f) : new Color(0.08f, 0.08f, 0.1f, 0.95f));
            Fill(new Rect(r.x, r.yMax - 3, r.width, 3), new Color(0.95f, 0.72f, 0.38f, hover ? 1 : 0.4f));
            Text(r, label, sPrompt);
            return GUI.Button(r, GUIContent.none, GUIStyle.none);
        }
    }
}
