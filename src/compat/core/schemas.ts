import { z } from "zod";

export const genericSearchSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  include: z.record(z.unknown()).optional(),
});

export type GenericSearchParams = z.infer<typeof genericSearchSchema>;
