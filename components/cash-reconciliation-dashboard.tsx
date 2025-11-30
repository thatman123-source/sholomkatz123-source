"use client"

import { useState, useEffect, useCallback } from "react"
import { SafeBalanceCards } from "@/components/safe-balance-cards"
import { DailyEntryForm } from "@/components/daily-entry-form"
import { BackSafeWithdrawalSection } from "@/components/back-safe-withdrawal"
import { ReconciliationHistory } from "@/components/reconciliation-history"
import { MonthlyArchives } from "@/components/monthly-archives"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Banknote, Moon, Sun, LogOut, User, LayoutDashboard, Archive, RefreshCw } from "lucide-react"
import { getBalances } from "@/lib/cash-store"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { SafeBalances, DailyEntry } from "@/lib/types"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface CashReconciliationDashboardProps {
  user: SupabaseUser
}

export function CashReconciliationDashboard({ user }: CashReconciliationDashboardProps) {
  const [balances, setBalances] = useState<SafeBalances>({
    frontSafe: 0,
    backSafe: 0,
    lastUpdated: new Date().toISOString(),
  })
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isDark, setIsDark] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    const newBalances = await getBalances()
    setBalances(newBalances)
    setRefreshTrigger((prev) => prev + 1)
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    const loadBalances = async () => {
      const newBalances = await getBalances()
      setBalances(newBalances)
      setIsLoaded(true)
    }
    loadBalances()

    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const handleRefresh = async () => {
    await refreshData()
    setEditingEntry(null)
  }

  const handleEditEntry = (entry: DailyEntry) => {
    setEditingEntry(entry)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCancelEdit = () => {
    setEditingEntry(null)
  }

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20">
              <Banknote className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Cash Reconciliation</h1>
              <p className="text-sm text-muted-foreground">Daily Safe Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              disabled={isRefreshing}
              className="rounded-full h-10 w-10 transition-all hover:shadow-md bg-transparent"
            >
              <RefreshCw className={`h-[1.2rem] w-[1.2rem] ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh data</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full h-10 w-10 transition-all hover:shadow-md bg-transparent"
            >
              {isDark ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
              <span className="sr-only">Toggle theme</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full px-4 bg-transparent">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[150px] truncate">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Logged in</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="archives" className="gap-2">
              <Archive className="h-4 w-4" />
              Monthly Archives
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8 mt-0">
            <SafeBalanceCards
              frontSafe={balances.frontSafe}
              backSafe={balances.backSafe}
              lastUpdated={balances.lastUpdated}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <DailyEntryForm
                  balances={balances}
                  onEntrySaved={handleRefresh}
                  editingEntry={editingEntry}
                  onCancelEdit={handleCancelEdit}
                />
              </div>
              <div>
                <BackSafeWithdrawalSection
                  balances={balances}
                  onWithdrawal={handleRefresh}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>

            <ReconciliationHistory refreshTrigger={refreshTrigger} onEdit={handleEditEntry} />
          </TabsContent>

          <TabsContent value="archives" className="mt-0">
            <MonthlyArchives refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
