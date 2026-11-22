using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace HalcyonNoir.EditorTools
{
    // Menu: Halcyon Noir > Create & Open Slice Scene
    // Makes an empty scene called "HalcyonNoir", saves it, adds it to Build Settings and opens it.
    // The game builds the whole world from code when you press Play.
    public static class SetupMenu
    {
        const string Folder = "Assets/Scenes";
        const string Path = Folder + "/HalcyonNoir.unity";

        [MenuItem("Halcyon Noir/Create & Open Slice Scene", priority = 0)]
        public static void CreateScene()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            if (!AssetDatabase.IsValidFolder(Folder)) AssetDatabase.CreateFolder("Assets", "Scenes");

            Scene scene;
            if (System.IO.File.Exists(Path)) scene = EditorSceneManager.OpenScene(Path, OpenSceneMode.Single);
            else
            {
                scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                var camGo = new GameObject("Main Camera");
                camGo.tag = "MainCamera";
                camGo.AddComponent<Camera>();
                camGo.AddComponent<AudioListener>();
                new GameObject("Boot").AddComponent<BootMarker>();
                EditorSceneManager.SaveScene(scene, Path);
            }

            var list = EditorBuildSettings.scenes.ToList();
            list.RemoveAll(s => s.path == Path);
            list.Insert(0, new EditorBuildSettingsScene(Path, true));
            EditorBuildSettings.scenes = list.ToArray();

            Debug.Log("Halcyon Noir: scene ready. Press Play.");
        }

        [MenuItem("Halcyon Noir/Play", priority = 1)]
        public static void Play()
        {
            if (SceneManager.GetActiveScene().path != Path) CreateScene();
            EditorApplication.isPlaying = true;
        }
    }
}
