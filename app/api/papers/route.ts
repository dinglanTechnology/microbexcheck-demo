import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/http";

// GET /api/papers?status=&q=
// List papers (id/title/journal/year/status/pdfUrl) with optional filters.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status")?.trim();
    const q = searchParams.get("q")?.trim();

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? { OR: [{ title: { contains: q } }, { journal: { contains: q } }] }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        orderBy: { id: "asc" },
        select: {
          id: true,
          fileKey: true,
          title: true,
          journal: true,
          year: true,
          status: true,
          pdfUrl: true,
        },
      }),
      prisma.paper.count({ where }),
    ]);

    return NextResponse.json({ data, total });
  } catch (err) {
    return handleError(err);
  }
}
