"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowUpFromLine, Plus, Minus, ArrowDownToLine, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react"
import type { BackSafeWithdrawal, SafeBalances, BackSafeTransaction } from "@/lib/types"
import {
  saveWithdrawal,
  getWithdrawals,
  deleteWithdrawal,
  updateWithdrawal,
  getBackSafeTransactions,
  getBalances,
} from "@/lib/cash-store"

interface BackSafeWithdrawalProps {
  balances: SafeBalances
  onWithdrawal: () => void
  refreshTrigger?: number
}

export function BackSafeWithdrawalSection({ balances, onWithdrawal, refreshTrigger = 0 }: BackSafeWithdrawalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [withdrawals, setWithdrawals] = useState<BackSafeWithdrawal[]>([])
  const [transactions, setTransactions] = useState<BackSafeTransaction[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [editingWithdrawal, setEditingWithdrawal] = useState<BackSafeWithdrawal | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAmount, setEditAmount] = useState("")
  const [editReason, setEditReason] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [originalAmount, setOriginalAmount] = useState(0)
  const [currentBackSafe, setCurrentBackSafe] = useState(balances.backSafe)

  useEffect(() => {
    const loadData = async () => {
      const [withdrawalsData, transactionsData, latestBalances] = await Promise.all([
        getWithdrawals(),
        getBackSafeTransactions(),
        getBalances(),
      ])

      setWithdrawals(withdrawalsData)
      setTransactions(
        transactionsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      )
      setCurrentBackSafe(latestBalances.backSafe)
      setIsLoaded(true)
    }

    loadData()
  }, [refreshTrigger])

  useEffect(() => {
    setCurrentBackSafe(balances.backSafe)
  }, [balances.backSafe])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountNum = Number.parseFloat(amount) || 0

    if (amountNum > currentBackSafe) {
      alert("Cannot withdraw more than the current back safe balance")
      return
    }

    const withdrawal: BackSafeWithdrawal = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      amount: amountNum,
      reason,
      createdAt: new Date().toISOString(),
    }

    await saveWithdrawal(withdrawal)

    setAmount("")
    setReason("")
    setIsOpen(false)
    onWithdrawal()
  }

  const handleEditClick = (withdrawalId: string) => {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId)
    if (withdrawal) {
      setEditingWithdrawal(withdrawal)
      setEditAmount(withdrawal.amount.toString())
      setEditReason(withdrawal.reason)
      setOriginalAmount(withdrawal.amount)
      setIsEditOpen(true)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWithdrawal) return

    const newAmount = Number.parseFloat(editAmount) || 0
    const amountDifference = newAmount - originalAmount

    if (amountDifference > currentBackSafe) {
      alert("Cannot withdraw more than the current back safe balance")
      return
    }

    await updateWithdrawal(editingWithdrawal.id, newAmount, editReason)

    setIsEditOpen(false)
    setEditingWithdrawal(null)
    setEditAmount("")
    setEditReason("")
    onWithdrawal()
  }

  const handleDelete = async () => {
    if (!deleteId) return

    await deleteWithdrawal(deleteId)
    setDeleteId(null)
    onWithdrawal()
  }

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : activeTab === "deposits"
        ? transactions.filter((t) => t.type === "deposit")
        : transactions.filter((t) => t.type === "withdrawal")

  const recentTransactions = filteredTransactions.slice(0, 8)

  const totalDeposits = transactions.filter((t) => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions.filter((t) => t.type === "withdrawal").reduce((sum, t) => sum + t.amount, 0)

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <ArrowUpFromLine className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <CardTitle className="text-lg">Back Safe</CardTitle>
              <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(currentBackSafe)}</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                <Minus className="h-4 w-4" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw from Back Safe</DialogTitle>
                <DialogDescription>
                  Current balance: <span className="font-mono font-medium">{formatCurrency(currentBackSafe)}</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="withdrawAmount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="withdrawAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={currentBackSafe}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="pl-7 font-mono h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawReason">Reason for Withdrawal</Label>
                  <Textarea
                    id="withdrawReason"
                    placeholder="e.g., Bank deposit, Change for register..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1 h-11">
                    Confirm Withdrawal
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="h-11">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 bg-success/10 rounded-lg">
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Total In</span>
            </div>
            <p className="font-mono font-semibold mt-1">{formatCurrency(totalDeposits)}</p>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">Total Out</span>
            </div>
            <p className="font-mono font-semibold mt-1">{formatCurrency(totalWithdrawals)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs">
              Deposits
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs">
              Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`p-1.5 rounded-full ${t.type === "deposit" ? "bg-success/20" : "bg-destructive/20"}`}
                      >
                        {t.type === "deposit" ? (
                          <ArrowDownToLine className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <ArrowUpFromLine className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.reason}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-mono font-medium ${t.type === "deposit" ? "text-success" : "text-destructive"}`}
                      >
                        {t.type === "deposit" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </p>
                      {t.type === "withdrawal" && t.withdrawalId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditClick(t.withdrawalId!)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(t.withdrawalId!)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 bg-muted/30 rounded-full w-fit mx-auto mb-3">
                  {activeTab === "deposits" ? (
                    <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
                  ) : activeTab === "withdrawals" ? (
                    <ArrowUpFromLine className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "deposits"
                    ? "No deposits yet"
                    : activeTab === "withdrawals"
                      ? "No withdrawals yet"
                      : "No transactions yet"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ... existing dialogs ... */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Withdrawal</DialogTitle>
              <DialogDescription>Update the withdrawal details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="editAmount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="editAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    className="pl-7 font-mono h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editReason">Reason for Withdrawal</Label>
                <Textarea
                  id="editReason"
                  placeholder="e.g., Bank deposit, Change for register..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-11">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="h-11">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Withdrawal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this withdrawal? The amount will be added back to the back safe balance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
