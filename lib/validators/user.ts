import { z } from "zod";

// POST /api/users — all fields validated; email is required and must be valid.
export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(100).optional(),
});

// PATCH /api/users/[id] — partial update; at least one field must be present.
export const updateUserSchema = createUserSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field (email or name) is required" },
);

// Coerce the dynamic route segment ("123") into a positive integer id.
export const userIdSchema = z.coerce.number().int().positive();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
