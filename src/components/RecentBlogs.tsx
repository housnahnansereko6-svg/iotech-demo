import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { api as convexApi } from '../../convex/_generated/api'
import { BlogCard } from './BlogCard'

const ALL = 'All'

// 1 -> '01'
const twoDigits = (n: number) => String(n).padStart(2, '0')

export function RecentBlogs() {
  // Ask Convex for the posts (already sorted newest first by the server).
  // It's `undefined` while loading, then the list. It also updates live when posts change.
  const posts = useQuery(convexApi.blogs.list)
  const [activeCategory, setActiveCategory] = useState(ALL)

  // The carousel hands us its "api" object, which lets us move it and ask where it is.
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(1)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  // ALL builds from every category; new Set removes duplicates.
  const categories = [ALL, ...new Set((posts ?? []).map((post) => post.category))]

  const visiblePosts =
    activeCategory === ALL
      ? (posts ?? [])
      : (posts ?? []).filter((post) => post.category === activeCategory)

  // Whenever the carousel movesrebuilds, update the counter and the arrow buttons.
  useEffect(() => {
    if (!api) return

    function update() {
      if (!api) return
      setCurrent(api.selectedScrollSnap() + 1)
      setTotal(api.scrollSnapList().length)
      setCanPrev(api.canScrollPrev())
      setCanNext(api.canScrollNext())
    }

    update()
    api.on('select', update)
    api.on('reInit', update)
    // Clean up the listeners when the carousel goes away.
    return () => {
      api.off('select', update)
      api.off('reInit', update)
    }
  }, [api, posts])

  return (
    <section aria-labelledby="recent-blogs-heading" className="border-t border-border py-12 md:py-16">
      {/* Header row: label + heading stay together in the top-left corner,
          the tabs and arrows sit on the right (they drop underneath on phones). */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-[#8a3b2a] uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#8a3b2a]" />
            From the Archive
          </p>
          <h2
            id="recent-blogs-heading"
            className="mt-2 font-serif text-4xl font-normal tracking-tight text-foreground sm:text-5xl"
          >
            Recent Blogs
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category tabs. overflow-x-auto lets them scroll sideways on small phones. */}
          <div
            role="group"
            aria-label="Filter posts by category"
            className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-0.5 shadow-xs"
          >
            {categories.map((category) => {
              const isActive = category === activeCategory
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive
                      ? 'bg-primary font-medium text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {category}
                </button>
              )
            })}
          </div>

          {/* Counter + arrows */}
          <div className="flex items-center gap-1.5">
            <span aria-live="polite" className="mr-1 text-xs text-muted-foreground tabular-nums">
              {twoDigits(current)} / {twoDigits(total)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => api?.scrollPrev()}
              disabled={!canPrev}
              aria-label="Previous posts"
            >
              <ArrowLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => api?.scrollNext()}
              disabled={!canNext}
              aria-label="Next posts"
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* key={activeCategory} gives the carousel a fresh start (back to slide 1)
          every time you switch tabs. */}
      {posts === undefined ? (
        // Still loading: show three grey placeholder cards.
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
      <Carousel key={activeCategory} setApi={setApi} opts={{ align: 'start' }} className="mt-8">
        <CarouselContent>
          {/* .map() turns each post into a slide. basis-* = how wide each slide is:
              1 per row on phones, 2 on tablets, 3 on big screens. */}
          {visiblePosts.map((post) => (
            <CarouselItem key={post._id} className="py-1 md:basis-1/2 lg:basis-1/3">
              <BlogCard post={post} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      )}
    </section>
  )
}
