import type { Framework } from "./types";
import { KOREAN_FRAMEWORKS } from "./korean";

export type { Framework, FrameworkLevel, FrameworkGroup } from "./types";

/**
 * Which frameworks each language has, if any.
 *
 * Finding a graded list for a language is a sourcing problem, not an
 * engineering one — a language stays absent from here until someone tracks
 * down a list worth trusting, and the app just doesn't offer the view until
 * then. Japanese would be JLPT N5–N1, Chinese HSK 1–9, Spanish DELE.
 */
const BY_LANGUAGE: Record<string, Framework[]> = {
  ko: KOREAN_FRAMEWORKS,
};

export function frameworksFor(language: string): Framework[] {
  return BY_LANGUAGE[language] ?? [];
}
