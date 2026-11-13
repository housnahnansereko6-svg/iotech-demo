import { useState, type ReactNode } from 'react'
import { Check, Copy, Mail, Phone } from 'lucide-react'
import { LinkedinLogoIcon, WhatsappLogoIcon, XLogoIcon } from '@phosphor-icons/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import authorPortrait from '../assets/author-potrait1.png'


const AUTHOR = {
  name: 'Housnah Nansereko',
  role: 'Cybersecurity Enthusiast · Final-year Computer Science student, Makerere University',
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
    // buttonVariants() gives a plain link the exact look of our <Button>,
    // without turning it into a <button> (a link that goes somewhere should stay an <a>).
    <a
      href={href}
      className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'gap-2 px-4 font-normal')}
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
          From <em className="text-primary">curiosity</em> to creation: my journey in computer science.
        </h1>

        <p className="mt-7 text-base leading-relaxed text-foreground/75">
          I&rsquo;m Housnah Nansereko, a Computer Science student at Makerere University, with
          interests spanning software engineering, cybersecurity, data science and artificial
          intelligence.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          I&rsquo;m fascinated by how technology works beneath the surface how systems are
          designed, how problems are solved, and how ideas become things people can actually use. My
          interests have taken me through software development, data analytics and machine learning,
          while continually drawing me towards new areas of computing.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          I&rsquo;m continually learning, experimenting and broadening my understanding of the field,
          with the hope of contributing to meaningful technological solutions and ideas.
        </p>

        <div className="mt-10">
          <p className="text-xs font-medium tracking-[0.14em] text-foreground/70 uppercase">
            Get in Touch
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
              icon={<WhatsappLogoIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
            >
              WhatsApp
            </ContactChip>

            <ContactChip
              href={AUTHOR.linkedinHref}
              icon={<LinkedinLogoIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
            >
              LinkedIn
            </ContactChip>

            <ContactChip
              href={`https://x.com/${AUTHOR.xHandle}`}
              icon={<XLogoIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
            >
              @{AUTHOR.xHandle}
            </ContactChip>
          </div>
        </div>
      </div>
    </section>
  )
}
