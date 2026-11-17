import { FileText, ReceiptText, Users, type LucideIcon } from 'lucide-react'

export const PATHS = {
  LANDING: '/',
  BLOG_DETAILS: '/blog',
  ADMIN: '/admin',
  ADMIN_BLOGS: '/admin/blogs',
  ADMIN_TRANSACTIONS: '/admin/transactions',
  ADMIN_USERS: '/admin/users',
} as const

export type AppPath = (typeof PATHS)[keyof typeof PATHS]

// The address of ONE blog post: '/blog' with the post's id as a search param.
// `${string}` means "any text can go here".
export type BlogDetailsPath = `/blog?${string}`

// Every address navigate() is allowed to go to: the fixed pages above + any blog post.
export type NavigablePath = AppPath | BlogDetailsPath


//   blogDetailsPath('why-cybersecurity-matters')  ->  '/blog?id=why-cybersecurity-matters'

export function blogDetailsPath(id: string): BlogDetailsPath {
  const params = new URLSearchParams({ id })
  return `${PATHS.BLOG_DETAILS}?${params.toString()}`
}

export interface AdminNavItem {
  label: string
  path: AppPath
  icon: LucideIcon
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    label: 'Blogs',
    path: PATHS.ADMIN_BLOGS,
    icon: FileText,
  },
  {
    label: 'Transactions',
    path: PATHS.ADMIN_TRANSACTIONS,
    icon: ReceiptText,
  },
  {
    label: 'Users',
    path: PATHS.ADMIN_USERS,
    icon: Users,
  },
] as const
