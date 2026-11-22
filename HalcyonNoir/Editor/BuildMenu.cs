using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace HalcyonNoir.EditorTools
{
    // Menu: Halcyon Noir > Build Windows Player
    // Also callable from the command line:
    //   Unity.exe -batchmode -quit -projectPath <proj> -executeMethod HalcyonNoir.EditorTools.BuildMenu.BuildWindows
    public static class BuildMenu
    {
        [MenuItem("Halcyon Noir/Build Windows Player", priority = 20)]
        public static void BuildWindows()
        {
            SetupMenu.CreateScene();
            var opts = new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/HalcyonNoir.unity" },
                locationPathName = "Builds/Windows/HalcyonNoir.exe",
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None,
            };
            var report = BuildPipeline.BuildPlayer(opts);
            Debug.Log("Halcyon Noir build: " + report.summary.result + " -> " + opts.locationPathName);
            if (Application.isBatchMode && report.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
        }
    }
}
