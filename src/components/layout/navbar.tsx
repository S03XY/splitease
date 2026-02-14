'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { truncateAddress } from '@/lib/utils'

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

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4 animate-navbar-slide-down">
      <nav className="max-w-5xl mx-auto glass-strong rounded-2xl float-shadow-lg gradient-border">
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

              <div className="hidden sm:block w-px h-5 bg-border" />

              <Link
                href="/dashboard/profile"
                className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-xl hover:bg-accent/60 group"
              >
                <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold transition-transform duration-200 group-hover:scale-110">
                  {(user?.email?.address?.[0] || user?.wallet?.address?.[2] || '?').toUpperCase()}
                </div>
                <span className="max-w-30 truncate">
                  {user?.email?.address || truncateAddress(user?.wallet?.address || '')}
                </span>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="hidden sm:inline-flex rounded-xl border-border/50 hover:border-border text-xs h-8 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Sign Out
              </Button>

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
          mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
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
