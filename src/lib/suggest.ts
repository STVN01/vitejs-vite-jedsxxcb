import type { RubricKey } from './score.ts';

// True when the text contains this word, ignoring capital letters.
function has(text: string, word: string): boolean {
  return text.toLowerCase().includes(word);
}

// Stand-in for the model. Text in, four sub-scores out.
// The real call will return the same four names from a server.
export function suggestScores(
  cv: string,
  job: string
): Record<RubricKey, number> {
  const skills = ['python', 'sql', 'excel', 'spreadsheet'];
  const skillHits = skills.filter(
    (word) => has(cv, word) && has(job, word)
  ).length;

  const jobWords = job
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4);
  const overlap = jobWords.filter((word) => has(cv, word)).length;

  const studied = ['degree', 'university', 'bsc', 'msc', 'bachelor'].some(
    (word) => has(cv, word)
  );

  return {
    technical_skills: Math.round((skillHits / skills.length) * 10),
    experience_relevance:
      jobWords.length === 0
        ? 0
        : Math.min(10, Math.round((overlap / jobWords.length) * 10)),
    education_fit: studied ? 8 : 3,
    evidence_quality: /\d/.test(cv) ? 7 : 2,
  };
}
