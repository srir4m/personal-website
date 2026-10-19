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
      className="hud-chip fixed top-3 right-3 z-30 font-mono text-xs tracking-widest uppercase"
    >
      Motion: <span className={calm ? "opacity-60" : "text-hud-cyan"}>Full</span> /{" "}
      <span className={calm ? "text-hud-cyan" : "opacity-60"}>Calm</span>
    </button>
  );
}
