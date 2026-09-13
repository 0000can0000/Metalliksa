/** Normalize recognized alloy names only. Base-metal family is never a substitute alloy. */
export function canonicalLpbfMaterialName(name: string): string {
  if (/\b(?:inconel\s*718|in718)\b/i.test(name)) return "Inconel 718";
  if (/\b(?:ti[-\s]?6al[-\s]?4v|ti64)\b/i.test(name)) return "Ti-6Al-4V";
  if (/\b316l\b/i.test(name)) return "316L Stainless Steel";
  if (/\balsi10mg\b/i.test(name)) return "AlSi10Mg";
  return name;
}

export function isSupportedSlicerMaterial(name: string): boolean {
  return ["Inconel 718","Ti-6Al-4V","316L Stainless Steel","AlSi10Mg","CoCrMo","Scalmalloy"].includes(canonicalLpbfMaterialName(name));
}
