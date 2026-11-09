import { useState, type ReactNode } from 'react'
import { Check, Copy, Mail, MessageSquareText, Phone, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import authorPortrait from '../assets/author-potrait.png'

// Edit these to change the author details shown in the hero.
const AUTHOR = {
  name: 'Housnah Nansereko',
  role: 'Systems Architect & Independent Essayist. Founder of The Tech Report',
  email: 'housnahnansereko6@gmail.com',
  phoneDisplay: '0763 634 264',
  phoneHref: 'tel:+256763634264',
  whatsappHref: 'https://wa.me/256763634264',
  linkedinHref: 'https://www.linkedin.com/in/housnah-nansereko-9379a630a',
  xHandle: 'ssubbianne',
}

const chipClass =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-secondary/70 px-4 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

function ContactChip({ href, icon, children }: { href: string; icon?: ReactNode; children: ReactNode }) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      className={chipClass}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {icon}
      <span>{children}</span>
    </a>
  )
}

export function HeroSection() {
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(AUTHOR.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (e.g. non-HTTPS); the mailto link still works.
    }
  }

  return (
    <section className="grid items-start gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      {/* Portrait */}
      <figure className="flex flex-col">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <img
            src={authorPortrait}
            alt={`Portrait of ${AUTHOR.name}`}
            className="aspect-[4/5] w-full object-cover"
          />
          {/* soft fade into the page at the bottom */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background via-background/40 to-transparent"
          />
          {/* bottom line across the portrait */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-4 h-4 rounded-[3px] bg-background shadow-xs"
          />
        </div>
        <figcaption className="mt-5 px-1">
          <p className="text-sm text-foreground">{AUTHOR.name}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{AUTHOR.role}</p>
        </figcaption>
      </figure>

      {/* Text */}
      <div className="flex flex-col">
        <p className="flex items-center gap-3 text-xs font-medium tracking-[0.14em] text-[#8a3b2a] uppercase">
          Authorial Focus
          <span aria-hidden="true" className="h-px w-16 bg-border" />
        </p>

        <h1 className="mt-4 font-serif text-4xl leading-[1.08] font-normal tracking-tight text-foreground sm:text-5xl">
          Writing at the intersection of <em className="text-primary">quiet computing</em>,
          spatial architecture, and enduring software.
        </h1>

        <p className="mt-7 text-base leading-relaxed text-foreground/75">
          Over the last fifteen years, I have drafted distributed fault-tolerant topologies by day
          and examined the subtle erosion of cognitive silence by night. The Tech Report is an
          archival venue for unhurried prose—deliberate investigations into digital ergonomics,
          high-leverage simplicity, and technologies built to outlast market frenzy.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Every piece published here undergoes iterative revisions, typographic tuning, and
          empirical review. Supported solely through independent patronage and direct subscriber
          micro-patronage. No algorithms, no ad tracking, no performative urgency.
        </p>

        <div className="mt-10">
          <p className="text-xs font-medium tracking-[0.14em] text-foreground/70 uppercase">
            Direct Inquiries &amp; Corroboration
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className={`${chipClass} pr-1.5 hover:bg-secondary/70`}>
              <Mail aria-hidden="true" className="size-4 text-muted-foreground" />
              <a href={`mailto:${AUTHOR.email}`} className="hover:underline underline-offset-4">
                {AUTHOR.email}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={copyEmail}
                aria-label={copied ? 'Email copied' : 'Copy email address'}
                className="text-muted-foreground hover:bg-background"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>

            <ContactChip
              href={AUTHOR.phoneHref}
              icon={<Phone aria-hidden="true" className="size-4 text-muted-foreground" />}
            >
              {AUTHOR.phoneDisplay}
            </ContactChip>

            <ContactChip
              href={AUTHOR.whatsappHref}
              icon={<MessageSquareText aria-hidden="true" className="size-4 text-muted-foreground" />}
            >
              WhatsApp
            </ContactChip>

            <ContactChip
              href={AUTHOR.linkedinHref}
              icon={<Share2 aria-hidden="true" className="size-4 text-muted-foreground" />}
            >
              LinkedIn
            </ContactChip>

            <ContactChip href={`https://x.com/${AUTHOR.xHandle}`}>
              <span className="font-medium">X</span>
              <span className="ml-2">@{AUTHOR.xHandle}</span>
            </ContactChip>
          </div>
        </div>
      </div>
    </section>
  )
}
