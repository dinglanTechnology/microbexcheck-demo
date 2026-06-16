import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

// GET /api/papers/[id]/pdf — proxy the OSS PDF same-origin so PDF.js can load
// it (and draw coordinate overlays) without cross-origin / CORS issues.
//
// Forwards HTTP Range requests to OSS and mirrors 206/Content-Range so PDF.js
// can fetch only the bytes it needs (progressive, per-page) instead of pulling
// the whole 5–30MB file before rendering.
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse("Invalid id", 422);

    const paper = await prisma.paper.findUnique({ where: { id }, select: { pdfUrl: true } });
    if (!paper?.pdfUrl) return errorResponse("This paper has no PDF", 404);

    const range = request.headers.get("range");
    const upstream = await fetch(paper.pdfUrl, range ? { headers: { Range: range } } : {});
    if (!upstream.ok || !upstream.body) return errorResponse("Failed to fetch PDF from storage", 502);

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    // 206 when a Range was satisfied, otherwise 200.
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    return handleError(err);
  }
}
