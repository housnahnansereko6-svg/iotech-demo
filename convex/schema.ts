import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The topics a post can be filed under.
export const blogCategoryValidator = v.union(
    v.literal("Cybersecurity"),
    v.literal("Privacy"),
    v.literal("AI & Automation"),
    v.literal("AI Security"),
);

// Only "published" posts are shown on the website.
export const blogStatusValidator = v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("archived"),
);

// "free" -> anyone can read the whole post.
// "paid" -> readers see previewContentHtml until they pay `price`.
export const subscriptionModeValidator = v.union(
    v.literal("free"),
    v.literal("paid"),
);

export default defineSchema({
    tasks: defineTable({
        text: v.string(),
        isCompleted: v.boolean(),
    }),

    // One document = one blog post.
    blogs: defineTable({
        slug: v.string(), // used in the address: /blog?id=<slug>
        title: v.string(),
        subtitle: v.string(),
        excerpt: v.string(), // the short teaser shown on the card
        previewContentHtml: v.string(), // what non-paying readers see of a paid post
        fullContentHtml: v.string(), // the whole article; never sent for a locked post
        category: blogCategoryValidator,
        tags: v.optional(v.array(v.string())),
        readTime: v.string(), // e.g. "4 min read"
        wordCount: v.number(),
        status: blogStatusValidator,
        subscriptionMode: subscriptionModeValidator,
        price: v.object({
            amount: v.number(), // 0 for free posts
            currency: v.string(), // e.g. "UGX"
        }),
        coverImageStorageId: v.optional(v.id("_storage")), // an uploaded cover
        coverImageUrl: v.optional(v.string()), // or a plain URL / public path
        coverImageData: v.object({
            alt: v.string(),
            caption: v.string(),
            fileName: v.optional(v.string()),
            fileSize: v.optional(v.number()),
            dimensions: v.optional(v.string()),
        }),
        author: v.optional(
            v.object({
                id: v.string(),
                name: v.string(),
                role: v.string(),
            }),
        ),
        updatedAt: v.number(), // ms since epoch
    })
        // Find one post by its slug (Blog Details page).
        .index("by_slug", ["slug"])
        // Published posts, newest first (Landing page).
        .index("by_status_and_updatedAt", ["status", "updatedAt"]),
});
