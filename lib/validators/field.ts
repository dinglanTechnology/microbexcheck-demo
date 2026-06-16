import { z } from "zod";

export const SOURCES = ["AI", "YANG", "WANG"] as const;

// A single field edit. Field-level (no source): coords, confirmed, accepted.
// Per-source: value (requires source).
// - value present      ⇒ source required (writes FieldValue for that source)
// - accepted present   ⇒ 验收人终值，field-level FieldMeta.accepted（与三来源无关）
// - coords present      ⇒ field-level FieldMeta.coords (null clears)
// - confirmed present   ⇒ field-level FieldMeta.confirmed
// coords/accepted are stored opaquely (frontend defines the shape).
export const editSchema = z
  .object({
    fieldPath: z.string().min(1),
    source: z.enum(SOURCES).optional(),
    value: z.unknown().optional(),
    accepted: z.unknown().optional(),
    coords: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    confirmed: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.value !== undefined ||
      d.accepted !== undefined ||
      d.coords !== undefined ||
      d.confirmed !== undefined,
    { message: "value、accepted、coords 或 confirmed 至少传一个" },
  )
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
