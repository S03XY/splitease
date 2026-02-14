import type { SimplifiedDebt } from '@/types'

interface ExpenseData {
  paidById: string
  amount: number
  splits: { userId: string; amount: number }[]
}

interface SettlementData {
  fromUserId: string
  toUserId: string
  amount: number
  status: string
}

interface UserInfo {
  id: string
  name: string | null
  walletAddress: string | null
}

/**
 * Calculate net balances for each user in a group.
 * Positive = others owe you, Negative = you owe others.
 */
export function calculateNetBalances(
  expenses: ExpenseData[],
  settlements: SettlementData[]
): Map<string, number> {
  const balances = new Map<string, number>()

  for (const expense of expenses) {
    // Payer gets credited
    const payerBalance = balances.get(expense.paidById) || 0
    balances.set(expense.paidById, payerBalance + expense.amount)

    // Each person in the split is debited
    for (const split of expense.splits) {
      const userBalance = balances.get(split.userId) || 0
      balances.set(split.userId, userBalance - split.amount)
    }
  }

  // Factor in confirmed settlements
  for (const settlement of settlements) {
    if (settlement.status !== 'CONFIRMED') continue

    const fromBalance = balances.get(settlement.fromUserId) || 0
    balances.set(settlement.fromUserId, fromBalance + settlement.amount)

    const toBalance = balances.get(settlement.toUserId) || 0
    balances.set(settlement.toUserId, toBalance - settlement.amount)
  }

  return balances
}

/**
 * Simplify debts using the greedy algorithm.
 * Minimizes number of transactions needed.
 */
export function simplifyDebts(
  netBalances: Map<string, number>,
  users: Map<string, UserInfo>
): SimplifiedDebt[] {
  const creditors: { userId: string; amount: number }[] = []
  const debtors: { userId: string; amount: number }[] = []

  for (const [userId, balance] of netBalances) {
    const rounded = Math.round(balance * 100) / 100
    if (rounded > 0.01) {
      creditors.push({ userId, amount: rounded })
    } else if (rounded < -0.01) {
      debtors.push({ userId, amount: Math.abs(rounded) })
    }
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const debts: SimplifiedDebt[] = []
  let i = 0
  let j = 0

  while (i < creditors.length && j < debtors.length) {
    const transferAmount = Math.min(creditors[i].amount, debtors[j].amount)
    const rounded = Math.round(transferAmount * 100) / 100

    if (rounded > 0.01) {
      const fromUser = users.get(debtors[j].userId)
      const toUser = users.get(creditors[i].userId)

      debts.push({
        fromUserId: debtors[j].userId,
        fromUserName: fromUser?.name || null,
        fromWalletAddress: fromUser?.walletAddress || null,
        toUserId: creditors[i].userId,
        toUserName: toUser?.name || null,
        toWalletAddress: toUser?.walletAddress || null,
        amount: rounded,
      })
    }

    creditors[i].amount -= transferAmount
    debtors[j].amount -= transferAmount

    if (creditors[i].amount < 0.01) i++
    if (debtors[j].amount < 0.01) j++
  }

  return debts
}
