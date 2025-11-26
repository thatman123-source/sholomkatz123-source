import { createClient } from "@/lib/supabase/client"
import type { DailyEntry, BackSafeWithdrawal, SafeBalances, MonthlyArchive, BackSafeTransaction } from "./types"

const supabase = createClient()

// Get current user
async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getEntries(): Promise<DailyEntry[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching entries:", error)
    return []
  }

  return (
    data?.map((row) => ({
      id: row.id,
      date: row.date,
      cashIn: row.cash_in,
      deposited: row.deposited,
      toBackSafe: row.to_back_safe,
      leftInFront: row.actual_left_in_front,
      expectedFrontSafe: row.left_in_front || 0,
      difference: row.difference,
      isBalanced: Math.abs(row.difference) < 0.01,
      notes: row.discrepancy_reason,
      manuallyApproved: row.manually_approved,
      approvalNote: row.approval_note,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) || []
  )
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase.from("daily_entries").upsert({
    id: entry.id,
    user_id: user.id,
    date: entry.date,
    cash_in: entry.cashIn,
    deposited: entry.deposited,
    to_back_safe: entry.toBackSafe,
    actual_left_in_front: entry.leftInFront,
    left_in_front: entry.expectedFrontSafe,
    difference: entry.difference,
    discrepancy_reason: entry.notes,
    manually_approved: entry.manuallyApproved || false,
    approval_note: entry.approvalNote,
    approved_at: entry.approvedAt,
    updated_at: new Date().toISOString(),
  })

  if (error) console.error("Error saving entry:", error)
}

export async function deleteEntry(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase.from("daily_entries").delete().eq("id", id).eq("user_id", user.id)

  if (error) console.error("Error deleting entry:", error)
}

export async function approveEntry(id: string, approvalNote: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase
    .from("daily_entries")
    .update({
      manually_approved: true,
      approval_note: approvalNote,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) console.error("Error approving entry:", error)
}

export async function removeApproval(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase
    .from("daily_entries")
    .update({
      manually_approved: false,
      approval_note: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) console.error("Error removing approval:", error)
}

export async function getWithdrawals(): Promise<BackSafeWithdrawal[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("back_safe_withdrawals")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching withdrawals:", error)
    return []
  }

  return (
    data?.map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      reason: row.reason,
      createdAt: row.created_at,
    })) || []
  )
}

export async function saveWithdrawal(withdrawal: BackSafeWithdrawal): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase.from("back_safe_withdrawals").upsert({
    id: withdrawal.id,
    user_id: user.id,
    date: withdrawal.date,
    amount: withdrawal.amount,
    reason: withdrawal.reason,
    updated_at: new Date().toISOString(),
  })

  if (error) console.error("Error saving withdrawal:", error)

  // Also save as a transaction
  await saveBackSafeTransaction({
    id: crypto.randomUUID(),
    date: withdrawal.date,
    type: "withdrawal",
    amount: withdrawal.amount,
    reason: withdrawal.reason,
    withdrawalId: withdrawal.id,
    createdAt: new Date().toISOString(),
  })
}

export async function deleteWithdrawal(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase.from("back_safe_withdrawals").delete().eq("id", id).eq("user_id", user.id)

  if (error) console.error("Error deleting withdrawal:", error)

  // Delete associated transaction
  await supabase.from("back_safe_transactions").delete().eq("withdrawal_id", id)
}

export async function updateWithdrawal(id: string, amount: number, reason: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase
    .from("back_safe_withdrawals")
    .update({ amount, reason, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) console.error("Error updating withdrawal:", error)
}

export async function getBalances(): Promise<SafeBalances> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      frontSafe: 0,
      backSafe: 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  const [entriesData, withdrawalsData, transactionsData] = await Promise.all([
    getEntries(),
    getWithdrawals(),
    getBackSafeTransactions(),
  ])

  // Calculate front safe from latest entry
  const latestEntry = entriesData[0]
  const frontSafe = latestEntry?.leftInFront ?? 0

  // Calculate back safe from transactions
  let backSafe = 0
  transactionsData.forEach((t) => {
    if (t.type === "deposit") backSafe += t.amount
    if (t.type === "withdrawal") backSafe -= t.amount
  })

  return {
    frontSafe,
    backSafe,
    lastUpdated: new Date().toISOString(),
  }
}

export async function calculateExpectedFrontSafe(
  previousBalance: number,
  cashIn: number,
  deposited: number,
  toBackSafe: number,
): Promise<number> {
  return previousBalance + cashIn - deposited - toBackSafe
}

export async function getLastEntryForDate(date: string): Promise<DailyEntry | undefined> {
  const entries = await getEntries()
  return entries.find((e) => e.date === date)
}

export async function getPreviousDayBalance(): Promise<number> {
  const entries = await getEntries()
  if (entries.length === 0) {
    const balances = await getBalances()
    return balances.frontSafe
  }
  return entries[0].leftInFront
}

export async function getBackSafeTransactions(): Promise<BackSafeTransaction[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("back_safe_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching transactions:", error)
    return []
  }

  return (
    data?.map((row) => ({
      id: row.id,
      date: row.date,
      type: row.type,
      amount: row.amount,
      reason: row.reason,
      fromEntryId: row.entry_id,
      withdrawalId: row.withdrawal_id,
      createdAt: row.created_at,
    })) || []
  )
}

export async function saveBackSafeTransaction(transaction: BackSafeTransaction): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase.from("back_safe_transactions").insert({
    id: transaction.id,
    user_id: user.id,
    date: transaction.date,
    type: transaction.type,
    amount: transaction.amount,
    reason: transaction.reason,
    entry_id: transaction.fromEntryId,
    withdrawal_id: transaction.withdrawalId,
  })

  if (error) console.error("Error saving transaction:", error)
}

export async function getBackSafeTransactionsForMonth(month: string): Promise<BackSafeTransaction[]> {
  const transactions = await getBackSafeTransactions()
  return transactions.filter((t) => t.date.startsWith(month))
}

export async function getArchives(): Promise<MonthlyArchive[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("monthly_archives")
    .select("*")
    .eq("user_id", user.id)
    .order("month", { ascending: false })

  if (error) {
    console.error("Error fetching archives:", error)
    return []
  }

  return (
    data?.map((row) => ({
      month: row.month,
      startingFrontSafe: row.starting_front_safe,
      startingBackSafe: row.starting_back_safe,
      endingFrontSafe: row.ending_front_safe,
      endingBackSafe: row.ending_back_safe,
      entries: [],
      withdrawals: [],
      isClosed: row.is_closed,
      closedAt: row.closed_at,
    })) || []
  )
}

export async function saveArchive(archive: MonthlyArchive): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const { error } = await supabase.from("monthly_archives").upsert({
    user_id: user.id,
    month: archive.month,
    starting_front_safe: archive.startingFrontSafe,
    starting_back_safe: archive.startingBackSafe,
    ending_front_safe: archive.endingFrontSafe,
    ending_back_safe: archive.endingBackSafe,
    is_closed: archive.isClosed,
    closed_at: archive.closedAt,
    updated_at: new Date().toISOString(),
  })

  if (error) console.error("Error saving archive:", error)
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function getEntriesForMonth(month: string): Promise<DailyEntry[]> {
  const entries = await getEntries()
  return entries.filter((e) => e.date.startsWith(month))
}

export async function getWithdrawalsForMonth(month: string): Promise<BackSafeWithdrawal[]> {
  const withdrawals = await getWithdrawals()
  return withdrawals.filter((w) => w.date.startsWith(month))
}

export async function closeMonth(month: string): Promise<MonthlyArchive | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const [balances, entries, withdrawals, archives] = await Promise.all([
    getBalances(),
    getEntriesForMonth(month),
    getWithdrawalsForMonth(month),
    getArchives(),
  ])

  if (entries.length === 0) return null

  const previousArchive = archives.find((a) => a.month < month && a.isClosed)

  const startingFrontSafe = previousArchive?.endingFrontSafe ?? 0
  const startingBackSafe = previousArchive?.endingBackSafe ?? 0

  const archive: MonthlyArchive = {
    month,
    startingFrontSafe,
    startingBackSafe,
    endingFrontSafe: balances.frontSafe,
    endingBackSafe: balances.backSafe,
    entries,
    withdrawals,
    isClosed: true,
    closedAt: new Date().toISOString(),
  }

  await saveArchive(archive)
  return archive
}

export async function getMonthStartingBalances(month: string): Promise<{ frontSafe: number; backSafe: number }> {
  const archives = await getArchives()
  const previousArchive = archives
    .filter((a) => a.month < month && a.isClosed)
    .sort((a, b) => b.month.localeCompare(a.month))[0]

  if (previousArchive) {
    return {
      frontSafe: previousArchive.endingFrontSafe,
      backSafe: previousArchive.endingBackSafe,
    }
  }

  return { frontSafe: 0, backSafe: 0 }
}

export async function getAvailableMonths(): Promise<string[]> {
  const [entries, archives] = await Promise.all([getEntries(), getArchives()])
  const months = new Set<string>()

  months.add(getCurrentMonth())

  entries.forEach((e) => months.add(e.date.slice(0, 7)))
  archives.forEach((a) => months.add(a.month))

  return Array.from(months).sort((a, b) => b.localeCompare(a))
}

// Supabase handles persistence automatically through entry/transaction saves
export async function saveBalances(_balances: SafeBalances): Promise<void> {
  // Balances are calculated from entries and transactions, no explicit save needed
  return Promise.resolve()
}
