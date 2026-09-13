/** UI families only; these labels do not certify a composition or a material grade. */
export const MATERIAL_CATEGORIES = {
  Ni: "Nickel Superalloy",
  Fe: "Steels & Irons",
  Ti: "Titanium Alloy",
  Al: "Aluminum Alloys",
  Cu: "Copper Alloys",
  Co: "Cobalt / Bio",
  Mg: "Magnesium Alloys",
  Refractory: "Refractory / CMC",
  Other: "Other / Unspecified",
} as const;

export function materialCategoryForBase(baseMetal: string): string {
  return MATERIAL_CATEGORIES[baseMetal as keyof typeof MATERIAL_CATEGORIES] ?? MATERIAL_CATEGORIES.Other;
}

/** Normalize old generated labels, retaining source-provided or user-defined categories. */
export function normalizeMaterialCategory(category: string | undefined, baseMetal: string): string {
  return !category?.trim() || category === `${baseMetal}-Base Alloy`
    ? materialCategoryForBase(baseMetal)
    : category;
}
