import { z } from "zod";

/**
 * Zod schemas for the setlist.fm API shapes the engine consumes.
 * Deliberately permissive: only fields the engine relies on are required;
 * unknown fields pass through untouched so upstream API additions never break us.
 */

export const songSchema = z.object({
  name: z.string(),
  info: z.string().optional(),
  // true when the "song" is walk-on/interlude music played from tape, not performed
  tape: z.boolean().optional(),
  cover: z
    .object({ mbid: z.string().optional(), name: z.string() })
    .optional(),
  with: z.object({ name: z.string() }).optional(),
});

export const setSchema = z.object({
  name: z.string().optional(),
  encore: z.number().optional(),
  song: z.array(songSchema).default([]),
});

export const setlistSchema = z.object({
  id: z.string(),
  versionId: z.string().optional(),
  eventDate: z.string(), // DD-MM-YYYY
  lastUpdated: z.string().optional(),
  artist: z.object({
    mbid: z.string(),
    name: z.string(),
    sortName: z.string().optional(),
    url: z.string().optional(),
  }),
  venue: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      city: z
        .object({
          name: z.string().optional(),
          state: z.string().optional(),
          country: z
            .object({ code: z.string().optional(), name: z.string().optional() })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  tour: z.object({ name: z.string() }).optional(),
  sets: z
    .object({ set: z.array(setSchema).default([]) })
    .default({ set: [] }),
  info: z.string().optional(),
  url: z.string().optional(),
});

export const setlistPageSchema = z.object({
  type: z.string().optional(),
  itemsPerPage: z.number(),
  page: z.number(),
  total: z.number(),
  setlist: z.array(setlistSchema).default([]),
});

export type Song = z.infer<typeof songSchema>;
export type SetlistSet = z.infer<typeof setSchema>;
export type Setlist = z.infer<typeof setlistSchema>;
export type SetlistPage = z.infer<typeof setlistPageSchema>;
