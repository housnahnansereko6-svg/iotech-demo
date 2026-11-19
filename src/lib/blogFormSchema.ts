import { z } from 'zod'
import type { Doc } from '../../convex/_generated/dataModel'

// Must match blogCategoryValidator in convex/schema.ts.
// `satisfies` makes TypeScript complain if a name here isn't a real category.
export const BLOG_CATEGORIES = [
  'Cybersecurity',
  'Privacy',
  'AI & Automation',
  'AI Security',
] as const satisfies readonly Doc<'blogs'>['category'][]

export const BLOG_CURRENCY = 'UGX'

// 'why-cybersecurity-matters': lowercase words joined by single dashes.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const MAX_COVER_BYTES = 5 * 1024 * 1024 // 5 MB
const MIN_BODY_WORDS = 50
const MIN_PAID_PRICE = 500
const MAX_TAGS = 8

// 'Why Cybersecurity Matters!' -> 'why-cybersecurity-matters'
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop accents: é -> e
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

// 'security, AI , ,privacy' -> ['security', 'AI', 'privacy']
export function parseTags(text: string) {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

// What the rich text editor reports every time the body changes.
export interface BlogBodyValue {
  html: string // the whole article
  previewHtml: string // the opening blocks shown above the paywall
  wordCount: number
}

// Every field of the Create Blog form, and the rule it has to pass.
// Text inputs hold strings, so price is a string here and turned into a number below.
export const createBlogFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, 'The title must be at least 5 characters.')
      .max(120, 'Keep the title under 120 characters.'),
    subtitle: z
      .string()
      .trim()
      .min(5, 'The subtitle must be at least 5 characters.')
      .max(160, 'Keep the subtitle under 160 characters.'),
    slug: z
      .string()
      .trim()
      .min(3, 'The slug must be at least 3 characters.')
      .max(80, 'Keep the slug under 80 characters.')
      .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single dashes only, e.g. my-first-post.'),
    excerpt: z
      .string()
      .trim()
      .min(20, 'The excerpt must be at least 20 characters.')
      .max(300, 'Keep the excerpt under 300 characters so it fits on the card.'),
    category: z.enum(BLOG_CATEGORIES, { error: 'Choose a category.' }),
    tags: z
      .string()
      .refine((text) => parseTags(text).length <= MAX_TAGS, `Use at most ${MAX_TAGS} tags.`)
      .refine(
        (text) => parseTags(text).every((tag) => tag.length <= 30),
        'Each tag must be 30 characters or fewer.',
      ),
    status: z.enum(['draft', 'published']),
    subscriptionMode: z.enum(['free', 'paid']),
    price: z.string().trim(),
    body: z.object({
      html: z.string(),
      previewHtml: z.string(),
      wordCount: z
        .number()
        .min(MIN_BODY_WORDS, `Write at least ${MIN_BODY_WORDS} words before saving.`),
    }),
    coverImage: z
      .instanceof(File, { error: 'Choose a cover image.' })
      .refine((file) => file.type.startsWith('image/'), 'The cover must be an image (PNG, JPG, WebP…).')
      .refine((file) => file.size <= MAX_COVER_BYTES, 'The cover image must be 5 MB or smaller.'),
    coverAlt: z
      .string()
      .trim()
      .min(5, 'Describe the image in at least 5 characters (for screen readers).')
      .max(150, 'Keep the description under 150 characters.'),
    coverCaption: z.string().trim().max(200, 'Keep the caption under 200 characters.'),
  })
  // Rules that need two fields at once: a paid post needs a real price.
  .superRefine((values, ctx) => {
    if (values.subscriptionMode !== 'paid') return
    const amount = Number(values.price)
    if (values.price === '' || !Number.isInteger(amount) || amount < MIN_PAID_PRICE) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: `Enter a whole number of at least ${MIN_PAID_PRICE} ${BLOG_CURRENCY}.`,
      })
    }
  })

// The raw values while the admin is typing (before validation).
export interface CreateBlogFormValues {
  title: string
  subtitle: string
  slug: string
  excerpt: string
  category: string
  tags: string
  status: 'draft' | 'published'
  subscriptionMode: 'free' | 'paid'
  price: string
  body: BlogBodyValue
  coverImage: File | null
  coverAlt: string
  coverCaption: string
}

export type CreateBlogFormField = keyof CreateBlogFormValues

// One error message per field, e.g. { title: 'The title must be…' }.
export type CreateBlogFormErrors = Partial<Record<CreateBlogFormField, string>>

export const EMPTY_CREATE_BLOG_FORM: CreateBlogFormValues = {
  title: '',
  subtitle: '',
  slug: '',
  excerpt: '',
  category: '',
  tags: '',
  status: 'published',
  subscriptionMode: 'free',
  price: '',
  body: { html: '', previewHtml: '', wordCount: 0 },
  coverImage: null,
  coverAlt: '',
  coverCaption: '',
}

// Runs the schema and turns Zod's issue list into one message per field.
export function validateCreateBlogForm(values: CreateBlogFormValues) {
  const result = createBlogFormSchema.safeParse(values)
  if (result.success) return { data: result.data, errors: {} as CreateBlogFormErrors }

  const errors: CreateBlogFormErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as CreateBlogFormField | undefined
    if (field && !errors[field]) errors[field] = issue.message
  }
  return { data: null, errors }
}
