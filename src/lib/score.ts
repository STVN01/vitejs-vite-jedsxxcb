// A rubric key is one of the four things we score.
// The "|" means "only these four strings are legal."
export type RubricKey =
  | 'technical_skills'
  | 'experience_relevance'
  | 'education_fit'
  | 'evidence_quality';

// Weights must add up to 1. They are the product, not a guess the model makes.
// Record<RubricKey, number> means: every key above, and each value is a number.
export const WEIGHTS: Record<RubricKey, number> = {
  technical_skills: 0.4,
  experience_relevance: 0.3,
  education_fit: 0.15,
  evidence_quality: 0.15,
};

const RUBRIC_KEYS = Object.keys(WEIGHTS) as RubricKey[];

// The model will later give each key a score out of 10.
// This function turns those four numbers into the score out of 100.
// ": number" means "this function promises to return a number."
export function matchFromRubric(rubric: Record<RubricKey, number>): number {
  const sum = RUBRIC_KEYS.reduce((total, key) => {
    return total + rubric[key] * WEIGHTS[key];
  }, 0);
  return Math.round(sum * 10);
}
