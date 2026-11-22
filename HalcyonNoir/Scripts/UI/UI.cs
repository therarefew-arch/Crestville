using System.Collections.Generic;
using UnityEngine;

namespace HalcyonNoir
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
        public float Trail = -1;         // 0..1, the trail meter; -1 hides it

        // the street brawl
        public PlayerMotor Brawler;
        public List<Thug> BrawlFoes;
        // the lockpick: a needle sweeps the track, set each pin while it's inside the bright zone
        public bool PickOpen;
        public int PickPins = 3, PickSet, PickStrikes, PickMaxStrikes = 3;
        public float PickNeedle, PickZone, PickWidth, PickShake;
        // the cockpit link readout
        public string LinkText; public float LinkAlpha;

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

        static readonly string[] SerifNames = { "Georgia", "Palatino Linotype", "Times New Roman", "Liberation Serif", "DejaVu Serif" };
        static readonly string[] SansNames = { "Futura", "Century Gothic", "Gill Sans MT", "Segoe UI", "Helvetica", "Liberation Sans", "DejaVu Sans" };

        // Pass only a font that is actually installed. On Unity 6.x, handing CreateDynamicFontFromOSFont a
        // list whose first names are missing gives a font that draws nothing, and IMGUI then shows the
        // previous label's text in its place.
        static Font OsFont(string[] preferred, int size)
        {
            try
            {
                var installed = new HashSet<string>(Font.GetOSInstalledFontNames(), System.StringComparer.OrdinalIgnoreCase);
                foreach (var n in preferred)
                    if (installed.Contains(n)) return Font.CreateDynamicFontFromOSFont(n, size);
            }
            catch { }
            return null;
        }

        public static Font LoadFont(int size) => OsFont(SerifNames, size) ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        void Awake()
        {
            I = this;
            white = Tex(Color.white);
            vignette = MakeVignette();
            grain = MakeGrain();
            serif = LoadFont(32);
            sans = OsFont(SansNames, 28) ?? serif;
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
            if (DevArgs.Auto) Debug.Log($"[Auto] {(string.IsNullOrEmpty(speaker) ? "(narration)" : speaker)}: {text}");
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

        // Layout is authored on a 1920x1080 virtual canvas. We scale every rect and font size by hand
        // instead of using GUI.matrix: on Unity 6.x the IMGUI text cache returns stale strings at the
        // wrong positions when a scale matrix is set (labels showed previous frames' text).
        float k = 1;
        Rect R(Rect r) => new Rect(r.x * k, r.y * k, r.width * k, r.height * k);
        Vector2 Mouse => Event.current.mousePosition / k;
        static readonly System.Text.RegularExpressions.Regex sizeTag = new System.Text.RegularExpressions.Regex(@"<size=(\d+)>");
        string ScaleTags(string s) => s.IndexOf("<size=", System.StringComparison.Ordinal) < 0 ? s
            : sizeTag.Replace(s, m => $"<size={Mathf.Max(1, Mathf.RoundToInt(int.Parse(m.Groups[1].Value) * k))}>");

        void Lbl(Rect r, string s, GUIStyle st)
        {
            int fs = st.fontSize;
            st.fontSize = Mathf.Max(1, Mathf.RoundToInt(fs * k));
            GUI.Label(R(r), ScaleTags(s), st);
            st.fontSize = fs;
        }

        float TextWidth(GUIStyle st, string s)
        {
            int fs = st.fontSize; bool wrap = st.wordWrap;
            st.fontSize = Mathf.Max(1, Mathf.RoundToInt(fs * k)); st.wordWrap = false;
            float w = st.CalcSize(new GUIContent(ScaleTags(s))).x / k;
            st.fontSize = fs; st.wordWrap = wrap;
            return w;
        }

        float CalcHeight(GUIStyle st, string s, float width)
        {
            int fs = st.fontSize;
            st.fontSize = Mathf.Max(1, Mathf.RoundToInt(fs * k));
            float h = st.CalcHeight(new GUIContent(ScaleTags(s)), width * k) / k;
            st.fontSize = fs;
            return h;
        }

        void Fill(Rect r, Color c)
        {
            var old = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(R(r), white);
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
            Lbl(new Rect(r.x + 2, r.y + 3, r.width, r.height), s, st);
            GUI.color = new Color(1, 1, 1, alpha);
            Lbl(r, s, st);
            GUI.color = old;
        }

        float ghostBoss = 1, ghostGraven = 1;

        void OnGUI()
        {
            Styles();
            float scale = k = Screen.height / H;
            float vw = Screen.width / scale; // virtual width at 1080p height
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
            GUI.DrawTexture(R(new Rect(0, 0, vw, H)), vignette, ScaleMode.StretchToFill);
            var gr = new Rect(Random.value, Random.value, vw / 256f, H / 256f);
            GUI.DrawTextureWithTexCoords(R(new Rect(0, 0, vw, H)), grain, gr);

            // objective
            if (!string.IsNullOrEmpty(Objective) && Letterbox < 0.5f && !MechHud)
                Text(new Rect(48, 36, 900, 80), "<size=20><b>CASE</b></size>\n" + Objective, sSmall);

            // the trail: how deep into the case Vane is. The deeper, the more he smokes.
            if (Trail >= 0 && Letterbox < 0.5f && !MechHud && Brawler == null)
            {
                Text(new Rect(48, H - 98, 300, 30), "<size=16>THE TRAIL</size>", sSmall, 0.7f);
                var oldc = GUI.color;
                int segs = 8, lit = Mathf.RoundToInt(Trail * segs);
                for (int i = 0; i < segs; i++)
                {
                    GUI.color = i < lit ? new Color(1f, 0.55f, 0.2f, 0.9f) : new Color(1f, 1f, 1f, 0.18f);
                    GUI.DrawTexture(R(new Rect(150 + i * 22, H - 87, 16, 6)), Texture2D.whiteTexture);
                }
                GUI.color = oldc;
                Text(new Rect(48, H - 66, 500, 30), "<size=15>[C] smoke · think it over</size>", sSmall, 0.4f);
            }

            if (MechHud) DrawMechHud(vw);
            if (Brawler != null) DrawBrawlHud(vw);
            if (PickOpen) DrawLockpick(vw);
            if (!string.IsNullOrEmpty(HintLine)) Text(new Rect(0, H - 300, vw, 50), $"<size=24>{HintLine}</size>", sPrompt);
            if (LinkAlpha > 0 && !string.IsNullOrEmpty(LinkText))
            {
                var st = new GUIStyle(sPrompt) { fontSize = 44, alignment = TextAnchor.MiddleLeft };
                st.normal.textColor = new Color(1f, 0.72f, 0.35f);
                Text(new Rect(140, H / 2 - 120, 1000, 240), LinkText, st, LinkAlpha);
            }
            // the build version, small in the corner, so screenshots and bug reports say which build they're from
            Text(new Rect(vw - 260, H - 44, 240, 36), $"<size=18>Halcyon Noir {Game.Version}</size>", new GUIStyle(sSmall) { alignment = TextAnchor.LowerRight }, 0.45f);

            // toasts
            float ty = 150;
            foreach (var t in toasts)
            {
                float a = Mathf.Clamp01(t.t * 4) * Mathf.Clamp01((4f - t.t) * 2);
                var st = new GUIStyle(sPrompt) { fontSize = 30 };
                st.normal.textColor = t.c;
                // size the box to the text so long hints (like the controls line) never wrap or clip
                float tw = Mathf.Clamp(TextWidth(st, t.text) + 60, 500, vw - 120);
                Fill(new Rect(vw / 2 - tw / 2, ty - 6, tw, 56), new Color(0, 0, 0, 0.55f * a));
                Text(new Rect(vw / 2 - tw / 2, ty - 6, tw, 56), t.text, st, a);
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
                    Text(new Rect(vw / 2 + 560, H - 92, 200, 40), "<size=22>[E]  ›</size>", sPrompt, 0.5f + 0.5f * Mathf.Sin(Time.unscaledTime * 6));
            }

            // choices
            if (Choices != null && Choices.Count > 0 && !Typing)
            {
                float h = 64, y0 = H - 320 - Choices.Count * (h + 8);
                for (int i = 0; i < Choices.Count; i++)
                {
                    var r = new Rect(vw / 2 - 560, y0 + i * (h + 8), 1120, h);
                    bool hover = r.Contains(Mouse);
                    Fill(r, hover ? new Color(0.2f, 0.14f, 0.08f, 0.92f) : new Color(0.03f, 0.03f, 0.05f, 0.88f));
                    Fill(new Rect(r.x, r.y, 4, r.height), new Color(0.95f, 0.72f, 0.38f, hover ? 1f : 0.5f));
                    Text(new Rect(r.x + 24, r.y, r.width - 40, r.height), $"<b>{i + 1}.</b>  {Choices[i]}", sChoice);
                    if (GUI.Button(R(r), GUIContent.none, GUIStyle.none)) Picked = i;
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
            Lbl(new Rect(r.x + 90, r.y + 30, 1000, 60), "NOTEBOOK — The Quill Case", h);
            float y = r.y + 110;
            if (NotebookEntries.Count == 0) Lbl(new Rect(r.x + 90, y, 1100, 40), "Nothing yet. Talk to people. Look closely.", b);
            foreach (var e in NotebookEntries)
            {
                Lbl(new Rect(r.x + 90, y, 1100, 34), e.title.ToUpperInvariant(), t);
                var bh = CalcHeight(b, e.body, 1100);
                Lbl(new Rect(r.x + 90, y + 34, 1100, bh), e.body, b);
                y += 44 + bh;
            }
            var f = new GUIStyle(sSmall); f.normal.textColor = new Color(0.35f, 0.3f, 0.28f);
            Lbl(new Rect(r.x + 90, r.yMax - 70, 1100, 50), NotebookFooter ?? "[Tab] Close", f);
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
        }

        void DrawBrawlHud(float vw)
        {
            var p = Brawler;
            var r = new Rect(60, H - 150, 420, 18);
            Text(new Rect(r.x, r.y - 44, 600, 40), "<b>VANE</b>", sSmall);
            Bar(r, p.Hp / p.MaxHp, new Color(0.9f, 0.85f, 0.78f), new Color(0, 0, 0, 0.6f));
            if (BrawlFoes != null)
            {
                float y = 60;
                foreach (var f in BrawlFoes)
                {
                    if (f == null) continue;
                    Text(new Rect(vw - 460, y - 34, 400, 32), f.IsDown ? "<size=20><i>down</i></size>" : "<size=20>Trust man</size>", new GUIStyle(sSmall) { alignment = TextAnchor.UpperRight }, f.IsDown ? 0.5f : 1f);
                    Bar(new Rect(vw - 360, y, 300, 10), f.Hp / f.MaxHp, new Color(0.75f, 0.75f, 0.78f), new Color(0, 0, 0, 0.5f));
                    y += 56;
                }
            }
            Text(new Rect(vw - 860, H - 190, 800, 180),
                "<size=22>[LMB] Jab (third hit hooks)   [RMB] Haymaker\n[Shift] Guard — tap it as a fist glints to parry\n[Space] Dodge   ·   hit a man mid-windup to break it</size>", new GUIStyle(sSmall) { alignment = TextAnchor.LowerRight });
        }

        void DrawLockpick(float vw)
        {
            var panel = new Rect(vw / 2 - 420, H / 2 - 230, 840, 400);
            Fill(panel, new Color(0.02f, 0.02f, 0.03f, 0.9f));
            Fill(new Rect(panel.x, panel.y, panel.width, 3), new Color(0.95f, 0.72f, 0.38f, 0.9f));
            Text(new Rect(panel.x, panel.y + 20, panel.width, 40), "<size=26><b>THE TIDE GATE LOCK</b></size>", sPrompt);
            // pins
            float pw = 60, gap = 40, x0 = vw / 2 - (PickPins * pw + (PickPins - 1) * gap) / 2;
            for (int i = 0; i < PickPins; i++)
            {
                bool set = i < PickSet, cur = i == PickSet;
                float shake = cur ? Mathf.Sin(Time.unscaledTime * 80) * PickShake * 8 : 0;
                var pr = new Rect(x0 + i * (pw + gap) + shake, panel.y + 80 + (set ? 0 : 30), pw, 90);
                Fill(pr, set ? new Color(0.95f, 0.72f, 0.38f) : cur ? new Color(0.75f, 0.75f, 0.78f) : new Color(0.3f, 0.3f, 0.33f));
            }
            // the track
            var tr = new Rect(panel.x + 80, panel.y + 240, panel.width - 160, 26);
            Fill(tr, new Color(0.12f, 0.12f, 0.14f));
            Fill(new Rect(tr.x + tr.width * (PickZone - PickWidth / 2), tr.y, tr.width * PickWidth, tr.height), new Color(0.95f, 0.72f, 0.38f, 0.85f));
            Fill(new Rect(tr.x + tr.width * PickNeedle - 3, tr.y - 12, 6, tr.height + 24), Color.white);
            string strikes = "";
            for (int i = 0; i < PickMaxStrikes; i++) strikes += i < PickStrikes ? "X " : "· ";
            Text(new Rect(panel.x, tr.yMax + 22, panel.width, 40), $"<size=22>[E] / [LMB]  set the pin when the needle is in the bright zone     slips: {strikes}</size>", sPrompt, 0.85f);
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
            Text(new Rect(0, H - 60, vw, 40), $"<size=20>Halcyon Noir {Game.Version}</size>", sCenter, 0.6f);
        }

        bool Btn(Rect r, string label)
        {
            bool hover = r.Contains(Mouse);
            Fill(r, hover ? new Color(0.25f, 0.17f, 0.1f, 0.95f) : new Color(0.08f, 0.08f, 0.1f, 0.95f));
            Fill(new Rect(r.x, r.yMax - 3, r.width, 3), new Color(0.95f, 0.72f, 0.38f, hover ? 1 : 0.4f));
            Text(r, label, sPrompt);
            return GUI.Button(R(r), GUIContent.none, GUIStyle.none);
        }
    }
}
