import * as zod from 'zod';

export const gridTaskZodSchema = zod.object({
  id: zod.string().min(1),
  x: zod.number().int(),
  y: zod.number().int(),
  w: zod.number().int(),
  h: zod.number().int(),
});

export type GirTask = zod.infer<typeof gridTaskZodSchema>;
