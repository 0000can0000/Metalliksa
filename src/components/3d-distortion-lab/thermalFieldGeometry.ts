/** Scientific display helpers. No flow, free surface or fitted melt geometry. */
export function thermalColour(t: number, minimum: number, solidus: number, liquidus: number, maximum: number): string {
  const stops = [[minimum, 24, 43, 70], [solidus, 64, 151, 210], [liquidus, 245, 158, 11], [Math.max(maximum, liquidus + 1), 255, 237, 190]];
  const hi = stops.findIndex(s => s[0] >= t);
  if (hi === 0) return "rgb(24,43,70)";
  if (hi < 0) return "rgb(255,237,190)";
  const a = stops[hi - 1], b = stops[hi], f = (t - a[0]) / Math.max(1e-12, b[0] - a[0]);
  return `rgb(${a.slice(1).map((v, i) => Math.round(v + f * (b[i + 1] - v))).join(",")})`;
}

/** Marching triangles of the nearest cell-center section, all cells included.
 * Linear interpolation is an isotherm reconstruction, not a resolved interface.
 * Fixed diagonal avoids saddle ambiguity. Coordinates are returned in µm.
 */
export function liquidusSection(coordinates: Float32Array, values: Float32Array, normal: 0 | 1 | 2, plane: number, spacing: number, surface: number, liquidus: number): number[] {
  const axes = ([0, 1, 2] as const).filter(a => a !== normal);
  const cells = new Map<string, number>();
  const selected: number[] = [];
  let minA = Infinity, minB = Infinity;
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(coordinates[i * 3 + normal] - plane) > spacing * .1 || coordinates[i * 3 + 2] >= surface) continue;
    selected.push(i); minA = Math.min(minA, coordinates[i * 3 + axes[0]]); minB = Math.min(minB, coordinates[i * 3 + axes[1]]);
  }
  const grid = (i: number) => [Math.round((coordinates[i * 3 + axes[0]] - minA) / spacing), Math.round((coordinates[i * 3 + axes[1]] - minB) / spacing)];
  for (const i of selected) cells.set(grid(i).join(","), i);
  const output: number[] = [];
  for (const i of selected) {
    const [a, b] = grid(i), right = cells.get(`${a + 1},${b}`), up = cells.get(`${a},${b + 1}`), diagonal = cells.get(`${a + 1},${b + 1}`);
    if (right === undefined || up === undefined || diagonal === undefined) continue;
    for (const tri of [[i, right, diagonal], [i, diagonal, up]]) {
      const crossings: number[][] = [];
      for (let edge = 0; edge < 3; edge++) {
        const u = tri[edge], v = tri[(edge + 1) % 3];
        if ((values[u] >= liquidus) === (values[v] >= liquidus)) continue;
        const fraction = (liquidus - values[u]) / (values[v] - values[u]);
        crossings.push([0, 1, 2].map(axis => (coordinates[u * 3 + axis] + fraction * (coordinates[v * 3 + axis] - coordinates[u * 3 + axis])) * 1e6));
      }
      if (crossings.length === 2) output.push(...crossings[0], ...crossings[1]);
    }
  }
  return output;
}
