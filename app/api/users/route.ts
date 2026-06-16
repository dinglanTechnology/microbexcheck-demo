import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleError } from "@/lib/http";
import { createUserSchema } from "@/lib/validators/user";

// GET /api/users?q=<search>&skip=<n>&take=<n>
// List users, newest first, with optional name/email search and pagination.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim();
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
    const take = Math.min(100, Math.max(1, Number(searchParams.get("take")) || 20));

    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data, total, skip, take });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/users — create a user from a JSON body.
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const data = createUserSchema.parse(body);
    const user = await prisma.user.create({ data });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
