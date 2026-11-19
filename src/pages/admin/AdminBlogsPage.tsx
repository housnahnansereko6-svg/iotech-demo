import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Archive, ExternalLink, EyeOff, Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { useNavigate } from '../../navigation/RouterContext'
import { PATHS, blogDetailsPath } from '../../navigation/paths'

type BlogStatus = Doc<'blogs'>['status']
type Filter = 'all' | BlogStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'archived', label: 'Archived' },
]

const STATUS_STYLES: Record<BlogStatus, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-secondary text-muted-foreground',
  archived: 'bg-stone-100 text-stone-500',
}

// Turns a timestamp into 'Oct 28, 2026'.
function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AdminBlogsPage() {
  const navigate = useNavigate()
  // Every post, drafts included. undefined while loading; updates live.
  const blogs = useQuery(api.blogs.listForAdmin)
  const setStatus = useMutation(api.blogs.setStatus)
  const removeBlog = useMutation(api.blogs.remove)

  const [filter, setFilter] = useState<Filter>('all')
  // The row whose buttons are busy, and the row asking "really delete?".
  const [busyId, setBusyId] = useState<Id<'blogs'> | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<'blogs'> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const counts: Record<Filter, number> = { all: 0, published: 0, draft: 0, archived: 0 }
  for (const blog of blogs ?? []) {
    counts.all++
    counts[blog.status]++
  }
  const visibleBlogs = (blogs ?? []).filter((blog) => filter === 'all' || blog.status === filter)

  // Runs a mutation for one row, showing any error above the table.
  async function runForRow(id: Id<'blogs'>, action: () => Promise<unknown>) {
    setBusyId(id)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : 'Something went wrong. Please try again.')
    } finally {
      setBusyId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground">
          Articles &amp; Essays
        </h1>
        <Button
          type="button"
          onClick={() => navigate(PATHS.ADMIN_BLOG_CREATE)}
          className="self-start px-4 py-2 text-xs font-medium shadow-2xs sm:self-auto"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          <span>Create New Blog</span>
        </Button>
      </div>

      {/* Status filter with a count for each */}
      <div
        role="group"
        aria-label="Filter posts by status"
        className="mt-6 flex max-w-full gap-0.5 self-start overflow-x-auto rounded-lg border border-border bg-card p-0.5 shadow-xs"
      >
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              filter === id
                ? 'bg-primary font-medium text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {label}
            <span className="tabular-nums opacity-70">{counts[id]}</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {blogs === undefined ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : visibleBlogs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {blogs.length === 0 ? 'No posts yet. Create your first one.' : 'No posts with this status.'}
          </p>
        </div>
      ) : (
        // overflow-x-auto: on narrow screens the table scrolls sideways instead of squashing.
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Post</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Category</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Access</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Updated</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleBlogs.map((blog) => {
                const busy = busyId === blog._id
                return (
                  <tr key={blog._id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {blog.coverImageUrl ? (
                          <img
                            src={blog.coverImageUrl}
                            alt=""
                            className="size-11 shrink-0 rounded-md border border-border bg-muted object-cover"
                          />
                        ) : (
                          <div className="size-11 shrink-0 rounded-md border border-border bg-muted" />
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium text-foreground">{blog.title}</p>
                          <p className="line-clamp-1 font-mono text-[0.7rem] text-muted-foreground">
                            {blog.slug} · {blog.readTime}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{blog.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[blog.status])}>
                        {blog.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {blog.subscriptionMode === 'free' ? (
                        <span className="text-emerald-700">Free</span>
                      ) : (
                        <span className="text-amber-700">
                          {blog.price.currency} {blog.price.amount.toLocaleString('en-US')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      <time dateTime={new Date(blog.updatedAt).toISOString()}>{formatDate(blog.updatedAt)}</time>
                    </td>
                    <td className="px-4 py-3">
                      {confirmDeleteId === blog._id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-muted-foreground">Delete for good?</span>
                          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() => runForRow(blog._id, () => removeBlog({ id: blog._id }))}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {blog.status === 'published' && (
                            <RowAction label="View on site" onClick={() => navigate(blogDetailsPath(blog.slug))}>
                              <ExternalLink />
                            </RowAction>
                          )}
                          {blog.status === 'draft' && (
                            <RowAction label="Publish" disabled={busy} onClick={() => runForRow(blog._id, () => setStatus({ id: blog._id, status: 'published' }))}>
                              <Send />
                            </RowAction>
                          )}
                          {blog.status === 'published' && (
                            <RowAction label="Unpublish (back to draft)" disabled={busy} onClick={() => runForRow(blog._id, () => setStatus({ id: blog._id, status: 'draft' }))}>
                              <EyeOff />
                            </RowAction>
                          )}
                          {blog.status === 'archived' ? (
                            <RowAction label="Restore as draft" disabled={busy} onClick={() => runForRow(blog._id, () => setStatus({ id: blog._id, status: 'draft' }))}>
                              <RotateCcw />
                            </RowAction>
                          ) : (
                            <RowAction label="Archive" disabled={busy} onClick={() => runForRow(blog._id, () => setStatus({ id: blog._id, status: 'archived' }))}>
                              <Archive />
                            </RowAction>
                          )}
                          <RowAction label="Delete" disabled={busy} onClick={() => setConfirmDeleteId(blog._id)} className="hover:text-destructive">
                            <Trash2 />
                          </RowAction>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// A small icon button. The label is read by screen readers and shown on hover.
function RowAction({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      className={cn('text-muted-foreground [&_svg]:size-3.5', className)}
      {...props}
    >
      {children}
    </Button>
  )
}
