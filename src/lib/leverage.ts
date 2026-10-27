import { WEIGHTS, type RubricKey } from './score';

const RUBRIC_KEYS = Object.keys(WEIGHTS) as RubricKey[];

// Points still available if this sub-score were raised to 10.
// Experience at 6 leaves 4 x 0.3 x 10 = 12 points.
export function pointsLeft(score: number, key: RubricKey): number {
  const gap = Math.max(0, 10 - score);
  return gap * WEIGHTS[key] * 10;
}

// The key with the most points left. On a tie, the earlier key wins.
export function bestLever(rubric: Record<RubricKey, number>): RubricKey {
  return RUBRIC_KEYS.reduce((best, key) => {
    return pointsLeft(rubric[key], key) > pointsLeft(rubric[best], key)
      ? key
      : best;
  });
}

// A list of roles. The [] means "more than one rubric."
// For each role, add the points left on this key.
export function pointsLeftAcross(
  roles: Record<RubricKey, number>[],
  key: RubricKey
): number {
  return roles.reduce((total, role) => total + pointsLeft(role[key], key), 0);
}

// Same choice as bestLever, but the points are added across every role first.
export function bestLeverAcross(roles: Record<RubricKey, number>[]): RubricKey {
  const keys = Object.keys(WEIGHTS) as RubricKey[];
  return keys.reduce((best, key) => {
    return pointsLeftAcross(roles, key) > pointsLeftAcross(roles, best)
      ? key
      : best;
  });
}
