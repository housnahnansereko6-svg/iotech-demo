import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import schema, { blogStatusValidator } from "./schema";
import { SAMPLE_BLOGS } from "./seedData";

// The cover can be an uploaded file (coverImageStorageId) or a plain URL (coverImageUrl).
// Uploaded files win. Returns null when the post has no cover.
async function coverUrl(
  ctx: QueryCtx,
  blog: Pick<Doc<"blogs">, "coverImageStorageId" | "coverImageUrl">,
) {
  if (blog.coverImageStorageId) {
    return await ctx.storage.getUrl(blog.coverImageStorageId);
  }
  return blog.coverImageUrl ?? null;
}

// Published posts, newest first. Used by the Landing page.
// We leave out the article HTML: the cards don't need it, and paid articles must never
// be sent to someone who hasn't paid (anyone can read network responses).
// .take(100) keeps the query bounded; we'll add pagination when there are more posts.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const blogs = await ctx.db
      .query("blogs")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "published"))
      .order("desc")
      .take(100);
    return await Promise.all(
      blogs.map(
        async ({ fullContentHtml: _full, previewContentHtml: _preview, ...card }) => ({
          ...card,
          coverImageUrl: await coverUrl(ctx, card),
        }),
      ),
    );
  },
});

// One published post by its slug, or null if there is no such post. Used by the Blog Details page.
//   free post -> contentHtml is the full article, locked: false
//   paid post -> contentHtml is only the preview,  locked: true
// Later, once payments work, we'll check here whether this reader has paid.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (blog === null || blog.status !== "published") return null;

    const { fullContentHtml, previewContentHtml, ...rest } = blog;
    const locked = blog.subscriptionMode === "paid";
    return {
      ...rest,
      coverImageUrl: await coverUrl(ctx, blog),
      contentHtml: locked ? previewContentHtml : fullContentHtml,
      locked,
    };
  },
});

// Loads the sample posts into the database. Run it with:
//   npx convex run blogs:seed
// It is internal, so the website can't call it. Posts that already exist (same slug)
// are updated to match seedData.ts, so running it twice won't create duplicates.
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    let added = 0;
    let updated = 0;
    for (const doc of SAMPLE_BLOGS) {
      const existing = await ctx.db
        .query("blogs")
        .withIndex("by_slug", (q) => q.eq("slug", doc.slug))
        .unique();
      if (existing === null) {
        await ctx.db.insert("blogs", doc);
        added++;
      } else {
        await ctx.db.replace("blogs", existing._id, doc);
        updated++;
      }
    }
    return { added, updated };
  },
});

// ---------------------------------------------------------------------------
// Creating posts (Admin Portal -> Blogs -> Create New Blog)
//
// SECURITY TODO: the admin portal has no login yet, so anyone who finds these
// functions can call them. Once auth is added, check here that the caller is an admin.
// ---------------------------------------------------------------------------

// Step 1 of uploading a cover image: the browser asks for a one-time upload URL,
// POSTs the file to it, and gets back a storageId to pass to `create`.
export const generateCoverUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Same rules as the form (src/components/admin/blogFormSchema.ts). The form checks them
// first for quick feedback; we check again here because the browser can't be trusted.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORDS_PER_MINUTE = 200;

// Everything the form sends: a whole `blogs` document minus the fields the server works out.
const createBlogArgs = schema.tables.blogs.validator.omit("readTime", "updatedAt", "coverImageUrl");

export const create = mutation({
  args: createBlogArgs.fields,
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (title.length < 5) throw new ConvexError("The title must be at least 5 characters.");
    if (!SLUG_PATTERN.test(args.slug)) {
      throw new ConvexError("The slug may only contain lowercase letters, numbers and dashes.");
    }
    if (args.fullContentHtml.trim().length === 0 || args.wordCount < 1) {
      throw new ConvexError("The blog body can't be empty.");
    }
    if (args.subscriptionMode === "paid" && args.price.amount <= 0) {
      throw new ConvexError("A paid post needs a price above 0.");
    }
    if (args.subscriptionMode === "free" && args.price.amount !== 0) {
      throw new ConvexError("A free post must have a price of 0.");
    }

    const existing = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing !== null) {
      throw new ConvexError(`A post with the slug "${args.slug}" already exists.`);
    }

    // Trust the stored file for its size, not the number the browser sent.
    let coverImageData = args.coverImageData;
    if (args.coverImageStorageId) {
      const file = await ctx.db.system.get("_storage", args.coverImageStorageId);
      if (file === null) throw new ConvexError("The cover image upload was not found.");
      if (!file.contentType?.startsWith("image/")) {
        throw new ConvexError("The cover must be an image file.");
      }
      coverImageData = { ...coverImageData, fileSize: file.size };
    }

    const minutes = Math.max(1, Math.round(args.wordCount / WORDS_PER_MINUTE));
    await ctx.db.insert("blogs", {
      ...args,
      title,
      coverImageData,
      readTime: `${minutes} min read`,
      updatedAt: Date.now(),
    });
    return { slug: args.slug };
  },
});

// ---------------------------------------------------------------------------
// Managing posts (Admin Portal -> Blogs). Same SECURITY TODO as above: no login yet.
// ---------------------------------------------------------------------------

// Every post whatever its status, most recently changed first. Like `list`, it leaves
// out the article HTML, which the table doesn't need.
export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const blogs = await ctx.db.query("blogs").withIndex("by_updatedAt").order("desc").take(200);
    return await Promise.all(
      blogs.map(
        async ({ fullContentHtml: _full, previewContentHtml: _preview, ...row }) => ({
          ...row,
          coverImageUrl: await coverUrl(ctx, row),
        }),
      ),
    );
  },
});

// Publish, unpublish (back to draft) or archive a post.
export const setStatus = mutation({
  args: { id: v.id("blogs"), status: blogStatusValidator },
  handler: async (ctx, args) => {
    const blog = await ctx.db.get("blogs", args.id);
    if (blog === null) throw new ConvexError("That post no longer exists.");
    await ctx.db.patch("blogs", args.id, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});

// Deletes a post for good, together with its uploaded cover image.
export const remove = mutation({
  args: { id: v.id("blogs") },
  handler: async (ctx, args) => {
    const blog = await ctx.db.get("blogs", args.id);
    if (blog === null) return null; // already gone
    if (blog.coverImageStorageId) {
      await ctx.storage.delete(blog.coverImageStorageId);
    }
    await ctx.db.delete("blogs", args.id);
    return null;
  },
});
