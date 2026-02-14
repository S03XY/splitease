export type {
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Settlement,
  PaymentRequest,
} from '@/generated/prisma/client'

export type { SplitType, GroupRole, SettlementStatus, PaymentRequestStatus } from '@/generated/prisma/client'

export interface Balance {
  userId: string
  userName: string | null
  walletAddress: string | null
  amount: number
}

export interface GroupBalance {
  groupId: string
  groupName: string
  balances: Balance[]
  totalOwed: number
  totalOwing: number
}

export interface SimplifiedDebt {
  fromUserId: string
  fromUserName: string | null
  fromWalletAddress: string | null
  toUserId: string
  toUserName: string | null
  toWalletAddress: string | null
  amount: number
}
