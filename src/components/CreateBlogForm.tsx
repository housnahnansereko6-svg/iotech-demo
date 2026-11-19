import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import {
  BookOpen,
  ChevronDown,
  Clock,
  Eye,
  ImagePlus,
  Loader2,
  Lock,
  LockOpen,
  Radio,
  Save,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ArticleBody } from '@/components/ArticleBody'
import { BlogBodyEditor } from '@/components/BlogBodyEditor'
import { cn } from '@/lib/utils'
import {
  BLOG_CATEGORIES,
  BLOG_CURRENCY,
  EMPTY_CREATE_BLOG_FORM,
  EXCERPT_MAX,
  MIN_PAID_PRICE,
  PRICE_PRESETS,
  SUBTITLE_MAX,
  TITLE_MAX,
  parseTags,
  slugify,
  validateCreateBlogForm,
  type CreateBlogFormField,
  type CreateBlogFormValues,
} from '@/lib/blogFormSchema'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type BlogStatus = 'draft' | 'published'

// Shared look for the text inputs on this page: a soft filled box, as in the design.
const fieldClass =
  'w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-blue-600 focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-blue-600/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm'

// Fields that live in the collapsible "Card & link details" section. If one of them
// has an error when saving, we open the section so the admin can see it.
const DETAIL_FIELDS: CreateBlogFormField[] = ['slug', 'excerpt', 'tags']

const WORDS_PER_MINUTE = 200 // same as convex/blogs.ts

const formatNumber = (n: number) => n.toLocaleString('en-US')

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
  onCreated: (post: { slug: string; status: BlogStatus }) => void
}

// Admin Portal -> Blogs -> Create Blog. The whole page: header actions, the writing
// card on the left and the monetization card on the right.
export function CreateBlogForm({ onCreated }: CreateBlogFormProps) {
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
  // Which button is saving right now, or null.
  const [saving, setSaving] = useState<BlogStatus | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dragging, setDragging] = useState(false)

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

  function chooseCover(file: File | undefined) {
    update('coverImage', file ?? null)
    markTouched('coverImage')
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    chooseCover(event.dataTransfer.files[0])
  }

  async function save(status: BlogStatus) {
    setSubmitAttempted(true)
    setServerError(null)

    const { data, errors: found } = validateCreateBlogForm(values)
    if (!data) {
      const firstField = Object.keys(found)[0] as CreateBlogFormField
      if (DETAIL_FIELDS.includes(firstField)) setDetailsOpen(true)
      // Wait a tick so a just-opened section is on the page, then move the cursor there.
      setTimeout(() => document.getElementById(`blog-${firstField}`)?.focus(), 0)
      return
    }

    setSaving(status)
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
        status,
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
      onCreated({ slug, status })
    } catch (error) {
      // ConvexError = a rule the server rejected (e.g. slug already taken).
      setServerError(
        error instanceof ConvexError
          ? String(error.data)
          : 'Something went wrong while saving. Check your connection and try again.',
      )
    } finally {
      setSaving(null)
    }
  }

  const isPaid = values.subscriptionMode === 'paid'
  const wordCount = values.body.wordCount
  const readMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))
  const detailsHaveError = DETAIL_FIELDS.some((field) => errorFor(field))
  const hasErrors = submitAttempted && Object.keys(errors).length > 0

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void save('published')
      }}
      className="mx-auto w-full max-w-6xl"
    >
      {/* Header: title + the three actions */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl font-normal tracking-tight text-foreground">Create Blog</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wider text-amber-700 uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
            Draft mode
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving !== null}
            onClick={() => void save('draft')}
            className="h-9 bg-background px-3.5 text-xs font-medium shadow-2xs"
          >
            {saving === 'draft' ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
            )}
            {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            className="h-9 bg-background px-3.5 text-xs font-medium shadow-2xs"
          >
            <Eye aria-hidden="true" className="size-3.5" />
            Preview
          </Button>
          <Button
            type="submit"
            disabled={saving !== null}
            className="h-9 bg-blue-700 px-3.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-800"
          >
            {saving === 'published' ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Radio aria-hidden="true" className="size-3.5" />
            )}
            {saving === 'published' ? 'Publishing…' : 'Publish Article'}
          </Button>
        </div>
      </div>

      {(serverError || hasErrors) && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {serverError ?? 'Please fix the highlighted fields before saving.'}
        </p>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Left: the writing */}
        <div className="min-w-0 rounded-2xl border border-border bg-background p-5 shadow-2xs sm:p-7">
          {/* Status strip + category */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-border bg-card px-2 py-1 text-[0.65rem] font-semibold tracking-wider text-foreground/80 uppercase">
                Draft
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock aria-hidden="true" className="size-3.5" />
                Unsaved working copy
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="blog-category"
                className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase"
              >
                Category:
              </label>
              <div className="relative">
                <select
                  id="blog-category"
                  value={values.category}
                  onChange={(e) => update('category', e.target.value)}
                  onBlur={() => markTouched('category')}
                  aria-invalid={Boolean(errorFor('category'))}
                  aria-describedby={errorFor('category') ? 'blog-category-message' : undefined}
                  className={cn(fieldClass, 'h-8 w-auto appearance-none py-0 pr-8 text-xs md:text-xs')}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {BLOG_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-foreground"
                />
              </div>
            </div>
            {errorFor('category') && (
              <p id="blog-category-message" className="w-full text-right text-[0.7rem] text-destructive">
                {errorFor('category')}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-7">
            <Field
              id="blog-title"
              label="Title"
              required
              aside={`${values.title.length} / ${TITLE_MAX} characters max`}
              hint="A concise, definitive title."
              error={errorFor('title')}
            >
              {(props) => (
                <input
                  {...props}
                  maxLength={TITLE_MAX}
                  value={values.title}
                  onChange={(e) => update('title', e.target.value)}
                  onBlur={() => markTouched('title')}
                  placeholder="e.g. Why Cybersecurity Matters More Than Ever"
                  className={cn(fieldClass, 'h-11 font-serif text-lg md:text-lg')}
                />
              )}
            </Field>

            <Field
              id="blog-subtitle"
              label="Subtitle"
              required
              aside={`${values.subtitle.length} / ${SUBTITLE_MAX} characters max`}
              hint="Shown under the title on the article page."
              error={errorFor('subtitle')}
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  maxLength={SUBTITLE_MAX}
                  value={values.subtitle}
                  onChange={(e) => update('subtitle', e.target.value)}
                  onBlur={() => markTouched('subtitle')}
                  placeholder="Summarise the core idea of the article in one or two sentences…"
                  className={cn(fieldClass, 'resize-y text-sm')}
                />
              )}
            </Field>

            <Field
              id="blog-coverImage"
              label="Cover Artwork"
              required
              aside="Aspect ratio 16:9 recommended"
              error={errorFor('coverImage')}
            >
              {(props) =>
                coverPreview && values.coverImage ? (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      <img src={coverPreview} alt="" className="aspect-video w-full object-cover" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <label className="inline-flex h-7 cursor-pointer items-center rounded-md bg-background/90 px-2.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-background has-focus-visible:ring-3 has-focus-visible:ring-blue-600/30">
                          Replace
                          <input
                            {...props}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={(e) => chooseCover(e.target.files?.[0])}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          aria-label="Remove cover image"
                          onClick={() => update('coverImage', null)}
                          className="size-7 bg-background/90 shadow-sm backdrop-blur"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      <p className="absolute bottom-3 left-3 max-w-[80%] truncate rounded-md bg-background/90 px-2 py-1 text-[0.7rem] text-muted-foreground backdrop-blur">
                        {values.coverImage.name} · {(values.coverImage.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="blog-coverAlt"
                        label="Image description"
                        required
                        hint="Read aloud by screen readers."
                        error={errorFor('coverAlt')}
                      >
                        {(altProps) => (
                          <input
                            {...altProps}
                            value={values.coverAlt}
                            onChange={(e) => update('coverAlt', e.target.value)}
                            onBlur={() => markTouched('coverAlt')}
                            placeholder="A padlock over a phone screen"
                            className={cn(fieldClass, 'h-9')}
                          />
                        )}
                      </Field>
                      <Field
                        id="blog-coverCaption"
                        label="Caption"
                        hint="Optional. Shown under the image."
                        error={errorFor('coverCaption')}
                      >
                        {(captionProps) => (
                          <input
                            {...captionProps}
                            value={values.coverCaption}
                            onChange={(e) => update('coverCaption', e.target.value)}
                            onBlur={() => markTouched('coverCaption')}
                            className={cn(fieldClass, 'h-9')}
                          />
                        )}
                      </Field>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-card px-4 py-10 text-center transition-colors hover:bg-secondary/60 has-focus-visible:ring-3 has-focus-visible:ring-blue-600/20',
                      dragging && 'border-blue-600 bg-blue-50',
                      props['aria-invalid'] && 'border-destructive',
                    )}
                  >
                    <span className="mb-2 flex size-9 items-center justify-center rounded-lg border border-border bg-background shadow-2xs">
                      <ImagePlus aria-hidden="true" className="size-4 text-muted-foreground" />
                    </span>
                    <span className="text-sm text-foreground">
                      <span className="font-medium text-blue-700 underline underline-offset-4">Click to upload</span>{' '}
                      or drag and drop an image
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Supported formats: WebP, JPG, PNG only (max file size: 5 MB)
                    </span>
                    <span className="mt-1 flex flex-wrap justify-center gap-1.5">
                      {['High res', '16:9', '2400 × 1350 px'].map((tip) => (
                        <span
                          key={tip}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
                        >
                          {tip}
                        </span>
                      ))}
                    </span>
                    <input
                      {...props}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => chooseCover(e.target.files?.[0])}
                    />
                  </label>
                )
              }
            </Field>

            <Field
              id="blog-body"
              label="Body Text"
              required
              aside={
                <span className="flex items-center gap-1">
                  <BookOpen aria-hidden="true" className="size-3.5" />
                  {formatNumber(wordCount)} words · ~{readMinutes} min read
                </span>
              }
              error={errorFor('body')}
            >
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

            {/* Fields the server needs but the writer rarely changes. Slug fills itself from the title. */}
            <details
              open={detailsOpen}
              onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
              className={cn(
                'group rounded-xl border border-border',
                detailsHaveError && 'border-destructive/60',
              )}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-semibold text-foreground">Card &amp; link details</span>
                  <span className="block text-xs text-muted-foreground">
                    Excerpt for the blog card, web address and tags.
                    {detailsHaveError && <span className="text-destructive"> Needs attention.</span>}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="space-y-6 border-t border-border px-4 py-5">
                <Field
                  id="blog-excerpt"
                  label="Excerpt"
                  required
                  aside={`${values.excerpt.trim().length} / ${EXCERPT_MAX}`}
                  hint="The teaser shown on the blog card."
                  error={errorFor('excerpt')}
                >
                  {(props) => (
                    <textarea
                      {...props}
                      rows={3}
                      value={values.excerpt}
                      onChange={(e) => update('excerpt', e.target.value)}
                      onBlur={() => markTouched('excerpt')}
                      className={cn(fieldClass, 'resize-y text-sm')}
                    />
                  )}
                </Field>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field
                    id="blog-slug"
                    label="Slug"
                    required
                    hint={`Address: /blog?id=${values.slug || '…'}`}
                    error={errorFor('slug')}
                  >
                    {(props) => (
                      <input
                        {...props}
                        value={values.slug}
                        onChange={(e) => {
                          setSlugEdited(true)
                          update('slug', e.target.value)
                        }}
                        onBlur={() => markTouched('slug')}
                        className={cn(fieldClass, 'h-9 font-mono text-xs md:text-xs')}
                      />
                    )}
                  </Field>
                  <Field id="blog-tags" label="Tags" hint="Optional. Separate with commas." error={errorFor('tags')}>
                    {(props) => (
                      <input
                        {...props}
                        value={values.tags}
                        onChange={(e) => update('tags', e.target.value)}
                        onBlur={() => markTouched('tags')}
                        placeholder="mobile money, phishing"
                        className={cn(fieldClass, 'h-9')}
                      />
                    )}
                  </Field>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Right: who can read it */}
        <aside className="rounded-2xl border border-border bg-background p-5 shadow-2xs lg:sticky lg:top-6">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50">
              <Sparkles aria-hidden="true" className="size-4 text-orange-600" />
            </span>
            <div>
              <h2 className="font-serif text-lg leading-tight text-foreground">Monetization &amp; Tier</h2>
              <p className="text-xs text-muted-foreground">Reader access &amp; paywall settings</p>
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="text-xs font-semibold text-foreground">Subscription Mode</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['free', 'paid'] as const).map((mode) => {
                const selected = values.subscriptionMode === mode
                const Icon = mode === 'free' ? LockOpen : Lock
                return (
                  <label
                    key={mode}
                    className={cn(
                      'flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-xs font-medium capitalize transition-colors has-focus-visible:ring-3 has-focus-visible:ring-blue-600/30',
                      selected
                        ? 'border-blue-700 bg-blue-50 text-blue-700'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <input
                      type="radio"
                      name="subscriptionMode"
                      value={mode}
                      checked={selected}
                      onChange={() => update('subscriptionMode', mode)}
                      className="sr-only"
                    />
                    <Icon aria-hidden="true" className="size-3.5" />
                    {mode}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <label htmlFor="blog-price" className="text-xs font-semibold text-foreground">
              Price in {BLOG_CURRENCY}
            </label>
            <div
              className={cn(
                'mt-2 flex h-10 items-center rounded-lg border border-input bg-background focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-600/15',
                errorFor('price') && 'border-destructive ring-3 ring-destructive/20',
                !isPaid && 'opacity-60',
              )}
            >
              <span className="border-r border-border px-3 text-xs text-muted-foreground">{BLOG_CURRENCY}</span>
              <Input
                id="blog-price"
                type="number"
                inputMode="numeric"
                min={MIN_PAID_PRICE}
                step={500}
                disabled={!isPaid}
                value={isPaid ? values.price : '0'}
                onChange={(e) => update('price', e.target.value)}
                onBlur={() => markTouched('price')}
                aria-invalid={Boolean(errorFor('price'))}
                aria-describedby="blog-price-message"
                placeholder="5000"
                className="h-full border-0 bg-transparent font-serif text-base shadow-none focus-visible:ring-0 disabled:opacity-100 md:text-base"
              />
            </div>
            <p
              id="blog-price-message"
              className={cn('mt-2 text-[0.7rem]', errorFor('price') ? 'text-destructive' : 'text-muted-foreground')}
            >
              {errorFor('price') ??
                (isPaid
                  ? 'Readers see the opening paragraphs, then pay to unlock the rest.'
                  : 'Free: anyone can read the whole article.')}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[0.7rem] text-muted-foreground">Presets:</span>
            <div className="grid min-w-44 flex-1 grid-cols-3 gap-1.5">
              {PRICE_PRESETS.map((amount) => {
                const selected = isPaid && values.price === String(amount)
                return (
                  <button
                    key={amount}
                    type="button"
                    aria-label={`Charge ${formatNumber(amount)} ${BLOG_CURRENCY}`}
                    aria-pressed={selected}
                    onClick={() => {
                      update('subscriptionMode', 'paid')
                      update('price', String(amount))
                    }}
                    className={cn(
                      'flex flex-col items-center rounded-lg border py-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-blue-600/30',
                      selected
                        ? 'border-blue-700 bg-blue-50 text-blue-700'
                        : 'border-border bg-card text-foreground hover:bg-secondary',
                    )}
                  >
                    <span className="text-xs font-semibold">{formatNumber(amount)}</span>
                    <span className="text-[0.6rem] text-muted-foreground">{BLOG_CURRENCY}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>

      <PreviewSheet open={previewOpen} onOpenChange={setPreviewOpen} values={values} coverUrl={coverPreview} />
    </form>
  )
}

// Shows the article roughly as readers will see it, before anything is saved.
function PreviewSheet({
  open,
  onOpenChange,
  values,
  coverUrl,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: CreateBlogFormValues
  coverUrl: string | null
}) {
  const isPaid = values.subscriptionMode === 'paid'
  const minutes = Math.max(1, Math.round(values.body.wordCount / WORDS_PER_MINUTE))
  const [asPayingReader, setAsPayingReader] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-background data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b border-border px-6">
          <SheetTitle>Preview</SheetTitle>
          <SheetDescription>How the article will look on the site. Nothing has been saved.</SheetDescription>
          {isPaid && (
            <div className="mt-3 grid w-fit grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1 text-xs">
              {[
                { paying: false, label: 'Reader without access' },
                { paying: true, label: 'Paying reader' },
              ].map(({ paying, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={asPayingReader === paying}
                  onClick={() => setAsPayingReader(paying)}
                  className={cn(
                    'rounded-md px-3 py-1 font-medium transition-colors',
                    asPayingReader === paying
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </SheetHeader>
        <article className="px-6 pb-12 sm:px-10">
          <p className="text-xs font-semibold tracking-widest text-blue-700 uppercase">
            {values.category || 'No category'} · {minutes} min read
            {isPaid && values.price && ` · ${formatNumber(Number(values.price))} ${BLOG_CURRENCY}`}
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            {values.title || <span className="text-muted-foreground">Untitled article</span>}
          </h1>
          {values.subtitle && <p className="mt-3 text-lg text-muted-foreground">{values.subtitle}</p>}
          {coverUrl && (
            <figure className="mt-6">
              <img src={coverUrl} alt={values.coverAlt} className="aspect-video w-full rounded-xl object-cover" />
              {values.coverCaption && (
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">{values.coverCaption}</figcaption>
              )}
            </figure>
          )}
          <div className="mt-8">
            {values.body.html ? (
              isPaid && !asPayingReader ? (
                <>
                  <ArticleBody html={values.body.previewHtml} />
                  <PaywallMarker />
                </>
              ) : (
                <ArticleBody html={values.body.html} />
              )
            ) : (
              <p className="text-muted-foreground italic">The body is empty.</p>
            )}
          </div>
        </article>
      </SheetContent>
    </Sheet>
  )
}

function PaywallMarker() {
  return (
    <div className="my-8 flex items-center gap-3 text-[0.7rem] font-semibold tracking-widest text-orange-700 uppercase">
      <span className="h-px flex-1 bg-orange-300" />
      <Lock aria-hidden="true" className="size-3.5" />
      Paywall: readers pay to unlock the rest
      <span className="h-px flex-1 bg-orange-300" />
    </div>
  )
}

interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

// Label (+ counter on the right) + input + hint/error, wired together for screen readers.
// `children` is a function so the input receives the right id and aria attributes.
function Field({
  id,
  label,
  required = false,
  aside,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  aside?: ReactNode
  hint?: string
  error?: string
  children: (props: FieldControlProps) => ReactNode
}) {
  const messageId = `${id}-message`
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-foreground">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-red-600">
              *
            </span>
          )}
        </label>
        {aside && <span className="text-[0.7rem] text-muted-foreground">{aside}</span>}
      </div>
      <div className="mt-2">
        {children({
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': error || hint ? messageId : undefined,
        })}
      </div>
      {error ? (
        <p id={messageId} className="mt-1.5 text-[0.7rem] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-[0.7rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
