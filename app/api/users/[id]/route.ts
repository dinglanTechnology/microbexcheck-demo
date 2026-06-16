import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleError } from "@/lib/http";
import { updateUserSchema, userIdSchema } from "@/lib/validators/user";

// In Next.js 16 the dynamic `params` is a Promise and must be awaited.
type Context = { params: Promise<{ id: string }> };

// GET /api/users/[id]
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const id = userIdSchema.parse((await params).id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse("Resource not found", 404);

    return NextResponse.json(user);
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/users/[id] — partial update.
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const id = userIdSchema.parse((await params).id);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const data = updateUserSchema.parse(body);
    // Throws P2025 if no row matches `id`; mapped to 404 in handleError.
    const user = await prisma.user.update({ where: { id }, data });

    return NextResponse.json(user);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/users/[id]
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const id = userIdSchema.parse((await params).id);

    // Throws P2025 if no row matches `id`; mapped to 404 in handleError.
    await prisma.user.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
