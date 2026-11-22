using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace HalcyonNoir
{
    // One place for every control. Works with Unity's new Input System (default in Unity 6)
    // or the old Input Manager, and with a gamepad.
    public static class In
    {
        public static float LookSensitivity = 1f;

        // A scripted player (the -hn-auto smoke test) can drive the on-foot controls through these.
        public static Vector2 BotMove;
        public static bool BotRun, BotSummon;
        public static int BotNumber, BotPressFrame = -1;
        static bool BotPress => Time.frameCount == BotPressFrame;
        public static Vector2 Move => BotMove.sqrMagnitude > 0 ? BotMove : RawMove;
        public static bool Run => BotRun || RawRun;
        public static bool Interact => BotPress || RawInteract;
        public static bool Confirm => BotPress || RawConfirm;
        public static int NumberPressed => BotPress && BotNumber > 0 ? BotNumber : RawNumberPressed;
        public static bool SummonHeld => BotSummon || RawSummonHeld;
        public static int BotJabFrame = -1;
        public static bool Jab => Time.frameCount == BotJabFrame || RawJab;
        public static int BotSmokeFrame = -1;
        public static bool Smoke => Time.frameCount == BotSmokeFrame || RawSmoke;

#if ENABLE_INPUT_SYSTEM
        static Keyboard K => Keyboard.current;
        static Mouse M => Mouse.current;
        static Gamepad G => Gamepad.current;
        static bool Key(System.Func<Keyboard, bool> f) => K != null && f(K);
        static bool Pad(System.Func<Gamepad, bool> f) => G != null && f(G);
        static bool Btn(System.Func<Mouse, bool> f) => M != null && f(M);

        static Vector2 RawMove
        {
            get
            {
                Vector2 v = Vector2.zero;
                if (K != null)
                {
                    if (K.wKey.isPressed || K.upArrowKey.isPressed) v.y += 1;
                    if (K.sKey.isPressed || K.downArrowKey.isPressed) v.y -= 1;
                    if (K.dKey.isPressed || K.rightArrowKey.isPressed) v.x += 1;
                    if (K.aKey.isPressed || K.leftArrowKey.isPressed) v.x -= 1;
                }
                if (G != null) v += G.leftStick.ReadValue();
                return Vector2.ClampMagnitude(v, 1f);
            }
        }
        public static Vector2 Look
        {
            get
            {
                Vector2 v = Vector2.zero;
                if (M != null) v += M.delta.ReadValue() * 0.1f;
                if (G != null) v += G.rightStick.ReadValue() * 6f * Time.unscaledDeltaTime * 60f * 0.25f;
                return v * LookSensitivity;
            }
        }
        static bool RawRun => Key(k => k.leftShiftKey.isPressed) || Pad(g => g.leftStickButton.isPressed);
        static bool RawInteract => Key(k => k.eKey.wasPressedThisFrame) || Pad(g => g.buttonSouth.wasPressedThisFrame);
        static bool RawConfirm => Key(k => k.spaceKey.wasPressedThisFrame || k.enterKey.wasPressedThisFrame || k.eKey.wasPressedThisFrame)
                                      || Btn(m => m.leftButton.wasPressedThisFrame) || Pad(g => g.buttonSouth.wasPressedThisFrame);
        public static bool Pause => Key(k => k.escapeKey.wasPressedThisFrame) || Pad(g => g.startButton.wasPressedThisFrame);
        public static bool Notebook => Key(k => k.tabKey.wasPressedThisFrame) || Pad(g => g.selectButton.wasPressedThisFrame);
        public static bool AnyKey => Key(k => k.anyKey.wasPressedThisFrame) || Btn(m => m.leftButton.wasPressedThisFrame)
                                     || Pad(g => g.buttonSouth.wasPressedThisFrame || g.startButton.wasPressedThisFrame);
        static int RawNumberPressed
        {
            get
            {
                if (K == null) return 0;
                if (K.digit1Key.wasPressedThisFrame) return 1;
                if (K.digit2Key.wasPressedThisFrame) return 2;
                if (K.digit3Key.wasPressedThisFrame) return 3;
                if (K.digit4Key.wasPressedThisFrame) return 4;
                return 0;
            }
        }

        // Giant robot controls
        static bool RawJab => Btn(m => m.leftButton.wasPressedThisFrame) || Pad(g => g.buttonWest.wasPressedThisFrame);
        public static bool Heavy => Btn(m => m.rightButton.wasPressedThisFrame) || Pad(g => g.buttonNorth.wasPressedThisFrame);
        public static bool GuardHeld => Key(k => k.leftShiftKey.isPressed) || Pad(g => g.rightShoulder.isPressed);
        public static bool GuardPressed => Key(k => k.leftShiftKey.wasPressedThisFrame) || Pad(g => g.rightShoulder.wasPressedThisFrame);
        public static bool Dodge => Key(k => k.spaceKey.wasPressedThisFrame) || Pad(g => g.buttonSouth.wasPressedThisFrame);
        public static bool ChargeHeld => Key(k => k.qKey.isPressed) || Pad(g => g.leftShoulder.isPressed);
        public static bool Vent => Key(k => k.eKey.wasPressedThisFrame) || Pad(g => g.buttonEast.wasPressedThisFrame);
        public static bool Finisher => Key(k => k.fKey.wasPressedThisFrame) || Pad(g => g.rightTrigger.wasPressedThisFrame);
        static bool RawSummonHeld => Key(k => k.gKey.isPressed) || Pad(g => g.buttonNorth.isPressed);
        static bool RawSmoke => Key(k => k.cKey.wasPressedThisFrame) || Pad(g => g.dpad.up.wasPressedThisFrame);
        public static bool ToggleShading => Key(k => k.f9Key.wasPressedThisFrame);
#else
        static Vector2 RawMove => Vector2.ClampMagnitude(new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical")), 1f);
        public static Vector2 Look => new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * LookSensitivity;
        static bool RawRun => Input.GetKey(KeyCode.LeftShift);
        static bool RawInteract => Input.GetKeyDown(KeyCode.E);
        static bool RawConfirm => Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.E) || Input.GetMouseButtonDown(0);
        public static bool Pause => Input.GetKeyDown(KeyCode.Escape);
        public static bool Notebook => Input.GetKeyDown(KeyCode.Tab);
        public static bool AnyKey => Input.anyKeyDown;
        static int RawNumberPressed
        {
            get
            {
                if (Input.GetKeyDown(KeyCode.Alpha1)) return 1;
                if (Input.GetKeyDown(KeyCode.Alpha2)) return 2;
                if (Input.GetKeyDown(KeyCode.Alpha3)) return 3;
                if (Input.GetKeyDown(KeyCode.Alpha4)) return 4;
                return 0;
            }
        }
        static bool RawJab => Input.GetMouseButtonDown(0);
        public static bool Heavy => Input.GetMouseButtonDown(1);
        public static bool GuardHeld => Input.GetKey(KeyCode.LeftShift);
        public static bool GuardPressed => Input.GetKeyDown(KeyCode.LeftShift);
        public static bool Dodge => Input.GetKeyDown(KeyCode.Space);
        public static bool ChargeHeld => Input.GetKey(KeyCode.Q);
        public static bool Vent => Input.GetKeyDown(KeyCode.E);
        public static bool Finisher => Input.GetKeyDown(KeyCode.F);
        static bool RawSummonHeld => Input.GetKey(KeyCode.G);
        static bool RawSmoke => Input.GetKeyDown(KeyCode.C);
        public static bool ToggleShading => Input.GetKeyDown(KeyCode.F9);
#endif
    }
}
