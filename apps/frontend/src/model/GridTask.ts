import * as zod from 'zod';

export const gridTaskZodSchema = zod.object({
  i: zod.string().min(1),
  x: zod.number().int(),
  y: zod.number().int(),
  w: zod.number().int(),
  h: zod.number().int(),
});

export type GridTask = zod.infer<typeof gridTaskZodSchema>;
