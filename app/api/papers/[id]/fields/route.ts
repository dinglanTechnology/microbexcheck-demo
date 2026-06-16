import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { errorResponse, handleError } from "@/lib/http";
import { editBodySchema, normalizeEdits } from "@/lib/validators/field";
import {
  sectionOf,
  fieldNode,
  type ValueMap,
  type MetaMap,
  type SourceKey,
} from "@/lib/ipsc/assemble";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/papers/[id]/fields
// Body: a single edit, or { edits: [...] }.
//   { fieldPath, source?, value?, coords?, confirmed? }
//   - value     ⇒ requires source; upserts that source's FieldValue
//   - coords     ⇒ field-level FieldMeta.coords (null clears)
//   - confirmed  ⇒ field-level FieldMeta.confirmed (审核「确认/已提交」)
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse("Invalid id", 422);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const edits = normalizeEdits(editBodySchema.parse(body));

    const paper = await prisma.paper.findUnique({ where: { id }, select: { id: true } });
    if (!paper) return errorResponse("Resource not found", 404);

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const e of edits) {
      if (e.value !== undefined) {
        const value = e.value === null ? Prisma.JsonNull : (e.value as Prisma.InputJsonValue);
        ops.push(
          prisma.fieldValue.upsert({
            where: { paperId_fieldPath_source: { paperId: id, fieldPath: e.fieldPath, source: e.source! } },
            create: { paperId: id, section: sectionOf(e.fieldPath), fieldPath: e.fieldPath, source: e.source!, value },
            update: { value },
          }),
        );
      }
      if (e.coords !== undefined || e.confirmed !== undefined || e.accepted !== undefined) {
        const coordsVal =
          e.coords === undefined
            ? undefined
            : e.coords === null
              ? Prisma.DbNull
              : (e.coords as Prisma.InputJsonValue);
        const acceptedVal =
          e.accepted === undefined
            ? undefined
            : e.accepted === null
              ? Prisma.DbNull
              : (e.accepted as Prisma.InputJsonValue);
        const data = {
          ...(coordsVal !== undefined ? { coords: coordsVal } : {}),
          ...(acceptedVal !== undefined ? { accepted: acceptedVal } : {}),
          ...(e.confirmed !== undefined ? { confirmed: e.confirmed } : {}),
        };
        ops.push(
          prisma.fieldMeta.upsert({
            where: { paperId_fieldPath: { paperId: id, fieldPath: e.fieldPath } },
            create: { paperId: id, fieldPath: e.fieldPath, ...data },
            update: data,
          }),
        );
      }
    }
    await prisma.$transaction(ops);

    // Return the affected fields' fresh state.
    const paths = [...new Set(edits.map((e) => e.fieldPath))];
    const [fvs, fms] = await Promise.all([
      prisma.fieldValue.findMany({ where: { paperId: id, fieldPath: { in: paths } } }),
      prisma.fieldMeta.findMany({ where: { paperId: id, fieldPath: { in: paths } } }),
    ]);

    const values: ValueMap = new Map();
    for (const fv of fvs) {
      const entry = values.get(fv.fieldPath) ?? {};
      entry[fv.source as SourceKey] = fv.value;
      values.set(fv.fieldPath, entry);
    }
    const metas: MetaMap = new Map(
      fms.map((m) => [m.fieldPath, { coords: m.coords, confirmed: m.confirmed, accepted: m.accepted }]),
    );

    return NextResponse.json({ fields: paths.map((p) => fieldNode(p, values, metas)) });
  } catch (err) {
    return handleError(err);
  }
}
