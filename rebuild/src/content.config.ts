import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(['demo', 'paper', 'link', 'artifact']),
    tech: z.array(z.string()).optional(),
    github: z.string().url().optional(),
    link: z.string().url().optional(),
    dataFile: z.string().optional(),
    description: z.string().optional(),
  }),
});

const backrooms = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    source: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, projects, backrooms };
