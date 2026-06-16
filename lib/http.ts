import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";

/** A JSON error response with a consistent `{ error, details? }` shape. */
export function errorResponse(
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

/**
 * Maps thrown errors to HTTP responses so route handlers can keep a single
 * `catch (err) { return handleError(err) }` branch.
 */
export function handleError(err: unknown) {
  // Invalid request body / params. `flatten()` surfaces both field-level
  // errors and root-level ones (e.g. a bad id or an empty PATCH body).
  if (err instanceof ZodError) {
    const { formErrors, fieldErrors } = err.flatten();
    return errorResponse("Validation failed", 422, { formErrors, fieldErrors });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      // Unique constraint violation (e.g. duplicate email).
      case "P2002": {
        const target = (err.meta?.target as string[] | undefined)?.join(", ");
        return errorResponse(
          target ? `A record with this ${target} already exists` : "Conflict",
          409,
        );
      }
      // Record required by the operation was not found (update/delete).
      case "P2025":
        return errorResponse("Resource not found", 404);
    }
  }

  console.error("Unhandled API error:", err);
  return errorResponse("Internal server error", 500);
}
