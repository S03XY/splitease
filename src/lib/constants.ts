export const APP_NAME = 'SplitEase'
export const APP_DESCRIPTION = 'Group Expense Splitter + Payment Requests on Tempo'

export const SPLIT_TYPE_LABELS = {
  EQUAL: 'Split Equally',
  EXACT: 'Exact Amounts',
  PERCENTAGE: 'By Percentage',
} as const

export const SETTLEMENT_STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
} as const

export const PAYMENT_REQUEST_STATUS_LABELS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
} as const
