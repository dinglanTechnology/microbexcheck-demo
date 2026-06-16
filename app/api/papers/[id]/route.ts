import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleError } from "@/lib/http";
import { buildSections, type ValueMap, type CoordMap, type SourceKey } from "@/lib/ipsc/assemble";

type Context = { params: Promise<{ id: string }> };

// GET /api/papers/[id] — full detail in the SECTIONS/rid shape.
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse("Invalid id", 422);

    const paper = await prisma.paper.findUnique({
      where: { id },
      include: { fields: true, coords: true },
    });
    if (!paper) return errorResponse("Resource not found", 404);

    const values: ValueMap = new Map();
    for (const fv of paper.fields) {
      const entry = values.get(fv.fieldPath) ?? {};
      entry[fv.source as SourceKey] = fv.value;
      values.set(fv.fieldPath, entry);
    }
    const coords: CoordMap = new Map(paper.coords.map((c) => [c.fieldPath, c.coords]));

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
      sections: buildSections(values, coords),
    });
  } catch (err) {
    return handleError(err);
  }
}
