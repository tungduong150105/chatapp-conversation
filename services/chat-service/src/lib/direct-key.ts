/** Stable key for a 1:1 direct message thread (sorted participant ids). */
export function buildDirectKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join('|');
}
