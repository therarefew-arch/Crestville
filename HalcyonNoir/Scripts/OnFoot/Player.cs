using UnityEngine;

namespace HalcyonNoir
{
    // Elias Vane on foot: walks relative to the camera, runs with Shift.
    public class PlayerMotor : MonoBehaviour
    {
        public Figure Figure;
        public CharacterController Cc;
        public OrbitCamera Cam;
        public bool CanMove = true;
        float vy, stepTimer;
        const float WalkSpeed = 2.4f, RunSpeed = 5f;

        public static PlayerMotor Make(Transform parent, Vector3 pos, float yaw)
        {
            var f = Figure.Make(parent, pos, yaw, new Figure.Look {
                coat = new Color(0.13f, 0.13f, 0.17f), shirt = new Color(0.85f, 0.83f, 0.78f), skin = new Color(0.8f, 0.64f, 0.53f),
                hair = new Color(0.1f, 0.08f, 0.07f), trousers = new Color(0.11f, 0.11f, 0.14f), hat = new Color(0.09f, 0.09f, 0.11f),
                hasHat = true, longCoat = true, height = 1.02f }, "Vane");
            var p = f.gameObject.AddComponent<PlayerMotor>();
            p.Figure = f;
            p.Cc = f.gameObject.AddComponent<CharacterController>();
            p.Cc.height = 1.8f;
            p.Cc.radius = 0.3f;
            p.Cc.center = new Vector3(0, 0.92f, 0);
            p.Cc.stepOffset = 0.35f;
            return p;
        }

        void Update()
        {
            if (Time.deltaTime <= 0) return;
            Vector2 input = CanMove ? In.Move : Vector2.zero;
            var camYaw = Cam != null ? Cam.Yaw : 0f;
            var fwd = Quaternion.Euler(0, camYaw, 0) * Vector3.forward;
            var right = Quaternion.Euler(0, camYaw, 0) * Vector3.right;
            var dir = fwd * input.y + right * input.x;
            bool run = In.Run && CanMove;
            float speed = (run ? RunSpeed : WalkSpeed) * dir.magnitude;
            if (dir.sqrMagnitude > 0.01f)
            {
                var target = Quaternion.LookRotation(dir.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, target, Time.deltaTime * 10f);
            }
            vy = Cc.isGrounded ? -1f : vy - 20f * Time.deltaTime;
            Cc.Move((dir.normalized * speed + Vector3.up * vy) * Time.deltaTime);
            Figure.Speed01 = speed < 0.1f ? 0 : speed / RunSpeed;
            if (speed > 0.1f)
            {
                stepTimer -= Time.deltaTime * (run ? 1.7f : 1f);
                if (stepTimer <= 0) { stepTimer = 0.45f; Sound.I?.Play("step", run ? 0.35f : 0.22f, Random.Range(0.9f, 1.1f)); }
            }
        }

        public void FaceTowards(Vector3 p)
        {
            var d = p - transform.position; d.y = 0;
            if (d.sqrMagnitude > 0.01f) transform.rotation = Quaternion.LookRotation(d);
        }
    }

    // Third-person camera that orbits with the mouse and stays out of walls.
    public class OrbitCamera : MonoBehaviour
    {
        public Transform Target;
        public float Yaw, Pitch = 12f, Distance = 4.2f;
        public Vector3 Offset = new Vector3(0, 1.65f, 0);
        public bool Control = true;
        // Optional fixed cinematic shot (set by cutscenes)
        public bool Cinematic;
        public Vector3 CinePos, CineLook;
        float curDist;

        void LateUpdate()
        {
            if (Cinematic)
            {
                transform.position = Vector3.Lerp(transform.position, CinePos, 1 - Mathf.Exp(-Time.unscaledDeltaTime * 2.5f));
                var look = Quaternion.LookRotation(CineLook - transform.position);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, 1 - Mathf.Exp(-Time.unscaledDeltaTime * 3f));
                transform.position += Fx.I != null ? transform.rotation * Fx.I.ShakeOffset : Vector3.zero;
                return;
            }
            if (Target == null) return;
            if (Control)
            {
                var l = In.Look;
                Yaw += l.x * 2.2f;
                Pitch = Mathf.Clamp(Pitch - l.y * 2.2f, -10f, 55f);
            }
            var rot = Quaternion.Euler(Pitch, Yaw, 0);
            var pivot = Target.position + Offset;
            float want = Distance;
            if (Physics.SphereCast(pivot, 0.25f, rot * Vector3.back, out var hit, Distance, ~0, QueryTriggerInteraction.Ignore))
                want = Mathf.Max(0.6f, hit.distance - 0.1f);
            curDist = Mathf.Lerp(curDist <= 0 ? want : curDist, want, 1 - Mathf.Exp(-Time.unscaledDeltaTime * (want < curDist ? 30f : 6f)));
            transform.rotation = rot;
            transform.position = pivot + rot * new Vector3(0.45f, 0, -curDist);
            if (Fx.I != null) transform.position += rot * Fx.I.ShakeOffset;
        }
    }
}
