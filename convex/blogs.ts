import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { SAMPLE_BLOGS } from "./seedData";

// How many blocks (paragraphs/headings) of a paid post anyone can read before paying.
const PREVIEW_BLOCKS = 2;

// All posts, newest first. Used by the Landing page.
// We leave out `body`: the cards don't need it, and paid articles must never
// be sent to someone who hasn't paid (anyone can read network responses).
// .take(100) keeps the query bounded; we'll add pagination when there are more posts.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const blogs = await ctx.db
      .query("blogs")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(100);
    return blogs.map(({ body: _body, ...card }) => card);
  },
});

// One post by its slug, or null if there is no such post. Used by the Blog Details page.
//   free post -> the full body, locked: false
//   paid post -> only the first few blocks of the body, locked: true
// Later, once payments work, we'll check here whether this reader has paid.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (blog === null) return null;
    return toReadable(blog);
  },
});

function toReadable(blog: Doc<"blogs">) {
  if (blog.price === 0) {
    return { ...blog, locked: false };
  }
  const preview = blog.body.split(/\n\s*\n/).slice(0, PREVIEW_BLOCKS).join("\n\n");
  return { ...blog, body: preview, locked: true };
}

// Loads the sample posts into the database. Run it with:
//   npx convex run blogs:seed
// It is internal, so the website can't call it. Posts that already exist (same slug)
// are updated to match seedData.ts, so running it twice won't create duplicates.
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    let added = 0;
    let updated = 0;
    for (const blog of SAMPLE_BLOGS) {
      const existing = await ctx.db
        .query("blogs")
        .withIndex("by_slug", (q) => q.eq("slug", blog.slug))
        .unique();
      if (existing === null) {
        await ctx.db.insert("blogs", blog);
        added++;
      } else {
        await ctx.db.replace("blogs", existing._id, blog);
        updated++;
      }
    }
    return { added, updated };
  },
});
