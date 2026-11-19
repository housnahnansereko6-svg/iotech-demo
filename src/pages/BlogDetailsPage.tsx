import { useQuery } from 'convex/react'
import { ArrowLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArticleBody } from '@/components/ArticleBody'
import { Paywall } from '@/components/Paywall'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '../../convex/_generated/api'
import { useNavigate, useSearchParams } from '../navigation/RouterContext'
import { PATHS } from '../navigation/paths'

// Turns a timestamp into 'Oct 28, 2026'.
function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BlogDetailsPage() {
  const navigate = useNavigate()
  const searchParams = useSearchParams()

  // STEP 2: get the blog id from the search params.
  //   address '/blog?id=why-cybersecurity-matters'  ->  id = 'why-cybersecurity-matters'
  //   .get() gives null if there is no ?id= in the address.
  const id = searchParams.get('id')

  // STEP 3: ask Convex for the post with that slug.
  //   undefined -> still loading
  //   null      -> no post with that slug
  // "skip" means: don't run the query at all when there is no ?id= in the address.
  const post = useQuery(api.blogs.getBySlug, id ? { slug: id } : 'skip')

  const backButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => navigate(PATHS.LANDING)}
      className="px-3.5 py-1.5 text-xs font-medium shadow-2xs"
    >
      <ArrowLeft aria-hidden="true" className="size-3.5 text-muted-foreground" />
      <span>Back to blogs</span>
    </Button>
  )

  // Loading: show grey placeholders shaped like the page.
  if (id && post === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl py-12">
        {backButton}
        <Skeleton className="mt-10 h-5 w-48" />
        <Skeleton className="mt-5 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-2/3" />
        <Skeleton className="mt-10 aspect-[16/9] w-full rounded-xl" />
      </div>
    )
  }

  // Not found: someone typed a wrong id, or the post was removed.
  if (!post) {
    return (
      <div className="flex flex-1 flex-col items-start py-12">
        {backButton}
        <div className="my-auto py-16">
          <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground">
            Post not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&rsquo;t find a blog post at this address.
          </p>
        </div>
      </div>
    )
  }

  // STEP 4: the post was found, so show it.
  const isFree = post.subscriptionMode === 'free'

  return (
    <article className="mx-auto w-full max-w-3xl py-12">
      {backButton}

      <header className="mt-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-0.5">{post.category}</span>
          <span
            className={
              isFree
                ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700'
                : 'rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700'
            }
          >
            {isFree
              ? 'Free'
              : `Paid · ${post.price.currency} ${post.price.amount.toLocaleString('en-US')}`}
          </span>
          <span className="ml-1 inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-3.5" />
            <time dateTime={new Date(post.updatedAt).toISOString()}>{formatDate(post.updatedAt)}</time>
            <span aria-hidden="true">·</span>
            {post.readTime}
          </span>
        </div>

        <h1 className="mt-5 font-serif text-4xl leading-tight font-normal tracking-tight text-foreground sm:text-5xl">
          {post.title}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-foreground/75">{post.subtitle}</p>
      </header>

      {post.coverImageUrl && (
        <figure className="mt-10">
          <img
            src={post.coverImageUrl}
            alt={post.coverImageData.alt}
            className="aspect-[16/9] w-full rounded-xl border border-border bg-muted object-cover"
          />
          {post.coverImageData.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {post.coverImageData.caption}
            </figcaption>
          )}
        </figure>
      )}

      {post.locked ? (
        // Paid post: the server only sent the preview (previewContentHtml).
        // They fade out, and the paywall sits on top.
        <div className="relative mt-10">
          <div className="pointer-events-none select-none [mask-image:linear-gradient(to_bottom,black_35%,transparent_95%)]">
            <ArticleBody html={post.contentHtml} />
          </div>
          <div className="relative -mt-16 pb-4">
            <Paywall price={post.price.amount} currency={post.price.currency} />
          </div>
        </div>
      ) : (
        // Free post: the whole article.
        <div className="mt-10">
          <ArticleBody html={post.contentHtml} />
        </div>
      )}
    </article>
  )
}
