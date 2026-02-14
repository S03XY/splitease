import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen mesh-gradient">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
