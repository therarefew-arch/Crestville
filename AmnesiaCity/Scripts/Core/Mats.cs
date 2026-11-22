using System.Collections.Generic;
using UnityEngine;

namespace AmnesiaCity
{
    // Creates and caches materials. If the custom toon shader isn't available (or fails to
    // compile on this machine), everything falls back to Unity's standard URP Lit shader.
    public static class Mats
    {
        static readonly Dictionary<string, Material> cache = new Dictionary<string, Material>();
        static readonly List<Material> toonMats = new List<Material>();
        static Shader toon, glow, unlit, windows, lit;
        public static bool ToonOn = true;

        static Shader Find(string name)
        {
            var s = Shader.Find(name);
            return s != null && s.isSupported ? s : null;
        }

        public static void Init()
        {
            toon = Find("AmnesiaCity/Toon");
            glow = Find("AmnesiaCity/Glow");
            unlit = Find("AmnesiaCity/Unlit");
            windows = Find("AmnesiaCity/Windows");
            lit = Find("Universal Render Pipeline/Lit") ?? Find("Standard");
            if (toon == null) ToonOn = false;
        }

        static Material Make(Shader s)
        {
            var m = new Material(s != null ? s : lit);
            return m;
        }

        static void SetColor(Material m, string prop, Color c)
        {
            if (m.HasProperty(prop)) m.SetColor(prop, c);
        }

        // Main cel-shaded material. outline is in object units (0 = none).
        public static Material Toon(Color baseColor, Color? emission = null, float outline = 0f, float bands = 2f)
        {
            string key = $"toon{baseColor}{emission}{outline}{bands}";
            if (cache.TryGetValue(key, out var m)) return m;
            m = Make(ToonOn ? toon : lit);
            ApplyToon(m, baseColor, emission ?? Color.black, outline, bands);
            toonMats.Add(m);
            cache[key] = m;
            return m;
        }

        static void ApplyToon(Material m, Color baseColor, Color emission, float outline, float bands)
        {
            SetColor(m, "_BaseColor", baseColor);
            SetColor(m, "_Color", baseColor);
            if (m.HasProperty("_OutlineWidth")) m.SetFloat("_OutlineWidth", outline);
            if (m.HasProperty("_Bands")) m.SetFloat("_Bands", bands);
            SetColor(m, "_EmissionColor", emission);
            if (emission.maxColorComponent > 0.001f) m.EnableKeyword("_EMISSION");
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.35f);
        }

        // Swap every toon material between the toon shader and plain URP Lit (F9).
        public static void ToggleToon()
        {
            if (toon == null) return;
            ToonOn = !ToonOn;
            foreach (var m in toonMats)
            {
                var c = m.HasProperty("_BaseColor") ? m.GetColor("_BaseColor") : Color.white;
                var e = m.HasProperty("_EmissionColor") ? m.GetColor("_EmissionColor") : Color.black;
                float o = m.HasProperty("_OutlineWidth") ? m.GetFloat("_OutlineWidth") : 0f;
                m.shader = ToonOn ? toon : lit;
                ApplyToon(m, c, e, o, 2f);
            }
        }

        public static Material Glow(Color c, float intensity = 1f, bool soft = false)
        {
            string key = $"glow{c}{intensity}{soft}";
            if (cache.TryGetValue(key, out var m)) return m;
            m = Make(glow ?? unlit);
            SetColor(m, "_BaseColor", c);
            if (m.HasProperty("_Intensity")) m.SetFloat("_Intensity", intensity);
            if (m.HasProperty("_SoftEdge")) m.SetFloat("_SoftEdge", soft ? 1f : 0f);
            cache[key] = m;
            return m;
        }

        // A fresh (uncached) glow material, for things that fade or pulse on their own.
        public static Material GlowInstance(Color c, float intensity = 1f, bool soft = false)
        {
            var m = Make(glow ?? unlit);
            SetColor(m, "_BaseColor", c);
            if (m.HasProperty("_Intensity")) m.SetFloat("_Intensity", intensity);
            if (m.HasProperty("_SoftEdge")) m.SetFloat("_SoftEdge", soft ? 1f : 0f);
            return m;
        }

        public static Material Unlit(Color c, Color? emission = null)
        {
            string key = $"unlit{c}{emission}";
            if (cache.TryGetValue(key, out var m)) return m;
            m = Make(unlit ?? lit);
            SetColor(m, "_BaseColor", c);
            SetColor(m, "_EmissionColor", emission ?? Color.black);
            cache[key] = m;
            return m;
        }

        public static Material Windows(Texture2D pattern, Vector2 tiling, Color wall, Color litColor)
        {
            var m = Make(windows ?? unlit ?? lit);
            if (m.HasProperty("_MainTex")) m.SetTexture("_MainTex", pattern);
            if (m.HasProperty("_Tiling")) m.SetVector("_Tiling", new Vector4(tiling.x, tiling.y, 0, 0));
            SetColor(m, "_WallColor", wall);
            SetColor(m, "_LitColor", litColor);
            SetColor(m, "_BaseColor", wall);
            return m;
        }

        public static void SetGlowColor(Material m, Color c)
        {
            SetColor(m, "_BaseColor", c);
        }
    }

    // Small helpers for building things out of primitive shapes.
    public static class Build
    {
        public static GameObject Part(Transform parent, PrimitiveType type, Vector3 localPos, Vector3 localScale, Material mat,
            Vector3? euler = null, bool collider = false, string name = null)
        {
            var go = GameObject.CreatePrimitive(type);
            if (name != null) go.name = name;
            if (!collider)
            {
                var col = go.GetComponent<Collider>();
                if (col != null) Object.Destroy(col);
            }
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = localScale;
            if (euler.HasValue) go.transform.localEulerAngles = euler.Value;
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = mat;
            return go;
        }

        public static Transform Pivot(Transform parent, string name, Vector3 localPos)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            t.localPosition = localPos;
            return t;
        }

        public static Light PointLight(Transform parent, Vector3 localPos, Color color, float range, float intensity)
        {
            var go = new GameObject("Light");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            var l = go.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = color;
            l.range = range;
            l.intensity = intensity;
            l.shadows = LightShadows.None;
            return l;
        }

        // A flat sector (pie slice) mesh on the XZ plane, pointing along +Z.
        public static Mesh Sector(float radius, float angleDeg, int segments = 32, float innerRadius = 0f)
        {
            var m = new Mesh();
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            float half = angleDeg * 0.5f * Mathf.Deg2Rad;
            for (int i = 0; i <= segments; i++)
            {
                float a = -half + (2f * half) * i / segments;
                var dir = new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a));
                verts.Add(dir * innerRadius); uvs.Add(new Vector2(i / (float)segments, 0));
                verts.Add(dir * radius); uvs.Add(new Vector2(i / (float)segments, 1));
            }
            for (int i = 0; i < segments; i++)
            {
                int a = i * 2;
                tris.Add(a); tris.Add(a + 1); tris.Add(a + 3);
                tris.Add(a); tris.Add(a + 3); tris.Add(a + 2);
            }
            m.SetVertices(verts);
            m.SetUVs(0, uvs);
            m.SetTriangles(tris, 0);
            m.RecalculateBounds();
            return m;
        }

        public static GameObject MeshObject(string name, Mesh mesh, Material mat, Transform parent = null)
        {
            var go = new GameObject(name);
            if (parent != null) go.transform.SetParent(parent, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = go.AddComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            return go;
        }
    }
}
