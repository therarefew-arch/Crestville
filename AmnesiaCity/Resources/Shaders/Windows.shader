// Building facades: a tiled window pattern, some lit warm, some dark.
Shader "AmnesiaCity/Windows"
{
    Properties
    {
        _MainTex ("Window Pattern", 2D) = "black" {}
        _Tiling ("Tiling", Vector) = (1,1,0,0)
        _WallColor ("Wall", Color) = (0.12,0.11,0.16,1)
        _LitColor ("Lit Window", Color) = (1.0,0.72,0.38,1)
        _DarkColor ("Dark Window", Color) = (0.05,0.06,0.10,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "Windows"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);
            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _Tiling;
                float4 _WallColor;
                float4 _LitColor;
                float4 _DarkColor;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float fogFactor : TEXCOORD1; };
            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv * _Tiling.xy + _Tiling.zw;
                o.fogFactor = ComputeFogFactor(o.positionCS.z);
                return o;
            }
            half4 frag (Varyings i) : SV_Target
            {
                // r = is a window, g = is lit
                float4 t = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv);
                float3 win = lerp(_DarkColor.rgb, _LitColor.rgb, t.g);
                float3 c = lerp(_WallColor.rgb, win, t.r);
                return half4(MixFog(c, i.fogFactor), 1);
            }
            ENDHLSL
        }
    }
}
