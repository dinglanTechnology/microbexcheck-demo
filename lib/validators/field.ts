import { z } from "zod";

export const SOURCES = ["AI", "YANG", "WANG"] as const;

// A single field edit: update a source's value and/or the field-level coords.
// - value present  ⇒ source required (writes FieldValue for that source)
// - coords present ⇒ no source needed (writes field-level FieldCoord; null clears)
// coords is stored opaquely (frontend defines the rect shape), so we only
// assert "array of objects, or null".
export const editSchema = z
  .object({
    fieldPath: z.string().min(1),
    source: z.enum(SOURCES).optional(),
    value: z.unknown().optional(),
    coords: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })
  .refine((d) => d.value !== undefined || d.coords !== undefined, {
    message: "value 或 coords 至少传一个",
  })
  .refine((d) => d.value === undefined || d.source !== undefined, {
    message: "更新 value 时必须指定 source",
  });

// Body accepts either a single edit or { edits: [...] }.
export const editBodySchema = z.union([
  z.object({ edits: z.array(editSchema).min(1) }),
  editSchema,
]);

export type FieldEdit = z.infer<typeof editSchema>;

export function normalizeEdits(body: z.infer<typeof editBodySchema>): FieldEdit[] {
  return "edits" in body ? body.edits : [body];
}
