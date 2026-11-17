import { useState, type FormEvent } from 'react'
import { AtSign, CheckCircle2, Lock, Smartphone, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The two mobile money networks a reader can pay with.
type Network = 'mtn' | 'airtel'

// The two tabs at the top of the card.
type Mode = 'new' | 'restore'

const NETWORKS: { id: Network; label: string; dot: string }[] = [
  { id: 'mtn', label: 'MTN MoMo', dot: 'bg-amber-400' },
  { id: 'airtel', label: 'Airtel Money', dot: 'bg-red-500' },
]

// Very small checks. They catch typos, not every possible bad value.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Ugandan mobile numbers: 9 digits after +256, or 10 digits starting with 0.
const PHONE_PATTERN = /^(0\d{9}|\d{9})$/

interface PaywallProps {
  price: number // in UGX
}

export function Paywall({ price }: PaywallProps) {
  const [mode, setMode] = useState<Mode>('new')
  const [network, setNetwork] = useState<Network>('mtn')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  // After a successful submit we swap the form for a "check your phone" message.
  const [submitted, setSubmitted] = useState(false)

  const formattedPrice = `UGX ${price.toLocaleString('en-US')}`

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSubmitted(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page.
    event.preventDefault()

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (mode === 'new') {
      const digits = phone.replace(/\s/g, '')
      if (!PHONE_PATTERN.test(digits)) {
        setError('Please enter a valid mobile money number, e.g. 0772 123 456.')
        return
      }
    }

    // TODO: call the Convex payment action here (iotec collection request).
    setError(null)
    setSubmitted(true)
  }

  const fieldClass =
    'flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20'

  return (
    // On phones the card is one narrow column. From tablet size up (sm:) it gets
    // wider and puts things side by side, so the whole card fits on one screen.
    <section
      aria-labelledby="paywall-title"
      className="mx-auto w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl shadow-stone-900/5 sm:max-w-2xl sm:p-6"
    >
      {/* Header: lock + title on one line, price underneath */}
      <div className="flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600">
            <Lock aria-hidden="true" className="size-4" />
          </span>
          <h2
            id="paywall-title"
            className="font-serif text-xl leading-tight font-normal tracking-tight text-foreground"
          >
            Support Independent Writing &amp; Unlock Full Blog
          </h2>
        </div>
        <p className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1">
          <span className="text-[0.6rem] font-medium tracking-widest text-stone-600 uppercase">
            One-time reader contribution
          </span>
          <span className="font-serif text-base font-semibold text-amber-700">{formattedPrice}</span>
        </p>
      </div>

      {/* Tabs */}
      <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary p-1">
        <TabButton active={mode === 'new'} onClick={() => switchMode('new')}>
          New Access (Mobile Money)
        </TabButton>
        <TabButton active={mode === 'restore'} onClick={() => switchMode('restore')}>
          Returning Reader (Restore)
        </TabButton>
      </div>

      {submitted ? (
        <SuccessMessage mode={mode} onBack={() => setSubmitted(false)} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {mode === 'new' && (
            <fieldset>
              <legend className="text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
                Select mobile money network
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={network === n.id}
                    onClick={() => setNetwork(n.id)}
                    className={cn(
                      'flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30',
                      network === n.id
                        ? 'border-blue-600 bg-blue-50 font-semibold text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    <span aria-hidden="true" className={cn('size-2 rounded-full', n.dot)} />
                    {n.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Email and phone sit side by side from tablet size up. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={cn(mode === 'restore' && 'sm:col-span-2')}>
              <label htmlFor="paywall-email" className="text-xs font-medium text-foreground">
                Your Email Address
              </label>
              <div className={cn(fieldClass, 'mt-1.5')}>
                <AtSign aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <input
                  id="paywall-email"
                  type="email"
                  autoComplete="email"
                  placeholder="johndoe@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                {mode === 'new'
                  ? 'Used to restore your reading pass later.'
                  : 'Enter the email you used when you first paid for this blog.'}
              </p>
            </div>

            {mode === 'new' && (
              <div>
                <label htmlFor="paywall-phone" className="text-xs font-medium text-foreground">
                  Mobile Money Phone Number
                </label>
                <div className={cn(fieldClass, 'mt-1.5 px-0')}>
                  <span className="flex h-full shrink-0 items-center border-r border-input px-3 text-xs font-medium whitespace-nowrap text-foreground">
                    +256 (UG)
                  </span>
                  <Smartphone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="paywall-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="772 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-full w-full min-w-0 bg-transparent pr-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">
                  Standard network tariffs apply.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-10 w-full gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white shadow-md shadow-blue-700/20 hover:bg-blue-800"
          >
            <Lock aria-hidden="true" className="size-4" />
            {mode === 'new' ? 'Pay via Mobile Money & Read Now' : 'Restore My Access'}
          </Button>

          {mode === 'new' && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[0.7rem] leading-relaxed text-muted-foreground">
              <Zap aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p>
                <strong className="font-semibold text-foreground">Instant Handset Prompt:</strong>{' '}
                a secure USSD pop-up will appear on your phone. Enter your Mobile Money PIN to
                approve.
              </p>
            </div>
          )}
        </form>
      )}
    </section>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30',
        active
          ? 'bg-background text-blue-700 shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function SuccessMessage({ mode, onBack }: { mode: Mode; onBack: () => void }) {
  return (
    <div role="status" className="mt-4 flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
      <CheckCircle2 aria-hidden="true" className="size-8 text-emerald-600" />
      <p className="mt-3 font-semibold text-emerald-900">
        {mode === 'new' ? 'Check your phone' : 'Check your inbox'}
      </p>
      <p className="mt-1 text-sm text-emerald-800">
        {mode === 'new'
          ? 'Approve the Mobile Money prompt with your PIN. The full blog will unlock once payment is confirmed.'
          : 'If this email has a reading pass, we will restore your access shortly.'}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 text-xs font-medium text-emerald-800 underline underline-offset-4"
      >
        Go back
      </button>
    </div>
  )
}
