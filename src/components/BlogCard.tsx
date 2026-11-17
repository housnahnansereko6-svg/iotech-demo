import { ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Doc } from '../../convex/_generated/dataModel'
import { useNavigate } from '../navigation/RouterContext'
import { blogDetailsPath } from '../navigation/paths'

// Turns '2026-10-28' into 'Oct 28, 2026'.
function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Turns 10000 into '10,000'.
const formatUGX = (amount: number) => amount.toLocaleString('en-US')

// A component receives data through "props". This one gets a single post.
// Doc<'blogs'> is the type of one post stored in our Convex `blogs` table.
// Cards never get the article `body` (the list query leaves it out).
export function BlogCard({ post }: { post: Omit<Doc<'blogs'>, 'body'> }) {
  const navigate = useNavigate()
  const isFree = post.price === 0

  return (
    // relative -> lets the title link stretch over the whole card
    // group    -> lets children react when the card is hovered
    // h-full   -> every card in a row is the same height
    <Card className="group relative h-full gap-4 pt-0 transition-shadow hover:shadow-md">
      {/* Cover image. aspect-[16/10] keeps every image the same shape,
          object-cover crops it to fill the box without stretching. */}
      <div className="overflow-hidden">
        <img
          src={post.image}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full bg-muted object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <CardHeader className="gap-3">
        {/* Category on the left, price badge on the right */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
            {post.category}
          </span>
          {isFree ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              Free
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Paid · UGX {formatUGX(post.price)}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock aria-hidden="true" className="size-3.5" />
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readMinutes} min read</span>
        </p>

     
        <CardTitle className="font-serif text-xl leading-snug font-semibold tracking-tight">
          <h3>
            {/*  */}
            <a
              href={blogDetailsPath(post.slug)}
              onClick={(event) => {
                event.preventDefault()
                // Pass the post's id in the address
               
                navigate(blogDetailsPath(post.slug))
              }}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
            >
              {post.title}
            </a>
          </h3>
        </CardTitle>
      </CardHeader>

 
      <CardContent className="flex-1">
        <CardDescription className="line-clamp-3 leading-relaxed">{post.excerpt}</CardDescription>
      </CardContent>

      <CardFooter className="border-t py-3">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 group-hover:underline">
          Read
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </CardFooter>
    </Card>
  )
}
