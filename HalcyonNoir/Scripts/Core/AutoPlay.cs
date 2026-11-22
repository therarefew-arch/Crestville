using System.Collections;
using UnityEngine;

namespace HalcyonNoir
{
    // -hn-auto: a scripted player for smoke tests. It walks Vane to every person and place, plays every
    // conversation, collects the clues, makes the deduction (the right answers) and summons the Graven.
    // It logs "[Auto]" lines for the route, every line of dialogue, and anywhere it gets stuck.
    public partial class GameDirector
    {
        IEnumerator AutoPlay()
        {
            Debug.Log("[Auto] start");
            StartCoroutine(AutoTalk());
            StartCoroutine(AutoBrawl());
            // after Gil lies, heading back up the street to Ostrowski walks into the Trust ambush
            string[] route = { "mara", "ostrowski", "gouges", "gate", "gil", "gil", "ostrowski", "gouges" };
            foreach (var id in route)
            {
                while (phase != Phase.Explore || busy) yield return null;
                yield return new WaitForSecondsRealtime(0.8f);
                var it = Find(id);
                if (it == null || !it.Enabled) { Debug.Log($"[Auto] {id}: missing or disabled"); continue; }
                Debug.Log($"[Auto] walking to {id} at {it.transform.position} from {player.transform.position}");
                yield return AutoWalk(it);
                In.BotMove = Vector2.zero;
                yield return new WaitForSecondsRealtime(0.3f);
                Debug.Log($"[Auto] at {id}: prompt='{ui.Prompt}' clues={ClueCount} canDeduce={CanDeduce}");
                In.BotPressFrame = Time.frameCount + 1;
                yield return null; yield return null;
                if (!busy) Debug.LogWarning($"[Auto] {id}: interact did nothing");
            }
            // summon: hold G once the hint appears
            while (string.IsNullOrEmpty(ui.HintLine) && phase != Phase.Fight) yield return null;
            Debug.Log("[Auto] summoning");
            In.BotSummon = true;
            while (phase != Phase.Fight) yield return null;
            In.BotSummon = false;
            Debug.Log($"[Auto] fight started, outcome={outcome}");
        }

        IEnumerator AutoWalk(Interactable it)
        {
            float lastProgress = Time.time, best = float.MaxValue;
            while (true)
            {
                // a cutscene or the brawl interrupts the walk; AutoBrawl drives during the fight
                if (phase != Phase.Explore || busy)
                {
                    if (phase != Phase.Brawl) In.BotMove = Vector2.zero;
                    lastProgress = Time.time;
                    yield return null;
                    continue;
                }
                var d = it.transform.position - player.transform.position; d.y = 0;
                float dist = d.magnitude;
                if (dist < it.Radius * 0.6f) yield break;
                // the pier is fenced: leave it by its landward end before heading anywhere else
                var pp = player.transform.position;
                bool onPier = pp.x > 40.3f && Mathf.Abs(pp.z) < 3f, targetOnPier = it.transform.position.x > 40.3f;
                if (onPier && !targetOnPier) { d = new Vector3(37.5f, 0, 0) - pp; d.y = 0; }
                if (dist < best - 0.2f) { best = dist; lastProgress = Time.time; }
                if (Time.time - lastProgress > 3f)
                {
                    Debug.LogWarning($"[Auto] STUCK going to {it.Id}: at {player.transform.position}, {dist:0.0} away. Teleporting.");
                    var cc = player.Cc; cc.enabled = false;
                    player.transform.position = it.transform.position - d.normalized * (it.Radius * 0.4f);
                    cc.enabled = true;
                    yield break;
                }
                // convert the world direction into camera-relative stick input
                var local = Quaternion.Euler(0, -orbit.Yaw, 0) * d.normalized;
                In.BotMove = new Vector2(local.x, local.z);
                In.BotRun = dist > 4;
                yield return null;
            }
        }

        // In the street brawl: close on the nearest man and keep jabbing. Logs the result.
        IEnumerator AutoBrawl()
        {
            while (true)
            {
                while (phase != Phase.Brawl || busy) yield return null;
                Debug.Log("[Auto] brawl started");
                float nextJab = 0;
                while (phase == Phase.Brawl && !busy)
                {
                    Thug target = null; float bd = 99;
                    foreach (var t in Brawl.All)
                        if (t != null && !t.IsDown) { float dd = Vector3.Distance(t.transform.position, player.transform.position); if (dd < bd) { bd = dd; target = t; } }
                    if (target != null)
                    {
                        var d = target.transform.position - player.transform.position; d.y = 0;
                        var local = Quaternion.Euler(0, -orbit.Yaw, 0) * d.normalized;
                        In.BotMove = bd > 1.4f ? new Vector2(local.x, local.z) : Vector2.zero;
                        if (bd < 1.8f && Time.time > nextJab) { In.BotJabFrame = Time.frameCount + 1; nextJab = Time.time + 0.38f; }
                    }
                    yield return null;
                }
                In.BotMove = Vector2.zero;
                Debug.Log($"[Auto] brawl over: vaneHp={player.Hp:0} down={player.Down} trustCard={trustCard}");
                yield return null;
            }
        }

        // Advances dialogue and picks choices while the route runs.
        IEnumerator AutoTalk()
        {
            while (true)
            {
                if (ui.Line != null && !ui.Typing && !Game.Paused)
                {
                    yield return new WaitForSecondsRealtime(0.9f);
                    if (ui.Choices != null && ui.Choices.Count > 0)
                    {
                        int pick = PickChoice(ui.Line, ui.Choices);
                        Debug.Log($"[Auto]   -> chose {pick}: {ui.Choices[pick - 1]}");
                        In.BotNumber = pick;
                    }
                    else In.BotNumber = 0;
                    In.BotPressFrame = Time.frameCount + 1;
                    yield return null; yield return null;
                    continue;
                }
                yield return null;
            }
        }

        static int PickChoice(string prompt, System.Collections.Generic.List<string> opts)
        {
            if (prompt.StartsWith("Where did Teodor go")) return 3;
            if (prompt.StartsWith("What was the light")) return 2;
            if (prompt.StartsWith("It isn't over")) return 1;
            for (int i = 0; i < opts.Count; i++)
                if (opts[i].Contains("marks") || opts[i].Contains("tide gate")) return i + 1;
            if (prompt.StartsWith("What else do you want")) return opts.Count; // don't loop on "press"
            return 1;
        }
    }
}
