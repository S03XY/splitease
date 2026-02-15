'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { truncateAddress } from '@/lib/utils'
import { useTokenBalance } from '@/hooks/useTokenBalance'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/groups', label: 'Groups' },
  { href: '/dashboard/requests', label: 'Requests' },
  { href: '/dashboard/contacts', label: 'Contacts' },
  { href: '/dashboard/history', label: 'History' },
]

export function Navbar() {
  const { user, logout } = usePrivy()
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { balance, loading: balanceLoading } = useTokenBalance()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4 pointer-events-none animate-navbar-slide-down">
      <nav className="max-w-5xl mx-auto glass-strong rounded-2xl float-shadow-lg gradient-border pointer-events-auto">
        <div className="px-4 sm:px-5 py-3">
          <div className="flex justify-between items-center">
            {/* Logo + Nav links */}
            <div className="flex items-center gap-1">
              <Link href="/dashboard" className="text-lg font-bold mr-2 sm:mr-4 group">
                <span className="gradient-text transition-opacity group-hover:opacity-80">Split</span>
                <span className="text-foreground transition-opacity group-hover:opacity-80">Ease</span>
              </Link>

              {/* Desktop nav */}
              <div className="hidden sm:flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative text-sm px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
                      isActive(link.href)
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive(link.href) && (
                      <span className="absolute inset-0 bg-background rounded-lg float-shadow animate-nav-pill" />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Toggle theme"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="block dark:hidden"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden dark:block"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </button>

              {/* AlphaUSD Balance */}
              {balance && (
                <>
                  <div className="hidden sm:block w-px h-5 bg-border" />
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5">
                    <span className="text-xs font-bold text-primary tabular-nums">
                      {parseFloat(balance).toFixed(2)}
                    </span>
                    <span className="text-[9px] text-primary/50 font-medium">AlphaUSD</span>
                  </div>
                </>
              )}

              <div className="hidden sm:block w-px h-5 bg-border" />

              {/* Profile Dropdown */}
              <div className="hidden sm:block relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-[10px] font-bold transition-all duration-200 hover:scale-110 active:scale-95"
                  title={user?.email?.address || truncateAddress(user?.wallet?.address || '')}
                >
                  {(user?.email?.address?.[0] || user?.wallet?.address?.[2] || '?').toUpperCase()}
                </button>

                {profileOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 rounded-xl float-shadow border border-border overflow-hidden z-50 animate-fade-in-up" style={{ backgroundColor: 'var(--background)' }}>
                      <div className="p-3 border-b border-border/30">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium truncate mt-0.5">
                          {user?.email?.address || truncateAddress(user?.wallet?.address || '')}
                        </p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </Link>
                        <button
                          onClick={() => { logout(); setProfileOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200"
                aria-label="Toggle menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {mobileOpen ? (
                    <>
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </>
                  ) : (
                    <>
                      <path d="M4 8h16" />
                      <path d="M4 16h16" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

      </nav>

      {/* Mobile menu — outside nav to avoid border-radius clipping */}
      <div
        className={`sm:hidden transition-all duration-300 ease-out mt-2 ${
          mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="max-w-5xl mx-auto glass rounded-2xl float-shadow p-2 space-y-0.5" style={{ backgroundColor: 'var(--background)' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                isActive(link.href)
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="mx-2 border-t border-border/50" />

          {/* Mobile AlphaUSD Balance */}
          {balance && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-primary/80">AlphaUSD Balance</span>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">
                {parseFloat(balance).toFixed(2)}
              </span>
            </div>
          )}

          <Link
            href="/dashboard/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold">
              {(user?.email?.address?.[0] || user?.wallet?.address?.[2] || '?').toUpperCase()}
            </div>
            <span className="truncate">
              {user?.email?.address || truncateAddress(user?.wallet?.address || '')}
            </span>
          </Link>
          <button
            onClick={() => { logout(); setMobileOpen(false) }}
            className="w-full px-4 py-3 rounded-xl text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
