import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BlogBodyEditor } from '@/components/BlogBodyEditor'
import { cn } from '@/lib/utils'
import {
  BLOG_CATEGORIES,
  BLOG_CURRENCY,
  EMPTY_CREATE_BLOG_FORM,
  parseTags,
  slugify,
  validateCreateBlogForm,
  type CreateBlogFormField,
  type CreateBlogFormValues,
} from '@/lib/blogFormSchema'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Shared look for the native <textarea> and <select>, matching our <Input>.
const fieldClass =
  'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm'

// 'image.png' 1200x800 -> '1200x800'. Falls back to undefined if the browser can't read it.
async function readImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file)
    const dimensions = `${bitmap.width}x${bitmap.height}`
    bitmap.close()
    return dimensions
  } catch {
    return undefined
  }
}

interface CreateBlogFormProps {
  // Called after the post is saved, with its slug and status.
  onCreated: (post: { slug: string; status: 'draft' | 'published' }) => void
  onCancel: () => void
}

export function CreateBlogForm({ onCreated, onCancel }: CreateBlogFormProps) {
  const generateCoverUploadUrl = useMutation(api.blogs.generateCoverUploadUrl)
  const createBlog = useMutation(api.blogs.create)

  const [values, setValues] = useState<CreateBlogFormValues>(EMPTY_CREATE_BLOG_FORM)
  // Re-checked on every change, so an error disappears as soon as it's fixed.
  const errors = useMemo(() => validateCreateBlogForm(values).errors, [values])
  // Fields the admin has left at least once. We only show their errors after that,
  // so the form doesn't shout at someone who hasn't typed yet.
  const [touched, setTouched] = useState<Partial<Record<CreateBlogFormField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  // Until the admin types their own slug, we keep it in sync with the title.
  const [slugEdited, setSlugEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // A temporary local URL so we can show the chosen cover before it's uploaded.
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!values.coverImage) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(values.coverImage)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [values.coverImage])

  // Functional update: the editor calls this from its own callback, which may hold
  // an old `values`, so always build on the latest state.
  function update<K extends CreateBlogFormField>(field: K, value: CreateBlogFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value }
      if (field === 'title' && !slugEdited) next.slug = slugify(value as string)
      return next
    })
  }

  function markTouched(field: CreateBlogFormField) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  // The message to show under a field, or undefined.
  function errorFor(field: CreateBlogFormField) {
    return submitAttempted || touched[field] ? errors[field] : undefined
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)
    setServerError(null)

    const { data, errors: found } = validateCreateBlogForm(values)
    if (!data) {
      // Move the cursor to the first field with a problem.
      const firstField = Object.keys(found)[0]
      document.getElementById(`blog-${firstField}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      // 1. Upload the cover image straight to Convex file storage.
      const uploadUrl = await generateCoverUploadUrl()
      const upload = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': data.coverImage.type },
        body: data.coverImage,
      })
      if (!upload.ok) throw new Error('Cover upload failed')
      const { storageId } = (await upload.json()) as { storageId: Id<'_storage'> }

      // 2. Save the post. The server checks everything again.
      const tags = parseTags(data.tags)
      const isPaid = data.subscriptionMode === 'paid'
      const { slug } = await createBlog({
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle,
        excerpt: data.excerpt,
        category: data.category,
        ...(tags.length > 0 ? { tags } : {}),
        status: data.status,
        subscriptionMode: data.subscriptionMode,
        price: { amount: isPaid ? Number(data.price) : 0, currency: BLOG_CURRENCY },
        fullContentHtml: data.body.html,
        previewContentHtml: data.body.previewHtml,
        wordCount: data.body.wordCount,
        coverImageStorageId: storageId,
        coverImageData: {
          alt: data.coverAlt,
          caption: data.coverCaption,
          fileName: data.coverImage.name,
          fileSize: data.coverImage.size,
          dimensions: await readImageDimensions(data.coverImage),
        },
      })
      onCreated({ slug, status: data.status })
    } catch (error) {
      // ConvexError = a rule the server rejected (e.g. slug already taken).
      setServerError(
        error instanceof ConvexError
          ? String(error.data)
          : 'Something went wrong while saving. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const isPaid = values.subscriptionMode === 'paid'

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Left: the writing */}
      <div className="min-w-0 space-y-6">
        <Field id="blog-title" label="Title" error={errorFor('title')}>
          {(props) => (
            <Input
              {...props}
              value={values.title}
              onChange={(e) => update('title', e.target.value)}
              onBlur={() => markTouched('title')}
              placeholder="Why Cybersecurity Matters More Than Ever"
              className="h-10 font-serif text-lg md:text-lg"
            />
          )}
        </Field>

        <Field id="blog-subtitle" label="Subtitle" hint="One line under the title on the article page." error={errorFor('subtitle')}>
          {(props) => (
            <Input
              {...props}
              value={values.subtitle}
              onChange={(e) => update('subtitle', e.target.value)}
              onBlur={() => markTouched('subtitle')}
              placeholder="Security is now part of everyday digital life"
              className="h-9"
            />
          )}
        </Field>

        <Field
          id="blog-excerpt"
          label="Excerpt"
          hint={`The teaser shown on the blog card. ${values.excerpt.trim().length}/300`}
          error={errorFor('excerpt')}
        >
          {(props) => (
            <textarea
              {...props}
              rows={3}
              value={values.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              onBlur={() => markTouched('excerpt')}
              className={cn(fieldClass, 'resize-y')}
            />
          )}
        </Field>

        <Field id="blog-body" label="Body" error={errorFor('body')}>
          {(props) => (
            <BlogBodyEditor
              id={props.id}
              invalid={props['aria-invalid']}
              describedBy={props['aria-describedby']}
              onChange={(body) => update('body', body)}
              onBlur={() => markTouched('body')}
            />
          )}
        </Field>
      </div>

      {/* Right: settings */}
      <div className="space-y-6">
        <Panel title="Publishing">
          <Field id="blog-status" label="Status" error={errorFor('status')}>
            {(props) => (
              <select
                {...props}
                value={values.status}
                onChange={(e) => update('status', e.target.value as CreateBlogFormValues['status'])}
                className={cn(fieldClass, 'h-9')}
              >
                <option value="published">Published: visible on the site</option>
                <option value="draft">Draft: hidden</option>
              </select>
            )}
          </Field>

          <fieldset>
            <legend className="text-xs font-medium text-foreground">Access</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary p-1">
              {(['free', 'paid'] as const).map((mode) => (
                <label
                  key={mode}
                  className={cn(
                    'cursor-pointer rounded-md px-2 py-1 text-center text-xs font-medium capitalize transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    values.subscriptionMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <input
                    type="radio"
                    name="subscriptionMode"
                    value={mode}
                    checked={values.subscriptionMode === mode}
                    onChange={() => update('subscriptionMode', mode)}
                    className="sr-only"
                  />
                  {mode}
                </label>
              ))}
            </div>
          </fieldset>

          {isPaid && (
            <Field id="blog-price" label={`Price (${BLOG_CURRENCY})`} hint="Readers see the opening paragraphs, then pay to unlock the rest." error={errorFor('price')}>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={values.price}
                  onChange={(e) => update('price', e.target.value)}
                  onBlur={() => markTouched('price')}
                  placeholder="1000"
                  className="h-9"
                />
              )}
            </Field>
          )}
        </Panel>

        <Panel title="Organisation">
          <Field id="blog-category" label="Category" error={errorFor('category')}>
            {(props) => (
              <select
                {...props}
                value={values.category}
                onChange={(e) => update('category', e.target.value)}
                onBlur={() => markTouched('category')}
                className={cn(fieldClass, 'h-9')}
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {BLOG_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field id="blog-tags" label="Tags" hint="Optional. Separate with commas." error={errorFor('tags')}>
            {(props) => (
              <Input
                {...props}
                value={values.tags}
                onChange={(e) => update('tags', e.target.value)}
                onBlur={() => markTouched('tags')}
                placeholder="mobile money, phishing"
                className="h-9"
              />
            )}
          </Field>

          <Field id="blog-slug" label="Slug" hint={`Address: /blog?id=${values.slug || '…'}`} error={errorFor('slug')}>
            {(props) => (
              <Input
                {...props}
                value={values.slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  update('slug', e.target.value)
                }}
                onBlur={() => markTouched('slug')}
                className="h-9 font-mono text-xs md:text-xs"
              />
            )}
          </Field>
        </Panel>

        <Panel title="Cover image">
          <Field id="blog-coverImage" label="Image" hint="PNG, JPG or WebP, up to 5 MB." error={errorFor('coverImage')}>
            {(props) =>
              coverPreview ? (
                <div className="relative">
                  <img src={coverPreview} alt="" className="aspect-[16/10] w-full rounded-lg border border-border object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Remove cover image"
                    onClick={() => update('coverImage', null)}
                    className="absolute top-2 right-2 shadow-sm"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <label
                  className={cn(
                    'flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card text-xs text-muted-foreground transition-colors hover:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    props['aria-invalid'] && 'border-destructive',
                  )}
                >
                  <ImagePlus aria-hidden="true" className="size-6" />
                  Choose an image
                  <input
                    {...props}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      update('coverImage', e.target.files?.[0] ?? null)
                      markTouched('coverImage')
                    }}
                  />
                </label>
              )
            }
          </Field>

          <Field id="blog-coverAlt" label="Image description" hint="Read aloud by screen readers." error={errorFor('coverAlt')}>
            {(props) => (
              <Input
                {...props}
                value={values.coverAlt}
                onChange={(e) => update('coverAlt', e.target.value)}
                onBlur={() => markTouched('coverAlt')}
                placeholder="A padlock over a phone screen"
                className="h-9"
              />
            )}
          </Field>

          <Field id="blog-coverCaption" label="Caption" hint="Optional. Shown under the image." error={errorFor('coverCaption')}>
            {(props) => (
              <Input
                {...props}
                value={values.coverCaption}
                onChange={(e) => update('coverCaption', e.target.value)}
                onBlur={() => markTouched('coverCaption')}
                className="h-9"
              />
            )}
          </Field>
        </Panel>

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {serverError}
          </p>
        )}
        {submitAttempted && !serverError && Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            Please fix the highlighted fields.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />}
            {submitting ? 'Saving…' : values.status === 'published' ? 'Publish' : 'Save draft'}
          </Button>
        </div>
      </div>
    </form>
  )
}

// A titled box that groups related settings in the right-hand column.
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

// Label + input + hint/error, wired together for screen readers.
// `children` is a function so the input receives the right id and aria attributes.
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: (props: FieldControlProps) => ReactNode
}) {
  const messageId = `${id}-message`
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': error || hint ? messageId : undefined,
        })}
      </div>
      {error ? (
        <p id={messageId} className="mt-1 text-[0.7rem] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-[0.7rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
