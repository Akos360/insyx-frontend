// Fixed mapping so the same field always gets the same --c1..--c5 token,
// consistent across pages (Search, Graph, Paper) — matches the 5 distinct
// field values this dataset seeds.
const FIELD_COLORS: Record<string, string> = {
  Genomics: "var(--c1)",
  "Machine Learning": "var(--c2)",
  "Quantum Computing": "var(--c3)",
  Robotics: "var(--c4)",
  Epidemiology: "var(--c5)",
};

export function fieldColorVar(field: string | null | undefined): string {
  if (!field) return "var(--c5)";
  return FIELD_COLORS[field] ?? "var(--c5)";
}
