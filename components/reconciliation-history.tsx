"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  History,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckSquare,
  XCircle,
} from "lucide-react"
import type { DailyEntry } from "@/lib/types"
import { getEntries, deleteEntry, approveEntry, removeApproval } from "@/lib/cash-store"

interface ReconciliationHistoryProps {
  refreshTrigger: number
  onEdit?: (entry: DailyEntry) => void
}

export function ReconciliationHistory({ refreshTrigger, onEdit }: ReconciliationHistoryProps) {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [entryToApprove, setEntryToApprove] = useState<DailyEntry | null>(null)
  const [approvalNote, setApprovalNote] = useState("")

  useEffect(() => {
    const loadEntries = async () => {
      const data = await getEntries()
      setEntries(data)
      setIsLoaded(true)
    }
    loadEntries()
  }, [refreshTrigger])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const handleDelete = async (id: string) => {
    if (
      confirm("Are you sure you want to delete this entry? This will also remove any associated back safe transfer.")
    ) {
      await deleteEntry(id)
      const updated = await getEntries()
      setEntries(updated)
    }
  }

  const handleApproveClick = (entry: DailyEntry) => {
    setEntryToApprove(entry)
    setApprovalNote("")
    setApprovalDialogOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (entryToApprove && approvalNote.trim()) {
      await approveEntry(entryToApprove.id, approvalNote.trim())
      const updated = await getEntries()
      setEntries(updated)
      setApprovalDialogOpen(false)
      setEntryToApprove(null)
      setApprovalNote("")
    }
  }

  const handleRemoveApproval = async (id: string) => {
    if (confirm("Are you sure you want to remove the approval? The entry will show as 'Off' again.")) {
      await removeApproval(id)
      const updated = await getEntries()
      setEntries(updated)
    }
  }

  const displayedEntries = showAll ? entries : entries.slice(0, 7)

  const isEntryOk = (entry: DailyEntry) => entry.isBalanced || entry.manuallyApproved

  if (!isLoaded) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Reconciliation History</CardTitle>
              <CardDescription>
                {entries.length} {entries.length === 1 ? "entry" : "entries"} recorded
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">Cash In</TableHead>
                      <TableHead className="text-right font-semibold">Deposited</TableHead>
                      <TableHead className="text-right font-semibold">To Back</TableHead>
                      <TableHead className="text-right font-semibold">Left in Front</TableHead>
                      <TableHead className="text-right font-semibold">Difference</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedEntries.map((entry) => (
                      <TableRow key={entry.id} className="group">
                        <TableCell className="font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-2">
                                {formatDate(entry.date)}
                                {entry.notes && <FileText className="h-3 w-3 text-muted-foreground" />}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{entry.notes || "No notes"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          +{formatCurrency(entry.cashIn)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          −{formatCurrency(entry.deposited)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-chart-3">
                          −{formatCurrency(entry.toBackSafe)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(entry.leftInFront)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${isEntryOk(entry) ? "text-success" : "text-destructive"}`}
                        >
                          {entry.difference >= 0 ? "+" : ""}
                          {formatCurrency(entry.difference)}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.isBalanced ? (
                            <Badge
                              variant="outline"
                              className="border-success/50 bg-success/10 text-success font-medium"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : entry.manuallyApproved ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium cursor-help"
                                  >
                                    <CheckSquare className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-semibold mb-1">Approval Note:</p>
                                  <p>{entry.approvalNote}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="destructive" className="font-medium">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Off
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!entry.isBalanced && !entry.manuallyApproved && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleApproveClick(entry)}
                                      className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-600"
                                    >
                                      <CheckSquare className="h-4 w-4" />
                                      <span className="sr-only">Approve entry</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Manually approve</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {entry.manuallyApproved && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveApproval(entry.id)}
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      <span className="sr-only">Remove approval</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remove approval</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit?.(entry)}
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit entry</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit entry</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(entry.id)}
                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete entry</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete entry</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {entries.length > 7 && (
                <div className="mt-4 text-center">
                  <Button variant="ghost" onClick={() => setShowAll(!showAll)} className="gap-2">
                    {showAll ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show All ({entries.length} entries)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No entries yet</h3>
              <p className="text-sm text-muted-foreground">Add your first daily entry above to start tracking.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-amber-500" />
              Manual Approval
            </DialogTitle>
            <DialogDescription>
              This entry has a discrepancy of{" "}
              <span className="font-semibold text-destructive">
                {entryToApprove && formatCurrency(entryToApprove.difference)}
              </span>
              . Add a note explaining why this is being approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-note">Approval Note (required)</Label>
              <Textarea
                id="approval-note"
                placeholder="e.g., Verified with manager - small rounding difference acceptable"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveSubmit}
              disabled={!approvalNote.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Approve Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
