'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ThemeProvider, useTheme } from 'next-themes'
import { tempoTestnet } from '@/lib/tempo'

function PrivyWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          accentColor: '#a1a1aa',
          logo: '/logo.png',
        },
        loginMethods: ['email', 'google', 'wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: tempoTestnet,
        supportedChains: [tempoTestnet],
      }}
    >
      {children}
    </PrivyProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <PrivyWithTheme>{children}</PrivyWithTheme>
    </ThemeProvider>
  )
}
