// Assembles stored field values + coords into the SECTIONS-shaped detail
// response the frontend expects. Shared by the detail and edit routes.
import { SECTIONS, SECTION_BY_ID } from "./sections";

export const SOURCES = ["AI", "YANG", "WANG"] as const;
export type SourceKey = (typeof SOURCES)[number];

// fieldPath -> source -> value
export type ValueMap = Map<string, Partial<Record<SourceKey, unknown>>>;
// fieldPath -> coords
export type CoordMap = Map<string, unknown>;

/** Derive the section id from a fieldPath rid. */
export function sectionOf(fieldPath: string): string {
  if (fieldPath.startsWith("cond.")) return "cond";
  if (fieldPath.startsWith("ev.")) return "evidence";
  return fieldPath.split(".")[0];
}

function sources(fieldPath: string, values: ValueMap) {
  const v = values.get(fieldPath) ?? {};
  return Object.fromEntries(SOURCES.map((s) => [s, { value: v[s] ?? null }]));
}

/** Build the `{coords, sources}` node for a single field. */
export function fieldNode(fieldPath: string, values: ValueMap, coords: CoordMap) {
  return {
    fieldPath,
    coords: coords.get(fieldPath) ?? null,
    sources: sources(fieldPath, values),
  };
}

function indicesFor(prefix: RegExp, values: ValueMap): number[] {
  const set = new Set<number>();
  for (const key of values.keys()) {
    const m = key.match(prefix);
    if (m) set.add(Number(m[1]));
  }
  return [...set].sort((a, b) => a - b);
}

/** Build the full sections array for a paper. */
export function buildSections(values: ValueMap, coords: CoordMap) {
  return SECTIONS.map((sec) => {
    if (sec.type === "object" && sec.fields) {
      return {
        id: sec.id,
        title: sec.title,
        type: sec.type,
        fields: sec.fields.map((f) => ({
          label: f.label,
          type: f.type,
          ...(f.opts ? { opts: f.opts } : {}),
          ...fieldNode(`${sec.id}.${f.key}`, values, coords),
        })),
      };
    }
    if (sec.type === "array" && sec.fields) {
      const items = indicesFor(/^cond\.(\d+)\./, values).map((index) => ({
        index,
        fields: sec.fields!.map((f) => ({
          label: f.label,
          type: f.type,
          ...(f.opts ? { opts: f.opts } : {}),
          ...fieldNode(`cond.${index}.${f.key}`, values, coords),
        })),
      }));
      return { id: sec.id, title: sec.title, type: sec.type, itemLabel: sec.itemLabel, items };
    }
    // evidence
    const items = indicesFor(/^ev\.(\d+)$/, values).map((index) =>
      fieldNode(`ev.${index}`, values, coords),
    );
    return { id: sec.id, title: sec.title, type: sec.type, items };
  });
}

export { SECTION_BY_ID };
