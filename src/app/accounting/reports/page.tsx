"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Download, FileText, Printer } from "lucide-react"

export default function ReportsPage() {
  const { data: analytics } = useQuery({ queryKey: ["analytics"], queryFn: () => api.get<any>("/analytics") })
  const kpis = analytics?.kpis || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and export financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button><Download className="h-4 w-4 mr-1" /> Export PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-[#4F8EF7] mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Profit & Loss Statement</h3>
            <p className="text-sm text-gray-400 mt-1">Monthly P&L with revenue, expenses, and net profit</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Net Profit: <span className="font-semibold text-[#36B37E]">{formatCurrency(kpis.netProfit || 0)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-[#36B37E] mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Cash Flow Statement</h3>
            <p className="text-sm text-gray-400 mt-1">Track money in, money out, and net cash flow</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Revenue: <span className="font-semibold text-[#36B37E]">{formatCurrency(kpis.totalRevenue || 0)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-[#FFB648] mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Work Order Profitability</h3>
            <p className="text-sm text-gray-400 mt-1">Profit analysis per work order</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Total Orders: <span className="font-semibold">{kpis.totalWorkOrders || 0}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-[#F45D5D] mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Expense Report</h3>
            <p className="text-sm text-gray-400 mt-1">Detailed expense breakdown by category</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Total Expenses: <span className="font-semibold text-[#F45D5D]">{formatCurrency(kpis.totalCosts || 0)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-[#8B5CF6] mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Inventory Valuation</h3>
            <p className="text-sm text-gray-400 mt-1">Current inventory stock value report</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-[#EC4899] mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Accounts Receivable</h3>
            <p className="text-sm text-gray-400 mt-1">Outstanding payments and receivables aging</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
