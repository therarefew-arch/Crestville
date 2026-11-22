// Additive glow for lights, neon, telegraph warnings and particles. Uses vertex color.
Shader "HalcyonNoir/Glow"
{
    Properties
    {
        _BaseColor ("Color", Color) = (1,1,1,1)
        _Intensity ("Intensity", Float) = 1
        _SoftEdge ("Soft Round Edge (0 or 1)", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" "RenderPipeline"="UniversalPipeline" "IgnoreProjector"="True" }
        Blend One One
        ZWrite Off
        Cull Off
        Pass
        {
            Name "Glow"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float _Intensity;
                float _SoftEdge;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float4 color : COLOR; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float4 color : COLOR; float2 uv : TEXCOORD0; };
            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.color = v.color;
                o.uv = v.uv;
                return o;
            }
            half4 frag (Varyings i) : SV_Target
            {
                float4 c = _BaseColor * i.color * _Intensity;
                if (_SoftEdge > 0.5)
                {
                    float d = length(i.uv - 0.5) * 2.0;
                    c *= saturate(1.0 - d) * saturate(1.0 - d);
                }
                return half4(c.rgb * c.a, 0);
            }
            ENDHLSL
        }
    }
}
