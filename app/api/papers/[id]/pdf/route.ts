import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

// GET /api/papers/[id]/pdf — proxy the OSS PDF same-origin so PDF.js can load
// it (and draw coordinate overlays) without cross-origin / CORS issues.
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse("Invalid id", 422);

    const paper = await prisma.paper.findUnique({ where: { id }, select: { pdfUrl: true } });
    if (!paper?.pdfUrl) return errorResponse("This paper has no PDF", 404);

    const upstream = await fetch(paper.pdfUrl);
    if (!upstream.ok || !upstream.body) return errorResponse("Failed to fetch PDF from storage", 502);

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
