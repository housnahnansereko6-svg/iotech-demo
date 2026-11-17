import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tasks: defineTable({
        text: v.string(),
        isCompleted: v.boolean(),
    }),

    // One document = one blog post.
    blogs: defineTable({
        slug: v.string(), // used in the address: /blog?id=<slug>
        title: v.string(),
        excerpt: v.string(), // the short teaser shown on the card
        category: v.string(),
        publishedAt: v.string(), // ISO date, e.g. '2026-10-28'
        readMinutes: v.number(),
        image: v.string(), // cover photo
        price: v.number(), // in UGX. 0 means the post is free
        body: v.string(), // the full article (see seedData.ts for the format)
    })
        // Find one post by its slug (Blog Details page).
        .index("by_slug", ["slug"])
        // List posts newest first (Landing page).
        .index("by_publishedAt", ["publishedAt"]),
});
