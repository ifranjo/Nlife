import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum([
      'getting-started',
      'tools',
      'api',
      'troubleshooting',
      'advanced'
    ]),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    lastUpdated: z.date().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = {
  docs: docsCollection,
};
