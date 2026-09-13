/** Material profile identity, distinct from the physical build/specimen ID.
 * Exact canonical content avoids timestamps and hash collisions when reselecting
 * the same alloy. No composition rounding or unit conversion is performed.
 */
export function materialProfileIdentity(name: string, base: string, composition: Record<string, number>): string {
  return `material-profile:${JSON.stringify([name.trim().toLowerCase(), base, Object.entries(composition).sort(([a], [b]) => a.localeCompare(b, 'en'))])}`;
}
