import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleError } from "@/lib/http";
import { buildSections, type ValueMap, type MetaMap, type SourceKey } from "@/lib/ipsc/assemble";

type Context = { params: Promise<{ id: string }> };

// 文献状态机：pending(待进行) → active(进行中) → done(已完成)。
const statusSchema = z.object({ status: z.enum(["pending", "active", "done"]) });

// GET /api/papers/[id] — full detail in the SECTIONS/rid shape.
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse("Invalid id", 422);

    const paper = await prisma.paper.findUnique({
      where: { id },
      include: { fields: true, metas: true },
    });
    if (!paper) return errorResponse("Resource not found", 404);

    const values: ValueMap = new Map();
    for (const fv of paper.fields) {
      const entry = values.get(fv.fieldPath) ?? {};
      entry[fv.source as SourceKey] = fv.value;
      values.set(fv.fieldPath, entry);
    }
    const metas: MetaMap = new Map(
      paper.metas.map((m) => [m.fieldPath, { coords: m.coords, confirmed: m.confirmed, accepted: m.accepted }]),
    );

    return NextResponse.json({
      paper: {
        id: paper.id,
        fileKey: paper.fileKey,
        title: paper.title,
        journal: paper.journal,
        year: paper.year,
        doi: paper.doi,
        pmid: paper.pmid,
        url: paper.url,
        status: paper.status,
        pdfUrl: paper.pdfUrl,
      },
      sections: buildSections(values, metas),
    });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/papers/[id] — advance the review status machine.
// Body: { status: "pending" | "active" | "done" }. Only the status field is
// touched here (field values/coords live under /fields).
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

    const { status } = statusSchema.parse(body);

    // update throws P2025 (→ 404) when the paper doesn't exist.
    const paper = await prisma.paper.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    return NextResponse.json(paper);
  } catch (err) {
    return handleError(err);
  }
}
