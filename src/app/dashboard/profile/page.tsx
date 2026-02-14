'use client'

import { useEffect, useState } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { formatCurrency } from '@/lib/utils'
import { tempoTestnet, STABLECOINS, ERC20_ABI, DEFAULT_STABLECOIN } from '@/lib/tempo'
import { toast } from 'sonner'

interface ProfileData {
  user: {
    id: string
    name: string | null
    email: string | null
    walletAddress: string | null
    avatar: string | null
    createdAt: string
  }
  stats: {
    groupsJoined: number
    expensesCreated: number
    settlementsCount: number
    totalSettled: number
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [alphaBalance, setAlphaBalance] = useState<string | null>(null)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch('/api/users/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)

          if (data.user.walletAddress) {
            const publicClient = createPublicClient({
              chain: tempoTestnet,
              transport: http(),
            })
            const walletAddr = data.user.walletAddress as `0x${string}`
            const [balance, decimals] = await Promise.all([
              publicClient.readContract({
                address: DEFAULT_STABLECOIN,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddr],
              }),
              publicClient.readContract({
                address: DEFAULT_STABLECOIN,
                abi: ERC20_ABI,
                functionName: 'decimals',
              }),
            ])
            setAlphaBalance(formatUnits(balance, decimals))
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [authFetch])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="glass rounded-2xl float-shadow p-8 text-center">
        <p className="text-muted-foreground">Failed to load profile.</p>
      </div>
    )
  }

  const { user, stats } = profile
  const initial = (user.name?.[0] || user.email?.[0] || '?').toUpperCase()

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Profile</h1>

      {/* User Info Card */}
      <div className="glass rounded-2xl float-shadow p-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center text-2xl font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate">
              {user.name || 'No name set'}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {user.email || 'No email'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Groups', value: stats.groupsJoined },
          { label: 'Expenses', value: stats.expensesCreated },
          { label: 'Settlements', value: stats.settlementsCount },
          { label: 'Total Settled', value: formatCurrency(stats.totalSettled) },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl float-shadow p-5 text-center">
            <p className="text-2xl font-bold gradient-text">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Account Details */}
      <div className="glass rounded-2xl float-shadow p-8 space-y-4">
        <h3 className="font-semibold">Account Details</h3>

        {user.walletAddress && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Balance</p>
              <div className="bg-secondary rounded-xl p-4">
                <p className="text-lg font-bold gradient-text">
                  {alphaBalance !== null
                    ? formatCurrency(parseFloat(alphaBalance))
                    : '...'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">AlphaUSD</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
              <div className="flex items-center gap-2 bg-secondary rounded-xl p-3">
                <code className="text-xs font-mono break-all flex-1">
                  {user.walletAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(user.walletAddress!)}
                  className="text-xs text-foreground hover:underline shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </>
        )}

        {!user.walletAddress && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Wallet</p>
            <p className="text-sm text-muted-foreground/70">No wallet connected</p>
          </div>
        )}
      </div>
    </div>
  )
}
