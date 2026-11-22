// Flat color with fog. Used for water, sky shapes and backgrounds.
Shader "AmnesiaCity/Unlit"
{
    Properties
    {
        _BaseColor ("Color", Color) = (1,1,1,1)
        _EmissionColor ("Emission", Color) = (0,0,0,0)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "Unlit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float4 _EmissionColor;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings { float4 positionCS : SV_POSITION; float fogFactor : TEXCOORD0; };
            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.fogFactor = ComputeFogFactor(o.positionCS.z);
                return o;
            }
            half4 frag (Varyings i) : SV_Target
            {
                return half4(MixFog(_BaseColor.rgb + _EmissionColor.rgb, i.fogFactor), 1);
            }
            ENDHLSL
        }
    }
}
