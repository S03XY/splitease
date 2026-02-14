'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

function formatAmount(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num) || num === 0) return '$0'
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function LoginPage() {
  const { login, ready, authenticated } = usePrivy()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [stats, setStats] = useState<{
    totalSettled: string
    settlementsCount: number
    groupsCount: number
    usersCount: number
  } | null>(null)

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/dashboard')
    }
  }, [ready, authenticated, router])

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-6">
      {/* Theme toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-xl glass float-shadow text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        aria-label="Toggle theme"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block dark:hidden">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden dark:block">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-150 h-150 rounded-full bg-foreground/2 blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-100 h-100 rounded-full bg-foreground/1.5 blur-[120px]" />

      {/* Centered container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center gap-10 lg:gap-16 py-12">

        {/* Left — content */}
        <div className="w-full lg:w-1/2 max-w-md space-y-10">

          {/* Logo */}
          <div className="flex items-center gap-2.5 login-stagger-1">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center text-background text-sm font-bold">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight">
              <span className="gradient-text">Split</span>
              <span className="text-foreground">Ease</span>
            </span>
          </div>

          {/* Hero */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase login-stagger-2">
              On-chain expense splitting
            </p>
            <h1 className="text-4xl sm:text-[2.75rem] font-bold tracking-tight leading-[1.15] login-stagger-3">
              Split expenses.<br />
              Settle in seconds.
            </h1>
            <p className="text-muted-foreground leading-relaxed login-stagger-4">
              Your official finance partner for your unofficial exchanges.
              Split costs, settle debts, and move money instantly on-chain.
            </p>
          </div>

          {/* Total settled stat */}
          <div className="login-stagger-5">
            <div className="glass rounded-2xl float-shadow px-6 py-5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total settled on-chain</p>
              <p className="text-4xl font-bold tracking-tight gradient-text">
                {stats ? formatAmount(stats.totalSettled) : '$0.00'}
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                {[
                  { icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', label: 'Instant Settle' },
                  { icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', label: 'Fully Customised' },
                  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10', label: 'Non-custodial' },
                ].map((feat) => (
                  <span key={feat.label} className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
                      <path d={feat.icon} />
                    </svg>
                    {feat.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-5 login-stagger-6">
            <button
              onClick={login}
              disabled={!ready}
              className="w-full bg-foreground text-background py-3.5 px-6 rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer glow-primary hover:scale-[1.01] active:scale-[0.99]"
            >
              {ready ? 'Get Started' : 'Loading...'}
            </button>

            <div className="flex items-center justify-center gap-6 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                Secured by Privy
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Powered by Tempo
              </span>
            </div>
          </div>

        </div>

        {/* Right — vertical app flow */}
        <div className="hidden lg:flex w-1/2 items-center justify-center relative">
          <div className="w-80 space-y-3">

            {/* Card 1 — Add expense */}
            <div className="glass rounded-2xl float-shadow p-5 space-y-3.5 login-stagger-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" /><path d="M6 9h.01" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold">Dinner at Nobu</p>
                </div>
                <p className="text-base font-bold">$240.00</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>Paid by Alex</span>
                <span className="mx-1">&middot;</span>
                <span>Split equally</span>
              </div>
            </div>

            {/* Card 2 — Split breakdown */}
            <div className="glass rounded-2xl float-shadow p-5 space-y-3 login-stagger-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Split between</p>
              <div className="space-y-2.5">
                {[
                  { name: 'Alex', amount: '$80.00' },
                  { name: 'Sarah', amount: '$80.00' },
                  { name: 'You', amount: '$80.00' },
                ].map((person) => (
                  <div key={person.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                        {person.name[0]}
                      </div>
                      <span className="text-sm">{person.name}</span>
                    </div>
                    <span className="text-sm font-medium">{person.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3 — Settlement */}
            <div className="glass rounded-2xl float-shadow p-5 space-y-3 login-stagger-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center login-check-pop">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Settled on-chain</p>
                  <p className="text-[11px] text-muted-foreground">Confirmed in 1.2s</p>
                </div>
              </div>
              <div className="flex items-center justify-between glass-subtle rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-bold">Y</div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-bold">A</div>
                </div>
                <span className="text-sm font-bold text-foreground">$80.00</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 font-mono">
                <span>tx: 0x3f8a...c21d</span>
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-primary/60">confirmed</span>
              </div>
            </div>

          </div>

          {/* Live activity feed — looping notification tags */}
          <div className="absolute -inset-12 z-10 pointer-events-none">
            {[
              { text: 'Payment request · $10.00', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', pos: 'top-[5%] right-0', delay: 'feed-tag-1' },
              { text: 'Sarah joined Trip group', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', pos: 'top-[30%] -left-4', delay: 'feed-tag-2' },
              { text: 'Bill settled · $45.00', icon: 'M5 12l5 5L20 7', pos: 'bottom-[25%] right-0', delay: 'feed-tag-3' },
              { text: 'New group · Weekend Trip', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', pos: 'bottom-[5%] -left-4', delay: 'feed-tag-4' },
            ].map((tag) => (
              <div
                key={tag.text}
                className={`absolute ${tag.pos} ${tag.delay} glass rounded-full px-3 py-1.5 float-shadow flex items-center gap-2`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d={tag.icon} />
                </svg>
                <span className="text-[10px] font-medium whitespace-nowrap">{tag.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
