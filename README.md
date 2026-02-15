# SplitEase 💰

> Your official finance partner for your unofficial exchanges.

SplitEase is a blockchain-powered expense splitting platform that removes the awkwardness from money between friends. Built on the Tempo L1 blockchain, it provides transparent tracking, automated debt simplification, and instant on-chain settlement.

## 🎯 Problem Statement

Every day, millions of dollars change hands between friends, family members, and peers in informal transactions. Yet these casual exchanges create a silent financial strain:

- **$200B+** in untracked peer-to-peer transactions annually worldwide
- **68%** of people have uncollected debts from friends or family
- **73%** feel anxious requesting money from close friends
- **Average $650** owed per person across multiple informal debts
- **$150/year** lost per person to uncollected small debts

### The Core Problem
People feel uncomfortable asking friends to repay debts, especially small amounts. Current solutions either focus on individual payments (Venmo, Cash App) or require manual tracking (spreadsheets). There's no seamless, transparent, blockchain-verified system that combines automatic expense tracking, debt simplification, and instant settlement while preserving social relationships.

### SplitEase Solution
A decentralized platform that turns uncomfortable money conversations into seamless, trustless transactions through:
- ✅ Transparent on-chain expense tracking
- ✅ Automated debt simplification algorithms
- ✅ Instant settlement with AlphaUSD stablecoin
- ✅ Group expense management with multiple split types
- ✅ Privacy-preserving contact management

## 🚀 Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Authentication:** Privy (Email, Google, Wallet login)
- **Blockchain:** Tempo L1 Testnet (Chain ID: 42431)
- **Smart Contracts:** AlphaUSD stablecoin (ERC-20)
- **Web3:** viem for blockchain interactions
- **Database:** PostgreSQL (Supabase) + Prisma 7
- **UI Components:** shadcn/ui + Radix UI

## 📦 Features

### Core Features
- **🔐 Multi-Auth Support:** Email, Google, and Web3 wallet login via Privy
- **👥 Group Management:** Create groups, invite members, manage roles
- **💸 Expense Tracking:** Add expenses with multiple split types (Equal, Exact, Percentage)
- **🧮 Smart Debt Simplification:** Graph algorithm minimizes total transactions needed
- **⚡ On-Chain Settlement:** Instant blockchain payments with AlphaUSD
- **📊 Dashboard:** Real-time balance overview and transaction history
- **💰 Payment Requests:** Send and receive payment requests with optional messages
- **📇 Contact Management:** Save frequent contacts for quick access
- **🌓 Dark/Light Mode:** Beautiful glass-morphism UI in both themes
- **📱 Responsive Design:** Optimized for mobile, tablet, and desktop

### Blockchain Integration
- **Tempo Testnet RPC:** `https://rpc.moderato.tempo.xyz`
- **AlphaUSD Token:** `0x20c0000000000000000000000000000000000001`
- **Explorer:** `https://explore.tempo.xyz`
- **Real-time Balance:** Auto-refresh wallet balances every 10 seconds
- **Transaction Verification:** On-chain settlement with tx hash verification

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm/bun
- PostgreSQL database (Supabase recommended)
- Privy App ID

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd splitease
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```

   Configure `.env` with:
   ```env
   # Database (Supabase)
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://[USER]:[PASSWORD]@[HOST]:5432/postgres"

   # Privy Auth
   NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
   PRIVY_APP_SECRET="your-privy-app-secret"
   ```

4. **Database setup**
   ```bash
   ./setup.sh
   ```
   This will:
   - Generate Prisma client
   - Push schema to database
   - Create all tables
   - Build the Next.js app

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
splitease/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Login page
│   │   ├── dashboard/    # Dashboard, groups, requests, contacts, history
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── layout/       # Navbar, auth guard
│   │   ├── groups/       # Group cards, forms
│   │   ├── expenses/     # Expense forms, list
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuthFetch.ts
│   │   ├── useSettlement.ts
│   │   ├── usePaymentTransfer.ts
│   │   └── useTokenBalance.ts
│   ├── lib/              # Utilities
│   │   ├── tempo.ts      # Tempo chain config
│   │   ├── balance.ts    # Debt simplification algorithm
│   │   ├── prisma.ts     # Prisma client
│   │   └── auth.ts       # Server-side auth
│   └── generated/        # Prisma generated client
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration history
├── setup.sh              # Database setup script
├── reset-db.sh           # Database reset script
└── package.json
```

## 🗃️ Database Schema

### Core Models
- **User:** Authentication and wallet info
- **Group:** Expense groups with invite codes
- **GroupMember:** User-group relationships with roles
- **Expense:** Expense records with split types
- **ExpenseSplit:** Individual user splits
- **Settlement:** On-chain settlement records
- **PaymentRequest:** P2P payment requests
- **Contact:** User contact management

## 🔧 Scripts

```bash
# Development
npm run dev          # Start dev server

# Build
npm run build        # Build for production
npm run start        # Start production server

# Database
./setup.sh           # Setup database schema
./reset-db.sh        # Reset database (WARNING: deletes all data)

# Linting
npm run lint         # Run ESLint
```

## 🌐 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

**Important:** The build command automatically includes `prisma generate`:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

## 🎨 Design System

### Theme Tokens
- **Primary:** Main brand color (emerald in light, soft white in dark)
- **Destructive:** Error/warning states
- **Muted:** Secondary text
- **Accent:** Interactive elements

### Components
- Glass-morphism cards (`glass`, `glass-strong`)
- Floating shadows (`float-shadow`, `float-shadow-lg`)
- Gradient text (`gradient-text`)
- Rounded UI (`rounded-xl`, `rounded-2xl`)

## 🔐 Security

- ✅ Non-custodial: Users control their own wallets
- ✅ Server-side auth with Privy ID verification
- ✅ Protected API routes with middleware
- ✅ Input validation on all forms
- ✅ Prepared statements (SQL injection protection)
- ✅ HTTPS only in production

## 🧪 Key Algorithms

### Debt Simplification
The app uses a graph-based algorithm to minimize transactions:
1. Calculate net balance for each user
2. Separate debtors and creditors
3. Iteratively match largest debtor with largest creditor
4. Reduces O(n²) transactions to O(n)

Example: Instead of A→B ($10), B→C ($5), C→A ($5), the algorithm simplifies to just A→B ($5), A→C ($5).

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase pooled connection (port 6543) | ✅ |
| `DIRECT_URL` | Supabase direct connection (port 5432) | ✅ |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy application ID | ✅ |
| `PRIVY_APP_SECRET` | Privy app secret (server-side) | ✅ |

## 🤝 Contributing

This is a hackathon/educational project. Feel free to fork and modify!

## 📄 License

MIT License - feel free to use this project as a learning resource.

## 🙏 Acknowledgments

- **Tempo Blockchain** for the testnet and AlphaUSD token
- **Privy** for seamless Web3 authentication
- **Vercel** for Next.js and hosting platform
- **Supabase** for PostgreSQL hosting

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Blockchain, and lots of ☕
