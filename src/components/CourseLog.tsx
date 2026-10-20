import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { content } from "../content";
import type { Course } from "../content/schema";
import { DURATION, EASE_BEZIER } from "../stage/motion";
import { text } from "../content/text";

/** Courses grouped by term, newest term first. */
export function groupByTerm(list: Course[]): { term: string; courses: Course[] }[] {
  const terms = new Map<number, { term: string; courses: Course[] }>();
  for (const course of list) {
    const group = terms.get(course.termOrder) ?? { term: course.term, courses: [] };
    group.courses.push(course);
    terms.set(course.termOrder, group);
  }
  return [...terms.entries()].sort(([a], [b]) => b - a).map(([, group]) => group);
}

const TERMS = groupByTerm(content.education.courses);

/**
 * The course log, a HUD inset in the Backbone panel (PRD v1.1, decision Q1: education
 * lives in the body map). Collapsed by default; in-progress courses carry an amber tag.
 */
export function CourseLog() {
  const [open, setOpen] = useState(false);
  const logId = useId();
  return (
    <section className="hud-panel course-log-panel" aria-label="Course log">
      <p className="hud-label">{content.education.school}</p>
      <button type="button" className="hud-button" aria-expanded={open} aria-controls={logId} onClick={() => setOpen((v) => !v)}>
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
            transition={{ duration: DURATION.base, ease: EASE_BEZIER }}
            className="overflow-hidden"
          >
            <div className="course-log">
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
    </section>
  );
}
