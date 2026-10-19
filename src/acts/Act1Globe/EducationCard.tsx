import { forwardRef, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { content } from "../../content";
import type { Course } from "../../content/schema";
import { text } from "../../content/text";
import { formatCoordinates } from "./geo";

const { school, degree, classOf, location, courses } = content.education;

/** Courses grouped by term, newest term first (PRD Act 1). */
export function groupByTerm(list: Course[]): { term: string; courses: Course[] }[] {
  const terms = new Map<number, { term: string; courses: Course[] }>();
  for (const course of list) {
    const group = terms.get(course.termOrder) ?? { term: course.term, courses: [] };
    group.courses.push(course);
    terms.set(course.termOrder, group);
  }
  return [...terms.entries()].sort(([a], [b]) => b - a).map(([, group]) => group);
}

const TERMS = groupByTerm(courses);

/** The HUD card tied to the Stevens marker: collapsed summary, expandable course log. */
export const EducationCard = forwardRef<HTMLDivElement>(function EducationCard(_, ref) {
  const [open, setOpen] = useState(false);
  const logId = useId();
  const degreeText = text(degree);
  const classText = text(classOf);

  return (
    <div
      ref={ref}
      className="edu-card hud-panel"
      onClick={(event) => {
        // A click anywhere on the collapsed card opens the log; the button handles its own clicks.
        if (!open && !(event.target as HTMLElement).closest("button")) setOpen(true);
      }}
    >
      <p className="hud-label">Education · {location.label}</p>
      <h3 className="font-display text-3xl leading-tight">{school}</h3>
      {(degreeText || classText) && (
        <p className="font-display text-lg">
          {degreeText}
          {degreeText && classText && " · "}
          {classText && `Class of ${classText}`}
        </p>
      )}
      <p className="hud-readout" aria-label={`Coordinates ${formatCoordinates(location.lat, location.lng)}`}>
        {formatCoordinates(location.lat, location.lng)}
      </p>
      <button
        type="button"
        className="hud-button"
        aria-expanded={open}
        aria-controls={logId}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> Course log
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={logId}
            key="log"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            className="overflow-hidden"
          >
            <div className="course-log" data-lenis-prevent>
              {TERMS.map((group) => (
                <section key={group.term} aria-label={group.term}>
                  <h4 className="hud-label mt-3 mb-1">{group.term}</h4>
                  <ul>
                    {group.courses.map((course) => {
                      const title = text(course.title);
                      return (
                        <li key={course.code} className="course-row">
                          <span className="course-code">{course.code}</span>
                          {title && <span className="course-title">{title}</span>}
                          {course.status === "in-progress" && <span className="hud-tag">In progress</span>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
