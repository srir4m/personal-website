import { useStage } from "../stage/store";

/** "Motion: Full / Calm" switch, defaulting to the OS reduced-motion setting (PRD §3.1). */
export function MotionToggle() {
  const motion = useStage((s) => s.motion);
  const setMotion = useStage((s) => s.setMotion);
  const calm = motion === "calm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={calm}
      aria-label="Calm motion"
      onClick={() => setMotion(calm ? "full" : "calm")}
      className="motion-toggle fixed z-30"
    >
      <span className="motion-toggle__name">Motion</span>
      <span data-on={!calm}>Full</span>
      <span aria-hidden="true">/</span>
      <span data-on={calm}>Calm</span>
    </button>
  );
}
