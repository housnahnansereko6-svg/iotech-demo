// A "type" describes the shape of one blog post. TypeScript will warn us
// if a post below is missing a field or has the wrong kind of value.
export interface BlogPost {
  id: string
  title: string
  excerpt: string // the short teaser shown on the card
  category: string
  publishedAt: string // ISO date, e.g. '2026-10-28'
  readMinutes: number
  image: string // cover photo shown at the top of the card
  price: number // in UGX. 0 means the post is free
}

// Sample posts for now. Later these will come from the Convex database
// (created from the admin dashboard) instead of being typed in here.
export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'why-cybersecurity-matters',
    title: 'Why Cybersecurity Matters More Than Ever',
    excerpt:
      'From mobile money to school portals, more of our lives run online every year. Here is why security is everyone’s job, not just the IT department’s.',
    category: 'Cybersecurity',
    publishedAt: '2026-11-10',
    readMinutes: 8,
    image: '/cybersecurity.png',
    price: 0,
  },
  {
    id: 'growing-privacy-concern',
    title: 'The Growing Concern of Privacy in a Connected World',
    excerpt:
      'Apps know where we go, what we buy and who we talk to. A look at how our data is collected, why it matters, and simple steps to take back control.',
    category: 'Privacy',
    publishedAt: '2026-10-28',
    readMinutes: 9,
    image: '/privacy.png',
    price: 0,
  },
  {
    id: 'ai-and-automation',
    title: 'AI and Automation: What Changes and What Stays Human',
    excerpt:
      'AI tools can now write code, sort emails and answer customers. What that means for jobs, for learning, and for the skills worth building today.',
    category: 'AI & Automation',
    publishedAt: '2026-10-14',
    readMinutes: 10,
    image: '/ai-automation.png',
    price: 800,
  },
  {
    id: 'securing-ai-systems',
    title: 'AI Security: How to Protect the Systems That Think',
    excerpt:
      'Prompt injection, data poisoning and leaked training data are new kinds of attacks. A beginner’s guide to how AI systems get attacked and how to defend them.',
    category: 'AI Security',
    publishedAt: '2026-09-30',
    readMinutes: 12,
    image: '/ai-security.png',
    price: 1000,
  },
]
