type Props = { children: string; className?: string };

/**
 * Leonardo's mirror script (PRD §5.3). The flipped glyphs are decorative; screen readers
 * get the plain text. The text flips readable when an ancestor `.mirror-host` is hovered
 * or focused.
 */
export function MirrorText({ children, className = "" }: Props) {
  return (
    <span className={className}>
      <span aria-hidden="true" className="mirror-text inline-block">
        {children}
      </span>
      <span className="sr-only">{children}</span>
    </span>
  );
}
