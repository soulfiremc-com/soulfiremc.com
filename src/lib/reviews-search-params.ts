import { z } from "zod";

export const reviewsSearchSchema = z.object({
  reviewsPage: z.number().int().min(1).catch(1).default(1),
});
